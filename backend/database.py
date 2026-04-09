"""
Conexão com PostgreSQL — mantém API compatível com sqlite3 via wrapper.
"""
import psycopg2
import psycopg2.extras
from config import DATABASE_URL


class _PGCursor:
    """Wrapper sobre psycopg2 cursor para mimetizar sqlite3.Cursor."""

    def __init__(self, cur):
        self._cur = cur
        self.lastrowid = None

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()


class PGConnection:
    """
    Wrapper sobre psycopg2 connection que mimetiza a API do sqlite3.Connection.

    Conversões automáticas:
    - Placeholders ? → %s
    - Rows retornadas como dicionários (via RealDictCursor)
    - lastrowid capturado via RETURNING id nos INSERTs
    """

    def __init__(self, conn):
        self._conn = conn

    def execute(self, query: str, params=()):
        # Converter placeholders SQLite → PostgreSQL
        pg_query = query.replace("?", "%s")

        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(pg_query, params)

        wrapper = _PGCursor(cur)

        # Capturar lastrowid se o INSERT usar RETURNING id
        if "RETURNING id" in pg_query.upper():
            row = cur.fetchone()
            if row:
                wrapper.lastrowid = row["id"]

        return wrapper

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_db():
    """Retorna conexão com o PostgreSQL (mesmo contrato de get_db do sqlite3)."""
    conn = psycopg2.connect(DATABASE_URL)
    db = PGConnection(conn)
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Cria tabelas iniciais no PostgreSQL."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    statements = [
        """
        CREATE TABLE IF NOT EXISTS produtos (
            id          SERIAL PRIMARY KEY,
            nome        TEXT NOT NULL,
            descricao   TEXT,
            preco       REAL,
            url_vendas  TEXT,
            ativo       BOOLEAN DEFAULT TRUE,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS personas (
            id           SERIAL PRIMARY KEY,
            nome         TEXT NOT NULL,
            descricao    TEXT,
            faixa_etaria TEXT,
            interesses   TEXT,
            dores        TEXT,
            objetivos    TEXT,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS prompt_templates (
            id                SERIAL PRIMARY KEY,
            nome              TEXT NOT NULL,
            tipo_campanha     TEXT NOT NULL,
            template_gerador  TEXT NOT NULL,
            template_revisor  TEXT NOT NULL,
            ativo             BOOLEAN DEFAULT TRUE,
            created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS copys (
            id           SERIAL PRIMARY KEY,
            produto_id   INTEGER REFERENCES produtos(id),
            persona_id   INTEGER REFERENCES personas(id),
            template_id  INTEGER REFERENCES prompt_templates(id),
            objetivo     TEXT NOT NULL,
            tom          TEXT NOT NULL,
            provider_llm TEXT,
            model_llm    TEXT,
            status       TEXT DEFAULT 'rascunho',
            favorito     BOOLEAN DEFAULT FALSE,
            tags         TEXT,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS copy_variants (
            id                SERIAL PRIMARY KEY,
            copy_id           INTEGER REFERENCES copys(id) ON DELETE CASCADE,
            variante_num      INTEGER NOT NULL,
            headline          TEXT NOT NULL,
            body_text         TEXT NOT NULL,
            cta               TEXT NOT NULL,
            score_revisor     REAL,
            feedback_revisor  TEXT,
            created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS campanhas (
            id               SERIAL PRIMARY KEY,
            nome             TEXT NOT NULL,
            produto_id       INTEGER REFERENCES produtos(id),
            persona_id       INTEGER REFERENCES personas(id),
            objetivo         TEXT NOT NULL,
            tom              TEXT NOT NULL,
            status           TEXT DEFAULT 'rascunho',
            copy_id          INTEGER REFERENCES copys(id),
            criativo_id      INTEGER,
            plataforma       TEXT DEFAULT 'facebook_instagram',
            orcamento_diario REAL,
            publico_alvo     TEXT,
              notas            TEXT,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS criativos (
            id              SERIAL PRIMARY KEY,
            produto_id      INTEGER REFERENCES produtos(id),
            persona_id      INTEGER REFERENCES personas(id),
            campanha_id     INTEGER REFERENCES campanhas(id),
            tipo            TEXT NOT NULL,
            formato         TEXT NOT NULL,
            prompt_usado    TEXT,
            modelo_ia       TEXT NOT NULL,
            provider        TEXT DEFAULT 'google',
            imagem_path     TEXT,
            thumbnail_path  TEXT,
            tamanho_bytes   INTEGER,
            status          TEXT DEFAULT 'rascunho',
            favorito        BOOLEAN DEFAULT FALSE,
            metadata        TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]

    for stmt in statements:
        cur.execute(stmt)

    cur.close()
    conn.close()
    print("init_db: tabelas criadas/confirmadas no PostgreSQL.")
