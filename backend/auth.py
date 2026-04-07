"""
Integração com dra-auth.
"""
import httpx
from fastapi import Request, HTTPException, Depends
from config import DRA_AUTH_URL


def verify_auth_sync(request: Request):
    """
    Verifica autenticação via dra-auth.
    O dra-auth usa cookie 'dra_session'.
    """
    # Pegar o cookie dra_session
    token = request.cookies.get("dra_session")
    
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    # Validar chamando o dra-auth
    import requests
    try:
        resp = requests.get(
            f"{DRA_AUTH_URL}/auth/validate",
            cookies={"dra_session": token},
            timeout=5.0
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Serviço de autenticação indisponível")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão inválida")

    return {"username": "user"}  # Simplificado


async def verify_auth(request: Request):
    """
    Versão async da verificação de autenticação.
    """
    token = request.cookies.get("dra_session")
    
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{DRA_AUTH_URL}/auth/validate",
                cookies={"dra_session": token},
                timeout=5.0
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Serviço de autenticação indisponível")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão inválida")

    return {"username": "user"}
