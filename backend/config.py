"""
Configurações centralizadas do dra-mkt.
"""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "dra-mkt.db"
STATIC_DIR = BASE_DIR / "backend" / "static"

# Server
HOST = "127.0.0.1"
PORT = 8020

# Auth
DRA_AUTH_URL = os.getenv("DRA_AUTH_URL", "http://127.0.0.1:8099")

# LLM Providers (serão expandidos na Fase 2)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# App
APP_NAME = "DRA Marketing"
APP_VERSION = "0.1.0"
BASE_PATH = "/dra-mkt"  # Prefixo de rota para o Nginx

# PostgreSQL — lê do .env ou usa valor padrão
DATABASE_URL = os.getenv(
    "DATABASE_URL_MKT",
    "postgresql://dra_user:VPPNAGbjS136DDE2EeTUy4qzmoYTMX0@localhost:5432/dra_mkt"
)
