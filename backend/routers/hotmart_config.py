"""
Configuração e validação da conexão com Hotmart API.

Endpoints:
    GET    /api/hotmart/config          → Retorna config atual (sem client_secret)
    POST   /api/hotmart/config          → Salvar/atualizar credenciais
    POST   /api/hotmart/config/validar  → Testar conexão e salvar access_token
    DELETE /api/hotmart/config          → Remove config
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth
from hotmart.client import HotmartClient, get_hotmart_client
from config import HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET, HOTMART_BASIC_TOKEN, HOTMART_AMBIENTE

router = APIRouter()


class HotmartConfigCreate(BaseModel):
    client_id: str
    client_secret: str
    basic_token: str
    ambiente: str = "sandbox"  # "sandbox" | "producao"


@router.get("/config")
async def get_config(db=Depends(get_db), user=Depends(verify_auth)):
    """Retorna configuração atual (sem expor client_secret nem access_token)."""
    row = db.execute("SELECT * FROM hotmart_config ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        return {"configured": False}
    result = dict(row)
    result.pop("client_secret", None)
    result.pop("access_token", None)
    result["configured"] = True
    return result


@router.post("/config")
async def save_config(data: HotmartConfigCreate, db=Depends(get_db), user=Depends(verify_auth)):
    """Salva ou atualiza configuração Hotmart."""
    count = db.execute("SELECT COUNT(*) as c FROM hotmart_config").fetchone()
    if count and count["c"] > 0:
        db.execute(
            """UPDATE hotmart_config SET
                client_id = ?, client_secret = ?, basic_token = ?, ambiente = ?,
                is_valid = FALSE, updated_at = CURRENT_TIMESTAMP
            """,
            (data.client_id, data.client_secret, data.basic_token, data.ambiente),
        )
    else:
        db.execute(
            "INSERT INTO hotmart_config (client_id, client_secret, basic_token, ambiente) VALUES (?, ?, ?, ?) RETURNING id",
            (data.client_id, data.client_secret, data.basic_token, data.ambiente),
        )
    db.commit()
    return {"ok": True}


@router.get("/config/env")
async def get_env_config(user=Depends(verify_auth)):
    """Retorna credenciais do .env para pré-preencher o formulário."""
    if not HOTMART_CLIENT_ID or not HOTMART_CLIENT_SECRET or not HOTMART_BASIC_TOKEN:
        raise HTTPException(status_code=404, detail="Nenhuma credencial configurada no .env")
    return {
        "client_id": HOTMART_CLIENT_ID,
        "client_secret": HOTMART_CLIENT_SECRET,
        "basic_token": HOTMART_BASIC_TOKEN,
        "ambiente": HOTMART_AMBIENTE,
    }


class ValidateRequest(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    basic_token: Optional[str] = None
    ambiente: Optional[str] = "sandbox"


@router.post("/config/validar")
async def validate_config(
    data: Optional[ValidateRequest] = None,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """Testa conexão com credenciais do banco ou com credenciais fornecidas."""
    if data and data.client_id and data.client_secret and data.basic_token:
        client = HotmartClient(
            client_id=data.client_id,
            client_secret=data.client_secret,
            basic_token=data.basic_token,
            ambiente=data.ambiente or "sandbox",
        )
    else:
        client = get_hotmart_client(db)
        if not client:
            raise HTTPException(status_code=400, detail="Hotmart não configurado")

    result = client.validar_conexao()

    # Só atualiza o banco se estiver usando credenciais do banco
    if not (data and data.client_id):
        if result["valid"]:
            db.execute(
                """UPDATE hotmart_config SET
                    is_valid = TRUE, access_token = ?, token_expires_at = ?,
                    last_validated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                """,
                (client._access_token, client._token_expires_at),
            )
            db.commit()
        else:
            db.execute(
                "UPDATE hotmart_config SET is_valid = FALSE, updated_at = CURRENT_TIMESTAMP",
            )
            db.commit()
            raise HTTPException(status_code=400, detail=f"Conexão inválida: {result['error']}")

    return result


@router.delete("/config")
async def delete_config(db=Depends(get_db), user=Depends(verify_auth)):
    """Remove a configuração Hotmart."""
    db.execute("DELETE FROM hotmart_config")
    db.commit()
    return {"ok": True}
