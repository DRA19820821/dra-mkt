"""
Ações com aprovação sobre campanhas publicadas no Meta.

Fluxo:
1. Usuário solicita ação (ativar, pausar, alterar orçamento)
2. Ação fica como 'pendente' na tabela meta_acoes_pendentes
3. Usuário confirma/aprova na UI
4. Sistema executa via Meta API

Endpoints:
    POST /api/meta/actions/request    → Solicitar ação (cria pendente)
    GET  /api/meta/actions/pending    → Listar ações pendentes
    POST /api/meta/actions/{id}/approve → Aprovar e executar ação
    POST /api/meta/actions/{id}/reject  → Rejeitar ação
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from meta.actions import execute_action

router = APIRouter()


class ActionRequest(BaseModel):
    publicacao_id: int
    tipo_acao: str  # activate, pause, update_budget, archive
    params_json: Optional[str] = None  # JSON com params extras (ex: {"orcamento_diario": 50})


@router.post("/request")
async def request_action(data: ActionRequest, db=Depends(get_db), user=Depends(verify_auth)):
    """Solicita uma ação (ficará pendente até aprovação)."""
    if data.tipo_acao not in ("activate", "pause", "update_budget", "archive"):
        raise HTTPException(status_code=400, detail="Ação inválida")
    
    # Verificar se publicação existe
    pub = db.execute("SELECT id FROM meta_publicacoes WHERE id = ?", (data.publicacao_id,)).fetchone()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    
    cursor = db.execute(
        """INSERT INTO meta_acoes_pendentes (publicacao_id, tipo_acao, params_json, status)
           VALUES (?, ?, ?, 'pendente') RETURNING id""",
        (data.publicacao_id, data.tipo_acao, data.params_json),
    )
    db.commit()
    
    return {"ok": True, "acao_id": cursor.lastrowid, "status": "pendente"}


@router.get("/pending")
async def list_pending_actions(db=Depends(get_db), user=Depends(verify_auth)):
    """Lista ações pendentes de aprovação."""
    rows = db.execute(
        """SELECT a.*, mp.meta_campaign_id, mp.campanha_id, c.nome as campanha_nome
           FROM meta_acoes_pendentes a
           LEFT JOIN meta_publicacoes mp ON a.publicacao_id = mp.id
           LEFT JOIN campanhas c ON mp.campanha_id = c.id
           WHERE a.status = 'pendente'
           ORDER BY a.created_at DESC"""
    ).fetchall()
    return [dict(r) for r in rows]


@router.post("/{acao_id}/approve")
async def approve_action(acao_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Aprova e executa a ação no Meta."""
    acao = db.execute("SELECT * FROM meta_acoes_pendentes WHERE id = ? AND status = 'pendente'", (acao_id,)).fetchone()
    if not acao:
        raise HTTPException(status_code=404, detail="Ação não encontrada ou já processada")
    acao = dict(acao)
    
    # Buscar dados da publicação
    pub = db.execute("SELECT * FROM meta_publicacoes WHERE id = ?", (acao["publicacao_id"],)).fetchone()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    pub = dict(pub)
    
    params = json.loads(acao["params_json"]) if acao.get("params_json") else {}
    
    try:
        result = await execute_action(
            action_type=acao["tipo_acao"],
            meta_campaign_id=pub["meta_campaign_id"],
            meta_adset_id=pub.get("meta_adset_id"),
            meta_ad_id=pub.get("meta_ad_id"),
            params=params,
        )
        
        # Atualizar status da ação
        db.execute(
            "UPDATE meta_acoes_pendentes SET status = 'executado', aprovado_em = CURRENT_TIMESTAMP, executado_em = CURRENT_TIMESTAMP WHERE id = ?",
            (acao_id,),
        )
        
        # Atualizar status da publicação
        if result.get("status"):
            db.execute(
                "UPDATE meta_publicacoes SET status_meta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (result["status"], acao["publicacao_id"]),
            )
        
        db.commit()
        return {"ok": True, **result}
    
    except Exception as e:
        db.execute(
            "UPDATE meta_acoes_pendentes SET status = 'erro', error_log = ? WHERE id = ?",
            (str(e), acao_id),
        )
        db.commit()
        raise HTTPException(status_code=500, detail=f"Erro ao executar ação: {str(e)}")


@router.post("/{acao_id}/reject")
async def reject_action(acao_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Rejeita uma ação pendente."""
    db.execute(
        "UPDATE meta_acoes_pendentes SET status = 'rejeitado' WHERE id = ? AND status = 'pendente'",
        (acao_id,),
    )
    db.commit()
    return {"ok": True}
