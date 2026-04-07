"""
Integração com dra-auth.
"""
import httpx
from fastapi import Request, HTTPException, Depends
from config import DRA_AUTH_URL


async def verify_auth(request: Request):
    """
    Middleware/Dependency que valida autenticação via dra-auth.
    """
    # Extrair token do cookie ou header Authorization
    token = request.cookies.get("session_token")
    
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{DRA_AUTH_URL}/api/verify",
                cookies={"session_token": token},
                timeout=5.0
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Serviço de autenticação indisponível")

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token inválido")

    return resp.json()  # dados do usuário
