"""
Setup do SQLite.
"""
import sqlite3
from pathlib import Path
from config import DB_PATH


def get_db():
    """Retorna conexão com o banco."""
    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Cria tabelas iniciais."""
    db = sqlite3.connect(str(DB_PATH))
    db.executescript("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco REAL,
            url_vendas TEXT,
            ativo BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            faixa_etaria TEXT,
            interesses TEXT,  -- JSON array
            dores TEXT,       -- JSON array
            objetivos TEXT,   -- JSON array
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prompt_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo_campanha TEXT NOT NULL,  -- conversao, awareness, remarketing, lancamento
            template_gerador TEXT NOT NULL,
            template_revisor TEXT NOT NULL,
            ativo BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS copys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER REFERENCES produtos(id),
            persona_id INTEGER REFERENCES personas(id),
            template_id INTEGER REFERENCES prompt_templates(id),
            objetivo TEXT NOT NULL,
            tom TEXT NOT NULL,
            provider_llm TEXT,
            model_llm TEXT,
            status TEXT DEFAULT 'rascunho',  -- rascunho, aprovado, usado, arquivado
            favorito BOOLEAN DEFAULT 0,
            tags TEXT,  -- JSON array
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS copy_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            copy_id INTEGER REFERENCES copys(id) ON DELETE CASCADE,
            variante_num INTEGER NOT NULL,
            headline TEXT NOT NULL,
            body_text TEXT NOT NULL,
            cta TEXT NOT NULL,
            score_revisor REAL,
            feedback_revisor TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    db.close()
