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

# Routers
from routers.produtos import router as produtos_router
from routers.personas import router as personas_router
from routers.copys import router as copys_router
from routers.criativos import router as criativos_router
from routers.campanhas import router as campanhas_router
from routers.templates import router as templates_router

# Meta Marketing API
from routers.meta_config import router as meta_config_router
from routers.meta_publish import router as meta_publish_router
from routers.meta_actions import router as meta_actions_router
from routers.meta_metrics import router as meta_metrics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialização ao subir a app."""
    init_db()
    yield


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    root_path=BASE_PATH,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== API Routes (devem vir antes do SPA fallback) =====

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION
    }


@app.get("/api/me")
async def get_current_user(user=Depends(verify_auth)):
    return user


# Routers CRUD
app.include_router(produtos_router, prefix="/api/produtos", tags=["produtos"])
app.include_router(personas_router, prefix="/api/personas", tags=["personas"])
app.include_router(copys_router, prefix="/api/copys", tags=["copys"])
app.include_router(criativos_router, prefix="/api/criativos", tags=["criativos"])
app.include_router(campanhas_router, prefix="/api/campanhas", tags=["campanhas"])
app.include_router(templates_router, prefix="/api/templates", tags=["templates"])

# Meta Marketing API Routers
app.include_router(meta_config_router, prefix="/api/meta", tags=["meta-config"])
app.include_router(meta_publish_router, prefix="/api/meta", tags=["meta-publish"])
app.include_router(meta_actions_router, prefix="/api/meta/actions", tags=["meta-actions"])
app.include_router(meta_metrics_router, prefix="/api/meta/metrics", tags=["meta-metrics"])


# ===== SPA Fallback (deve vir DEPOIS de todas as API routes) =====

@app.get("/{path:path}")
async def serve_spa(path: str):
    """Serve o frontend React para qualquer rota não-API."""
    # Não interceptar rotas da API
    if path.startswith("api/"):
        return {"detail": "Not Found"}
    
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"error": "Frontend not built yet"}
