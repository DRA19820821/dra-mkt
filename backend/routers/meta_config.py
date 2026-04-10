"""
Configuração e validação da conexão com Meta Marketing API.

Endpoints:
    GET  /api/meta/config         → Retorna config atual (sem token completo)
    POST /api/meta/config         → Salvar/atualizar configuração
    POST /api/meta/validate       → Testar conexão com a API
    GET  /api/meta/ad-accounts    → Listar ad accounts disponíveis (para seleção)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from meta.client import validate_connection

router = APIRouter()


class MetaConfigSave(BaseModel):
    app_id: str
    ad_account_id: str
    page_id: str
    access_token: str
    api_version: str = "v25.0"


@router.get("/config")
async def get_config(db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna configuração atual (token mascarado)."""
    row = db.execute("SELECT * FROM meta_config ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        return {"configured": False}
    result = dict(row)
    # Mascarar token por segurança
    token = result.get("access_token", "")
    result["access_token"] = f"{token[:10]}...{token[-5:]}" if len(token) > 15 else "***"
    result["configured"] = True
    return result


@router.post("/config")
async def save_config(data: MetaConfigSave, db=Depends(get_db), user=Depends(verify_auth)):
    """Salvar configuração Meta."""
    # Validar antes de salvar
    check = validate_connection(
        access_token=data.access_token,
        ad_account_id=data.ad_account_id,
    )
    if not check["valid"]:
        raise HTTPException(status_code=400, detail=f"Conexão inválida: {check['error']}")
    
    # Upsert: deletar configs anteriores e inserir nova
    db.execute("DELETE FROM meta_config")
    db.execute(
        """INSERT INTO meta_config (app_id, ad_account_id, page_id, access_token, api_version, is_valid, last_validated)
           VALUES (?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP) RETURNING id""",
        (data.app_id, data.ad_account_id, data.page_id, data.access_token, data.api_version),
    )
    db.commit()
    return {"ok": True, "account_info": check}


@router.post("/validate")
async def validate_meta(db=Depends(get_db), user=Depends(verify_auth)):
    """Testa a conexão com token atual."""
    row = db.execute("SELECT access_token, ad_account_id FROM meta_config ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Meta não configurado")
    result = validate_connection(
        access_token=row["access_token"],
        ad_account_id=row["ad_account_id"],
    )
    # Atualizar status de validação
    db.execute(
        "UPDATE meta_config SET is_valid = ?, last_validated = CURRENT_TIMESTAMP",
        (result["valid"],),
    )
    db.commit()
    return result
