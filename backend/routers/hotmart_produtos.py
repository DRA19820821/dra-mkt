"""
CRUD local de produtos Hotmart + sincronização com a API Hotmart.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from hotmart.client import get_hotmart_client

router = APIRouter()


class HotmartProdutoCreate(BaseModel):
    produto_dra_id: Optional[int] = None
    nome: str
    descricao_curta: Optional[str] = None
    descricao_completa: Optional[str] = None
    categoria: str = "ONLINE_COURSE"
    formato: str = "online_course"
    idioma: str = "pt_BR"


class HotmartProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao_curta: Optional[str] = None
    descricao_completa: Optional[str] = None
    categoria: Optional[str] = None
    formato: Optional[str] = None
    idioma: Optional[str] = None
    status_hotmart: Optional[str] = None
    status_sync: Optional[str] = None


class HotmartModuloCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    ordem: int = 0
    aulas: Optional[list[dict]] = []


class HotmartPlanoCreate(BaseModel):
    nome: str
    tipo: str = "unico"
    preco: float
    moeda: str = "BRL"
    max_parcelas: int = 1
    periodicidade: Optional[str] = None


@router.get("/produtos")
async def listar_produtos(db=Depends(get_db), user=Depends(verify_auth)):
    """Lista produtos Hotmart com agregação de módulos e planos."""
    rows = db.execute("""
        SELECT
            hp.*,
            COUNT(DISTINCT hm.id) as total_modulos,
            COUNT(DISTINCT hpl.id) as total_planos,
            MIN(hpl.preco) as preco_minimo
        FROM hotmart_produtos hp
        LEFT JOIN hotmart_modulos hm ON hm.hotmart_produto_id = hp.id
        LEFT JOIN hotmart_planos hpl ON hpl.hotmart_produto_id = hp.id AND hpl.ativo = TRUE
        GROUP BY hp.id
        ORDER BY hp.created_at DESC
    """).fetchall()
    return [dict(r) for r in rows]


@router.get("/produtos/{id}")
async def detalhe_produto(id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna produto completo com módulos, aulas e planos."""
    produto = db.execute("SELECT * FROM hotmart_produtos WHERE id = ?", (id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    produto = dict(produto)

    modulos = [dict(r) for r in db.execute(
        "SELECT * FROM hotmart_modulos WHERE hotmart_produto_id = ? ORDER BY ordem", (id,)
    ).fetchall()]
    for m in modulos:
        m["aulas"] = [dict(r) for r in db.execute(
            "SELECT * FROM hotmart_aulas WHERE hotmart_modulo_id = ? ORDER BY ordem", (m["id"],)
        ).fetchall()]

    planos = [dict(r) for r in db.execute(
        "SELECT * FROM hotmart_planos WHERE hotmart_produto_id = ? AND ativo = TRUE", (id,)
    ).fetchall()]

    produto["modulos"] = modulos
    produto["planos"] = planos
    return produto


@router.post("/produtos")
async def criar_produto(data: HotmartProdutoCreate, db=Depends(get_db), user=Depends(verify_auth)):
    cursor = db.execute(
        """INSERT INTO hotmart_produtos
           (produto_dra_id, nome, descricao_curta, descricao_completa, categoria, formato, idioma)
           VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id""",
        (data.produto_dra_id, data.nome, data.descricao_curta, data.descricao_completa,
         data.categoria, data.formato, data.idioma),
    )
    db.commit()
    return {"id": cursor.lastrowid, **data.model_dump()}


@router.put("/produtos/{id}")
async def atualizar_produto(id: int, data: HotmartProdutoUpdate, db=Depends(get_db), user=Depends(verify_auth)):
    campos = {k: v for k, v in data.model_dump().items() if v is not None}
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    sets = ", ".join(f"{k} = ?" for k in campos)
    values = list(campos.values()) + [id]
    db.execute(f"UPDATE hotmart_produtos SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
    db.commit()
    return {"ok": True}


@router.delete("/produtos/{id}")
async def deletar_produto(id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("DELETE FROM hotmart_aulas WHERE hotmart_modulo_id IN (SELECT id FROM hotmart_modulos WHERE hotmart_produto_id = ?)", (id,))
    db.execute("DELETE FROM hotmart_modulos WHERE hotmart_produto_id = ?", (id,))
    db.execute("DELETE FROM hotmart_planos WHERE hotmart_produto_id = ?", (id,))
    db.execute("DELETE FROM hotmart_geracoes_ia WHERE hotmart_produto_id = ?", (id,))
    db.execute("DELETE FROM hotmart_produtos WHERE id = ?", (id,))
    db.commit()
    return {"ok": True}


@router.post("/produtos/{id}/modulos")
async def adicionar_modulo(id: int, data: HotmartModuloCreate, db=Depends(get_db), user=Depends(verify_auth)):
    produto = db.execute("SELECT id FROM hotmart_produtos WHERE id = ?", (id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    cursor = db.execute(
        "INSERT INTO hotmart_modulos (hotmart_produto_id, nome, descricao, ordem) VALUES (?, ?, ?, ?) RETURNING id",
        (id, data.nome, data.descricao, data.ordem),
    )
    db.commit()
    modulo_id = cursor.lastrowid

    for j, aula in enumerate(data.aulas or []):
        db.execute(
            "INSERT INTO hotmart_aulas (hotmart_modulo_id, nome, descricao, tipo, duracao_minutos, ordem) VALUES (?, ?, ?, ?, ?, ?)",
            (modulo_id, aula["nome"], aula.get("descricao", ""), aula.get("tipo", "video"), aula.get("duracao_minutos", 15), j),
        )
    db.commit()
    return {"ok": True, "modulo_id": modulo_id}


@router.post("/produtos/{id}/planos")
async def adicionar_plano(id: int, data: HotmartPlanoCreate, db=Depends(get_db), user=Depends(verify_auth)):
    produto = db.execute("SELECT id FROM hotmart_produtos WHERE id = ?", (id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    cursor = db.execute(
        """INSERT INTO hotmart_planos
           (hotmart_produto_id, nome, tipo, preco, moeda, max_parcelas, periodicidade)
           VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id""",
        (id, data.nome, data.tipo, data.preco, data.moeda, data.max_parcelas, data.periodicidade),
    )
    db.commit()
    return {"ok": True, "plano_id": cursor.lastrowid}


@router.post("/produtos/{id}/sincronizar")
async def sincronizar_produto(id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Envia produto local para a Hotmart API."""
    produto = db.execute("SELECT * FROM hotmart_produtos WHERE id = ?", (id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    produto = dict(produto)

    client = get_hotmart_client(db)
    if not client:
        raise HTTPException(status_code=400, detail="Hotmart não configurado. Vá em Hotmart Connect.")

    # Payload mínimo para Hotmart
    payload = {
        "name": produto["nome"],
        "description": produto.get("descricao_completa") or produto.get("descricao_curta") or "",
        "format": produto.get("formato", "ONLINE_COURSE").upper(),
        "category": produto.get("categoria", "ONLINE_COURSE").upper(),
        "language": produto.get("idioma", "pt_BR"),
    }

    try:
        if produto.get("hotmart_product_id"):
            resp = client.atualizar_produto(produto["hotmart_product_id"], payload)
            hotmart_product_id = produto["hotmart_product_id"]
        else:
            resp = client.criar_produto(payload)
            hotmart_product_id = resp.get("id")

        db.execute(
            "UPDATE hotmart_produtos SET hotmart_product_id = ?, status_sync = 'sincronizado', error_log = NULL WHERE id = ?",
            (hotmart_product_id, id),
        )
        db.commit()

        # Sincronizar módulos e aulas
        modulos = [dict(r) for r in db.execute(
            "SELECT * FROM hotmart_modulos WHERE hotmart_produto_id = ? ORDER BY ordem", (id,)
        ).fetchall()]
        modulos_sync = 0
        aulas_sync = 0
        for m in modulos:
            if not m.get("hotmart_module_id"):
                mod_resp = client.criar_modulo(hotmart_product_id, {
                    "name": m["nome"],
                    "description": m.get("descricao", ""),
                    "position": m["ordem"],
                })
                hotmart_module_id = mod_resp.get("id")
                db.execute(
                    "UPDATE hotmart_modulos SET hotmart_module_id = ?, status_sync = 'sincronizado' WHERE id = ?",
                    (hotmart_module_id, m["id"]),
                )
                db.commit()
            else:
                hotmart_module_id = m["hotmart_module_id"]
            modulos_sync += 1

            aulas = [dict(r) for r in db.execute(
                "SELECT * FROM hotmart_aulas WHERE hotmart_modulo_id = ? ORDER BY ordem", (m["id"],)
            ).fetchall()]
            for a in aulas:
                if not a.get("hotmart_lesson_id"):
                    tipo_map = {"video": "VIDEO", "pdf": "PDF", "texto": "TEXT", "quiz": "QUIZ"}
                    aula_resp = client.criar_aula(hotmart_product_id, hotmart_module_id, {
                        "name": a["nome"],
                        "description": a.get("descricao", ""),
                        "type": tipo_map.get(a.get("tipo", "video"), "VIDEO"),
                        "position": a["ordem"],
                    })
                    db.execute(
                        "UPDATE hotmart_aulas SET hotmart_lesson_id = ?, status_sync = 'sincronizado' WHERE id = ?",
                        (aula_resp.get("id"), a["id"]),
                    )
                    db.commit()
                    aulas_sync += 1

        # Sincronizar planos
        planos = [dict(r) for r in db.execute(
            "SELECT * FROM hotmart_planos WHERE hotmart_produto_id = ? AND ativo = TRUE", (id,)
        ).fetchall()]
        planos_sync = 0
        for p in planos:
            if not p.get("hotmart_plan_id"):
                tipo_map = {"unico": "NONE", "recorrente": "MONTHLY", "parcelado": "MONTHLY"}
                plano_resp = client.criar_plano(hotmart_product_id, {
                    "name": p["nome"],
                    "price": p["preco"],
                    "currency": p.get("moeda", "BRL"),
                    "recurrence_type": tipo_map.get(p["tipo"], "NONE"),
                    "max_charge_cycles": p.get("max_parcelas", 1),
                })
                db.execute(
                    "UPDATE hotmart_planos SET hotmart_plan_id = ?, status_sync = 'sincronizado' WHERE id = ?",
                    (plano_resp.get("id"), p["id"]),
                )
                db.commit()
            planos_sync += 1

        return {
            "ok": True,
            "hotmart_product_id": hotmart_product_id,
            "modulos_sync": modulos_sync,
            "aulas_sync": aulas_sync,
            "planos_sync": planos_sync,
        }

    except Exception as e:
        db.execute(
            "UPDATE hotmart_produtos SET status_sync = 'erro', error_log = ? WHERE id = ?",
            (str(e), id),
        )
        db.commit()
        raise HTTPException(status_code=400, detail=f"Erro ao sincronizar: {str(e)}")


@router.get("/produtos/importar")
async def importar_produtos(db=Depends(get_db), user=Depends(verify_auth)):
    """Importa produtos existentes da Hotmart API."""
    client = get_hotmart_client(db)
    if not client:
        raise HTTPException(status_code=400, detail="Hotmart não configurado")

    try:
        data = client.listar_produtos()
        items = data.get("items", [])
        importados = 0
        for item in items:
            exists = db.execute("SELECT id FROM hotmart_produtos WHERE hotmart_product_id = ?", (str(item.get("id")),)).fetchone()
            if not exists:
                db.execute(
                    """INSERT INTO hotmart_produtos
                       (hotmart_product_id, nome, descricao_curta, status_hotmart, status_sync)
                       VALUES (?, ?, ?, ?, 'sincronizado')""",
                    (str(item.get("id")), item.get("name", ""), item.get("description", "")[:160],
                     item.get("status", "draft")),
                )
                importados += 1
        db.commit()
        return {"ok": True, "importados": importados, "total_api": len(items)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao importar: {str(e)}")
