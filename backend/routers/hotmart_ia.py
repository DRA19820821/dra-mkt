"""
Endpoints de geração IA para produtos Hotmart com SSE streaming.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from llm.registry import list_providers
from agents.hotmart_pipeline import hotmart_pipeline

router = APIRouter()


class GerarProdutoHotmartRequest(BaseModel):
    produto_dra_id: Optional[int] = None
    tema: str
    publico_alvo: str
    nivel: str = "intermediario"
    carga_horaria_total: int = 20
    num_modulos: int = 6
    estilo_copy: str = "vendas"
    provider: str
    model: str
    score_threshold: float = 7.0
    max_tentativas: int = 3
    salvar_automatico: bool = True


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.get("/ia/providers")
async def listar_providers_ia(user=Depends(verify_auth)):
    """Retorna lista de providers e modelos LLM disponíveis."""
    return list_providers()


@router.post("/ia/gerar")
async def gerar_produto_ia(
    data: GerarProdutoHotmartRequest,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """
    Gera estrutura de curso + copy de vendas via pipeline LangGraph.
    Retorna SSE stream com progresso em tempo real.
    """

    async def event_stream():
        try:
            yield _sse_event("status", {"msg": "Iniciando geração de estrutura do curso...", "step": "init"})

            state = {
                "tema": data.tema,
                "publico_alvo": data.publico_alvo,
                "nivel": data.nivel,
                "carga_horaria_total": data.carga_horaria_total,
                "num_modulos": data.num_modulos,
                "estilo_copy": data.estilo_copy,
                "provider": data.provider,
                "model": data.model,
                "estrutura": {},
                "revisao_estrutura": {},
                "copy_vendas": {},
                "revisao_copy": {},
                "tentativa": 0,
                "score_threshold": data.score_threshold,
                "max_tentativas": data.max_tentativas,
                "fase": "estrutura",
                "resultado_final": {},
                "status": "iniciando",
            }

            # Executar pipeline via astream para emitir eventos progressivos
            async for event in hotmart_pipeline.astream(state, stream_mode="updates"):
                node_name = list(event.keys())[0]
                node_data = list(event.values())[0]

                if node_name == "gerar_estrutura":
                    state["estrutura"] = node_data.get("estrutura", {})
                    state["tentativa"] = node_data.get("tentativa", 1)
                    state["fase"] = "estrutura"
                    yield _sse_event("status", {
                        "msg": f"Estrutura gerada (tentativa {state['tentativa']})...",
                        "step": "estrutura",
                    })
                elif node_name == "revisar_estrutura":
                    state["revisao_estrutura"] = node_data.get("revisao_estrutura", {})
                    score = state["revisao_estrutura"].get("score_geral", 0)
                    yield _sse_event("status", {
                        "msg": f"Estrutura revisada — score: {score:.1f}",
                        "step": "revisao_estrutura",
                        "score": score,
                    })
                elif node_name == "gerar_copy":
                    state["copy_vendas"] = node_data.get("copy_vendas", {})
                    state["fase"] = "copy"
                    yield _sse_event("status", {
                        "msg": "Gerando copy de vendas...",
                        "step": "copy",
                    })
                elif node_name == "revisar_copy":
                    state["revisao_copy"] = node_data.get("revisao_copy", {})
                    score = state["revisao_copy"].get("score_geral", 0)
                    yield _sse_event("status", {
                        "msg": f"Copy revisada — score: {score:.1f}",
                        "step": "revisao_copy",
                        "score": score,
                    })

            # Estado final consolidado
            resultado = {
                "estrutura": state.get("estrutura", {}),
                "copy_vendas": state.get("copy_vendas", {}),
                "revisao_estrutura": state.get("revisao_estrutura", {}),
                "revisao_copy": state.get("revisao_copy", {}),
                "provider": data.provider,
                "model": data.model,
            }

            # Salvar no banco se solicitado
            hotmart_produto_id = None
            if data.salvar_automatico:
                copy = resultado.get("copy_vendas", {})
                estrutura = resultado.get("estrutura", {})

                cursor = db.execute(
                    """INSERT INTO hotmart_produtos
                       (produto_dra_id, nome, descricao_curta, descricao_completa, provider_llm, model_llm, score_ia)
                       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id""",
                    (
                        data.produto_dra_id,
                        copy.get("titulo", data.tema),
                        copy.get("descricao_curta", ""),
                        copy.get("descricao_html", ""),
                        data.provider,
                        data.model,
                        resultado.get("revisao_copy", {}).get("score_geral"),
                    ),
                )
                db.commit()
                hotmart_produto_id = cursor.lastrowid

                # Salvar módulos e aulas
                for i, modulo in enumerate(estrutura.get("modulos", [])):
                    cursor_m = db.execute(
                        "INSERT INTO hotmart_modulos (hotmart_produto_id, nome, descricao, ordem) VALUES (?, ?, ?, ?) RETURNING id",
                        (hotmart_produto_id, modulo["nome"], modulo.get("descricao", ""), i),
                    )
                    db.commit()
                    modulo_id = cursor_m.lastrowid
                    for j, aula in enumerate(modulo.get("aulas", [])):
                        db.execute(
                            "INSERT INTO hotmart_aulas (hotmart_modulo_id, nome, descricao, tipo, duracao_minutos, ordem) VALUES (?, ?, ?, ?, ?, ?)",
                            (modulo_id, aula["nome"], aula.get("descricao", ""), aula.get("tipo", "video"), aula.get("duracao_minutos", 15), j),
                        )
                    db.commit()

                # Salvar histórico de geração
                db.execute(
                    "INSERT INTO hotmart_geracoes_ia (hotmart_produto_id, tipo_geracao, provider_llm, model_llm, resultado_json, score) VALUES (?, ?, ?, ?, ?, ?)",
                    (hotmart_produto_id, "completa", data.provider, data.model,
                     json.dumps(resultado, ensure_ascii=False),
                     resultado.get("revisao_copy", {}).get("score_geral")),
                )
                db.commit()

            resultado["hotmart_produto_id"] = hotmart_produto_id
            yield _sse_event("complete", resultado)

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


@router.post("/ia/aplicar/{produto_id}")
async def aplicar_ia_produto(
    produto_id: int,
    data: dict,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """
    Aplica resultado da IA (estrutura + copy) a um produto existente.
    Sobrescreve módulos/aulas do produto.
    """
    produto = db.execute("SELECT id FROM hotmart_produtos WHERE id = ?", (produto_id,)).fetchone()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    copy = data.get("copy_vendas", {})
    estrutura = data.get("estrutura", {})

    db.execute(
        """UPDATE hotmart_produtos SET
            nome = ?, descricao_curta = ?, descricao_completa = ?,
            provider_llm = ?, model_llm = ?, score_ia = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?""",
        (
            copy.get("titulo", ""),
            copy.get("descricao_curta", ""),
            copy.get("descricao_html", ""),
            data.get("provider"),
            data.get("model"),
            data.get("revisao_copy", {}).get("score_geral"),
            produto_id,
        ),
    )
    db.commit()

    # Limpar módulos e aulas antigos
    db.execute("DELETE FROM hotmart_aulas WHERE hotmart_modulo_id IN (SELECT id FROM hotmart_modulos WHERE hotmart_produto_id = ?)", (produto_id,))
    db.execute("DELETE FROM hotmart_modulos WHERE hotmart_produto_id = ?", (produto_id,))
    db.commit()

    # Inserir nova estrutura
    for i, modulo in enumerate(estrutura.get("modulos", [])):
        cursor_m = db.execute(
            "INSERT INTO hotmart_modulos (hotmart_produto_id, nome, descricao, ordem) VALUES (?, ?, ?, ?) RETURNING id",
            (produto_id, modulo["nome"], modulo.get("descricao", ""), i),
        )
        db.commit()
        modulo_id = cursor_m.lastrowid
        for j, aula in enumerate(modulo.get("aulas", [])):
            db.execute(
                "INSERT INTO hotmart_aulas (hotmart_modulo_id, nome, descricao, tipo, duracao_minutos, ordem) VALUES (?, ?, ?, ?, ?, ?)",
                (modulo_id, aula["nome"], aula.get("descricao", ""), aula.get("tipo", "video"), aula.get("duracao_minutos", 15), j),
            )
        db.commit()

    # Histórico
    db.execute(
        "INSERT INTO hotmart_geracoes_ia (hotmart_produto_id, tipo_geracao, provider_llm, model_llm, resultado_json, score) VALUES (?, ?, ?, ?, ?, ?)",
        (produto_id, "aplicada", data.get("provider", ""), data.get("model", ""),
         json.dumps(data, ensure_ascii=False),
         data.get("revisao_copy", {}).get("score_geral")),
    )
    db.commit()

    return {"ok": True, "produto_id": produto_id}


@router.get("/ia/historico/{produto_id}")
async def historico_geracoes(produto_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna histórico de gerações IA de um produto."""
    rows = db.execute(
        "SELECT * FROM hotmart_geracoes_ia WHERE hotmart_produto_id = ? ORDER BY created_at DESC",
        (produto_id,),
    ).fetchall()
    return [dict(r) for r in rows]
