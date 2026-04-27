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
from config import META_APP_ID, META_AD_ACCOUNT_ID, META_PAGE_ID, META_ACCESS_TOKEN

router = APIRouter()


class MetaConfigSave(BaseModel):
    app_id: str
    ad_account_id: str
    page_id: str
    access_token: str
    api_version: str = "v25.0"


@router.get("/config")
async def get_config(db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna configuração atual (token mascarado). Se não houver no banco, retorna do .env"""
    row = db.execute("SELECT * FROM meta_config ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        # Retorna credenciais do .env se disponíveis
        env_config = {
            "configured": False,
            "env_available": bool(META_ACCESS_TOKEN),
            "app_id": META_APP_ID,
            "ad_account_id": META_AD_ACCOUNT_ID,
            "page_id": META_PAGE_ID,
            # Não retorna o token completo por segurança, apenas indica que existe
            "access_token_preview": f"{META_ACCESS_TOKEN[:10]}..." if META_ACCESS_TOKEN else "",
            "api_version": "v25.0",
        }
        return env_config
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
        api_version=data.api_version,
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


@router.get("/config/env")
async def get_env_config(user=Depends(verify_auth)):
    """Retorna credenciais completas do .env para pré-preencher o formulário."""
    if not META_ACCESS_TOKEN:
        raise HTTPException(status_code=404, detail="Nenhuma credencial configurada no .env")
    return {
        "app_id": META_APP_ID,
        "ad_account_id": META_AD_ACCOUNT_ID,
        "page_id": META_PAGE_ID,
        "access_token": META_ACCESS_TOKEN,
        "api_version": "v25.0",
    }


class ValidateRequest(BaseModel):
    access_token: Optional[str] = None
    ad_account_id: Optional[str] = None
    api_version: Optional[str] = "v25.0"


@router.post("/validate")
async def validate_meta(
    data: Optional[ValidateRequest] = None,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """Testa a conexão com token atual ou com credenciais fornecidas."""
    # Usa credenciais do body se fornecidas, senão busca do banco
    if data and data.access_token and data.ad_account_id:
        access_token = data.access_token
        ad_account_id = data.ad_account_id
        api_version = data.api_version or "v25.0"
    else:
        row = db.execute("SELECT access_token, ad_account_id, api_version FROM meta_config ORDER BY id DESC LIMIT 1").fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Meta não configurado")
        access_token = row["access_token"]
        ad_account_id = row["ad_account_id"]
        api_version = row.get("api_version") or "v25.0"
    
    result = validate_connection(
        access_token=access_token,
        ad_account_id=ad_account_id,
        api_version=api_version,
    )
    
    # Só atualiza o banco se estiver usando credenciais do banco
    if not (data and data.access_token):
        db.execute(
            "UPDATE meta_config SET is_valid = ?, last_validated = CURRENT_TIMESTAMP",
            (result["valid"],),
        )
        db.commit()
    
    return result
