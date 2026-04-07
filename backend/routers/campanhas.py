"""
CRUD de Campanhas.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth

router = APIRouter()


class CampanhaCreate(BaseModel):
    nome: str
    produto_id: int
    persona_id: int
    objetivo: str
    tom: str
    copy_id: Optional[int] = None
    criativo_id: Optional[int] = None
    plataforma: str = "facebook_instagram"
    orcamento_diario: Optional[float] = None
    publico_alvo: Optional[str] = None
    notas: Optional[str] = None


class CampanhaUpdate(BaseModel):
    nome: Optional[str] = None
    produto_id: Optional[int] = None
    persona_id: Optional[int] = None
    objetivo: Optional[str] = None
    tom: Optional[str] = None
    status: Optional[str] = None
    copy_id: Optional[int] = None
    criativo_id: Optional[int] = None
    plataforma: Optional[str] = None
    orcamento_diario: Optional[float] = None
    publico_alvo: Optional[str] = None
    notas: Optional[str] = None


@router.get("/")
async def listar_campanhas(
    status: Optional[str] = None,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """Lista campanhas com dados relacionados."""
    query = """
        SELECT c.*, 
               p.nome as produto_nome, 
               pe.nome as persona_nome,
               cp.headline as copy_headline,
               cr.imagem_path as criativo_imagem
        FROM campanhas c
        LEFT JOIN produtos p ON c.produto_id = p.id
        LEFT JOIN personas pe ON c.persona_id = pe.id
        LEFT JOIN copys cp ON c.copy_id = cp.id
        LEFT JOIN copy_variants crv ON crv.copy_id = cp.id AND crv.variante_num = 1
        LEFT JOIN criativos cr ON c.criativo_id = cr.id
        WHERE 1=1
    """
    params = []
    if status:
        query += " AND c.status = ?"
        params.append(status)
    query += " ORDER BY c.created_at DESC"
    
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/", status_code=201)
async def criar_campanha(data: CampanhaCreate, db=Depends(get_db), user=Depends(verify_auth)):
    cursor = db.execute(
        """INSERT INTO campanhas 
           (nome, produto_id, persona_id, objetivo, tom, copy_id, criativo_id,
            plataforma, orcamento_diario, publico_alvo, notas)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.nome, data.produto_id, data.persona_id, data.objetivo, data.tom,
            data.copy_id, data.criativo_id, data.plataforma, data.orcamento_diario,
            data.publico_alvo, data.notas
        ),
    )
    db.commit()
    return {"id": cursor.lastrowid, **data.model_dump()}


@router.get("/{campanha_id}")
async def detalhe_campanha(campanha_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna campanha completa com copy e criativo."""
    campanha = db.execute(
        """SELECT c.*, p.nome as produto_nome, p.descricao as produto_descricao,
                  pe.nome as persona_nome, pe.descricao as persona_descricao
           FROM campanhas c
           LEFT JOIN produtos p ON c.produto_id = p.id
           LEFT JOIN personas pe ON c.persona_id = pe.id
           WHERE c.id = ?""", (campanha_id,)
    ).fetchone()
    
    if not campanha:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    result = dict(campanha)
    
    # Buscar copy com variantes
    if result.get("copy_id"):
        copy = db.execute(
            """SELECT * FROM copys WHERE id = ?""", (result["copy_id"],)
        ).fetchone()
        if copy:
            result["copy"] = dict(copy)
            variantes = db.execute(
                "SELECT * FROM copy_variants WHERE copy_id = ? ORDER BY variante_num",
                (result["copy_id"],)
            ).fetchall()
            result["copy"]["variantes"] = [dict(v) for v in variantes]
    
    # Buscar criativo
    if result.get("criativo_id"):
        criativo = db.execute(
            """SELECT * FROM criativos WHERE id = ?""", (result["criativo_id"],)
        ).fetchone()
        if criativo:
            result["criativo"] = dict(criativo)
            result["criativo"]["image_url"] = f"/api/criativos/{result['criativo_id']}/image"
            result["criativo"]["thumbnail_url"] = f"/api/criativos/{result['criativo_id']}/thumb"
    
    return result


@router.put("/{campanha_id}")
async def atualizar_campanha(campanha_id: int, data: CampanhaUpdate, db=Depends(get_db), user=Depends(verify_auth)):
    campos = {k: v for k, v in data.model_dump().items() if v is not None}
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    sets = ", ".join(f"{k} = ?" for k in campos)
    values = list(campos.values()) + [campanha_id]
    db.execute(f"UPDATE campanhas SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
    db.commit()
    return {"ok": True}


@router.delete("/{campanha_id}")
async def deletar_campanha(campanha_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("DELETE FROM campanhas WHERE id = ?", (campanha_id,))
    db.commit()
    return {"ok": True}


@router.put("/{campanha_id}/status")
async def alterar_status_campanha(campanha_id: int, status: str, db=Depends(get_db), user=Depends(verify_auth)):
    if status not in ("rascunho", "pronto", "ativa", "pausada", "concluida"):
        raise HTTPException(status_code=400, detail="Status inválido")
    db.execute("UPDATE campanhas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, campanha_id))
    db.commit()
    return {"ok": True}
