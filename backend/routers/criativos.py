"""
Endpoints de geração e gerenciamento de criativos (imagens).
"""
import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from agents.criativo_pipeline import (
    gerar_criativo, list_image_models, list_ad_formats, MEDIA_BASE
)

router = APIRouter()


class GerarCriativoRequest(BaseModel):
    produto_id: int
    persona_id: int
    objetivo: str
    tom: str
    formato: str
    modelo: str = "nano-banana-2"
    estilo: str = "moderno e profissional"
    headline: str = ""
    instrucoes_adicionais: str = ""


@router.get("/models")
async def listar_modelos_imagem(user=Depends(verify_auth)):
    return list_image_models()


@router.get("/formats")
async def listar_formatos(user=Depends(verify_auth)):
    return list_ad_formats()


@router.post("/gerar")
async def gerar_criativo_endpoint(
    data: GerarCriativoRequest,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """
    Gera criativo via API de imagens. Retorna SSE stream.
    """
    produto = db.execute("SELECT * FROM produtos WHERE id = ?", (data.produto_id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    persona = db.execute("SELECT * FROM personas WHERE id = ?", (data.persona_id,)).fetchone()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona não encontrada")
    
    produto = dict(produto)
    persona = dict(persona)

    async def event_stream():
        try:
            yield _sse("status", {"msg": "Iniciando geração de criativo...", "step": "init"})
            yield _sse("status", {
                "msg": f"Modelo: {data.modelo} | Formato: {data.formato}",
                "step": "generating",
            })

            result = await gerar_criativo(
                produto=produto,
                persona=persona,
                objetivo=data.objetivo,
                tom=data.tom,
                formato=data.formato,
                modelo=data.modelo,
                estilo=data.estilo,
                headline=data.headline,
                instrucoes_adicionais=data.instrucoes_adicionais,
            )

            yield _sse("status", {"msg": "Imagem gerada! Salvando no banco...", "step": "saving"})

            cursor = db.execute(
                """INSERT INTO criativos 
                   (produto_id, persona_id, tipo, formato, prompt_usado, modelo_ia,
                    provider, imagem_path, thumbnail_path, tamanho_bytes, status)
                   VALUES (?, ?, ?, ?, ?, ?, 'google', ?, ?, ?, 'rascunho') RETURNING id""",
                (
                    data.produto_id, data.persona_id,
                    data.formato, data.formato,
                    result["prompt_usado"], result["modelo_usado"],
                    result["imagem_path"], result["thumbnail_path"],
                    result["tamanho_bytes"],
                ),
            )
            db.commit()
            criativo_id = cursor.lastrowid

            yield _sse("complete", {
                "criativo_id": criativo_id,
                "image_url": f"/api/criativos/{criativo_id}/image",
                "thumbnail_url": f"/api/criativos/{criativo_id}/thumb",
                "formato": result["formato"],
                "modelo_usado": result["modelo_usado"],
                "tamanho_bytes": result["tamanho_bytes"],
            })

        except Exception as e:
            import traceback
            yield _sse("error", {"msg": str(e), "detail": traceback.format_exc()})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/")
async def listar_criativos(
    status: Optional[str] = None,
    formato: Optional[str] = None,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """Lista criativos com thumbnail URLs para grid."""
    query = """SELECT c.id, c.produto_id, c.persona_id, c.tipo, c.formato, c.modelo_ia,
               c.provider, c.status, c.favorito, c.tamanho_bytes, c.created_at,
               p.nome as produto_nome, pe.nome as persona_nome
               FROM criativos c
               LEFT JOIN produtos p ON c.produto_id = p.id
               LEFT JOIN personas pe ON c.persona_id = pe.id
               WHERE 1=1"""
    params = []
    if status:
        query += " AND c.status = ?"
        params.append(status)
    if formato:
        query += " AND c.formato = ?"
        params.append(formato)
    query += " ORDER BY c.created_at DESC"
    rows = db.execute(query, params).fetchall()
    
    result = []
    for r in rows:
        item = dict(r)
        item["thumbnail_url"] = f"/api/criativos/{item['id']}/thumb"
        item["image_url"] = f"/api/criativos/{item['id']}/image"
        result.append(item)
    return result


@router.get("/{criativo_id}")
async def detalhe_criativo(criativo_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    row = db.execute(
        """SELECT c.*, p.nome as produto_nome, pe.nome as persona_nome 
           FROM criativos c
           LEFT JOIN produtos p ON c.produto_id = p.id
           LEFT JOIN personas pe ON c.persona_id = pe.id
           WHERE c.id = ?""", (criativo_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Criativo não encontrado")
    item = dict(row)
    item["image_url"] = f"/api/criativos/{criativo_id}/image"
    item["thumbnail_url"] = f"/api/criativos/{criativo_id}/thumb"
    return item


@router.get("/{criativo_id}/image")
async def servir_imagem(criativo_id: int, db=Depends(get_db)):
    """Serve a imagem original do disco como PNG."""
    row = db.execute("SELECT imagem_path FROM criativos WHERE id = ?", (criativo_id,)).fetchone()
    if not row or not row["imagem_path"]:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    
    full_path = MEDIA_BASE / row["imagem_path"]
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado em disco")
    
    return FileResponse(
        str(full_path),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/{criativo_id}/thumb")
async def servir_thumbnail(criativo_id: int, db=Depends(get_db)):
    """Serve o thumbnail do disco."""
    row = db.execute("SELECT thumbnail_path FROM criativos WHERE id = ?", (criativo_id,)).fetchone()
    if not row or not row["thumbnail_path"]:
        return await servir_imagem(criativo_id, db)
    
    full_path = MEDIA_BASE / row["thumbnail_path"]
    if not full_path.exists():
        return await servir_imagem(criativo_id, db)
    
    return FileResponse(
        str(full_path),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=604800"},
    )


@router.put("/{criativo_id}/status")
async def alterar_status_criativo(criativo_id: int, status: str, db=Depends(get_db), user=Depends(verify_auth)):
    if status not in ("rascunho", "aprovado", "usado", "arquivado"):
        raise HTTPException(status_code=400, detail="Status inválido")
    db.execute("UPDATE criativos SET status = ? WHERE id = ?", (status, criativo_id))
    db.commit()
    return {"ok": True}


@router.put("/{criativo_id}/favorito")
async def toggle_favorito_criativo(criativo_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("UPDATE criativos SET favorito = NOT favorito WHERE id = ?", (criativo_id,))
    db.commit()
    return {"ok": True}


@router.delete("/{criativo_id}")
async def deletar_criativo(criativo_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Deleta criativo do banco E remove arquivos do disco."""
    row = db.execute("SELECT imagem_path, thumbnail_path FROM criativos WHERE id = ?", (criativo_id,)).fetchone()
    if row:
        for path_field in ["imagem_path", "thumbnail_path"]:
            if row[path_field]:
                full_path = MEDIA_BASE / row[path_field]
                if full_path.exists():
                    full_path.unlink()
    
    db.execute("DELETE FROM criativos WHERE id = ?", (criativo_id,))
    db.commit()
    return {"ok": True}


def _sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
