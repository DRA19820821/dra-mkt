"""
Aplicação principal FastAPI do dra-mkt.
"""
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
from config import APP_NAME, APP_VERSION, BASE_PATH, STATIC_DIR
from database import init_db
from auth import verify_auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialização ao subir a app."""
    init_db()
    yield


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    root_path=BASE_PATH,  # IMPORTANTE para funcionar atrás do Nginx com /dra-mkt
    lifespan=lifespan,
)

# CORS — permitir o frontend React em dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir ao domínio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check (público)
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION
    }


# Protected route example
@app.get("/api/me")
async def get_current_user(user=Depends(verify_auth)):
    return user


# Routers (serão adicionados na Fase 2)
# from routers.copys import router as copys_router
# app.include_router(copys_router, prefix="/api/copys", tags=["copys"])


# SPA fallback - serve index.html para rotas não-API
@app.get("/{path:path}")
async def serve_spa(path: str):
    """Serve o frontend React para qualquer rota não-API."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"error": "Frontend not built yet"}
