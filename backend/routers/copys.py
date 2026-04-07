"""
Endpoints de geração e gerenciamento de copys.
"""
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from llm.registry import list_providers
from agents.copy_pipeline import copy_pipeline

router = APIRouter()


class GerarCopyRequest(BaseModel):
    produto_id: int
    persona_id: int
    objetivo: str  # conversao, awareness, remarketing, lancamento
    tom: str  # urgencia, autoridade, empatia, humor, profissional
    provider: str
    model: str
    num_variantes: int = 3
    score_threshold: float = 7.0


@router.get("/providers")
async def listar_providers_disponiveis(user=Depends(verify_auth)):
    """Retorna lista de providers e modelos LLM disponíveis."""
    return list_providers()


@router.post("/gerar")
async def gerar_copy(
    data: GerarCopyRequest,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """
    Gera copys via pipeline LangGraph.
    Retorna SSE stream com progresso em tempo real.
    """
    # Buscar dados do produto e persona
    produto = db.execute("SELECT * FROM produtos WHERE id = ?", (data.produto_id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    persona = db.execute("SELECT * FROM personas WHERE id = ?", (data.persona_id,)).fetchone()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona não encontrada")

    produto = dict(produto)
    persona = dict(persona)
    
    # Parse JSON fields from persona
    for field in ["interesses", "dores", "objetivos"]:
        if persona.get(field):
            try:
                val = json.loads(persona[field])
                if isinstance(val, list):
                    persona[field] = ", ".join(val)
            except:
                pass

    async def event_stream():
        """Generator SSE que executa o pipeline e emite eventos."""
        try:
            yield _sse_event("status", {"msg": "Iniciando geração de copys...", "step": "init"})

            initial_state = {
                "produto_nome": produto["nome"],
                "produto_descricao": produto.get("descricao", ""),
                "persona_nome": persona["nome"],
                "persona_descricao": persona.get("descricao", ""),
                "persona_dores": persona.get("dores", ""),
                "persona_objetivos": persona.get("objetivos", ""),
                "objetivo_campanha": data.objetivo,
                "tom": data.tom,
                "num_variantes": data.num_variantes,
                "provider": data.provider,
                "model": data.model,
                "variantes": [],
                "revisao": [],
                "tentativa": 0,
                "score_threshold": data.score_threshold,
                "max_tentativas": 3,
                "resultado_final": [],
                "status": "gerando",
            }

            yield _sse_event("status", {"msg": f"Usando {data.provider}/{data.model}...", "step": "llm"})

            # Executar pipeline
            result = await copy_pipeline.ainvoke(initial_state)

            yield _sse_event("status", {
                "msg": f"Copys geradas (tentativa {result.get('tentativa', 1)})...",
                "step": "gerado",
                "tentativa": result.get("tentativa", 1),
            })

            # Salvar no banco
            cursor = db.execute(
                """INSERT INTO copys 
                   (produto_id, persona_id, objetivo, tom, provider_llm, model_llm, status)
                   VALUES (?, ?, ?, ?, ?, ?, 'rascunho')""",
                (data.produto_id, data.persona_id, data.objetivo, data.tom, data.provider, data.model),
            )
            copy_id = cursor.lastrowid

            variantes = result.get("variantes", [])
            revisao = result.get("revisao", [])

            for i, var in enumerate(variantes):
                rev = revisao[i] if i < len(revisao) else {}
                feedback_json = json.dumps(rev, ensure_ascii=False) if rev else None
                db.execute(
                    """INSERT INTO copy_variants 
                       (copy_id, variante_num, headline, body_text, cta, score_revisor, feedback_revisor)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        copy_id,
                        i + 1,
                        var.get("headline", ""),
                        var.get("body_text", ""),
                        var.get("cta", ""),
                        rev.get("score_geral"),
                        feedback_json,
                    ),
                )
            db.commit()

            yield _sse_event("complete", {
                "copy_id": copy_id,
                "variantes": variantes,
                "revisao": revisao,
                "tentativas": result.get("tentativa", 1),
            })

        except Exception as e:
            import traceback
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            yield _sse_event("error", {"msg": str(e), "detail": error_msg})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/")
async def listar_copys(
    status: Optional[str] = None,
    favorito: Optional[bool] = None,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """Lista copys com filtros opcionais."""
    query = """SELECT c.*, p.nome as produto_nome, pe.nome as persona_nome 
               FROM copys c 
               LEFT JOIN produtos p ON c.produto_id = p.id 
               LEFT JOIN personas pe ON c.persona_id = pe.id 
               WHERE 1=1"""
    params = []
    if status:
        query += " AND c.status = ?"
        params.append(status)
    if favorito is not None:
        query += " AND c.favorito = ?"
        params.append(int(favorito))
    query += " ORDER BY c.created_at DESC"
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/{copy_id}")
async def detalhe_copy(copy_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna copy com todas as variantes."""
    copy = db.execute("SELECT * FROM copys WHERE id = ?", (copy_id,)).fetchone()
    if not copy:
        raise HTTPException(status_code=404, detail="Copy não encontrada")
    variantes = db.execute(
        "SELECT * FROM copy_variants WHERE copy_id = ? ORDER BY variante_num", (copy_id,)
    ).fetchall()
    result = dict(copy)
    result["variantes"] = [dict(v) for v in variantes]
    return result


@router.put("/{copy_id}/favorito")
async def toggle_favorito(copy_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("UPDATE copys SET favorito = NOT favorito WHERE id = ?", (copy_id,))
    db.commit()
    return {"ok": True}


@router.put("/{copy_id}/status")
async def alterar_status(copy_id: int, status: str, db=Depends(get_db), user=Depends(verify_auth)):
    if status not in ("rascunho", "aprovado", "usado", "arquivado"):
        raise HTTPException(status_code=400, detail="Status inválido")
    db.execute("UPDATE copys SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, copy_id))
    db.commit()
    return {"ok": True}


@router.delete("/{copy_id}")
async def deletar_copy(copy_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("DELETE FROM copy_variants WHERE copy_id = ?", (copy_id,))
    db.execute("DELETE FROM copys WHERE id = ?", (copy_id,))
    db.commit()
    return {"ok": True}


def _sse_event(event_type: str, data: dict) -> str:
    """Formata um evento SSE."""
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
