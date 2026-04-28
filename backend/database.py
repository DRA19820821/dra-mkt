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
        # Meta Marketing API - Configuração
        """
        CREATE TABLE IF NOT EXISTS meta_config (
            id              SERIAL PRIMARY KEY,
            app_id          TEXT NOT NULL,
            ad_account_id   TEXT NOT NULL,
            page_id         TEXT NOT NULL,
            access_token    TEXT NOT NULL,
            api_version     TEXT DEFAULT 'v25.0',
            is_valid        BOOLEAN DEFAULT TRUE,
            last_validated  TIMESTAMP,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Meta Marketing API - Publicações
        """
        CREATE TABLE IF NOT EXISTS meta_publicacoes (
            id                  SERIAL PRIMARY KEY,
            campanha_id         INTEGER REFERENCES campanhas(id) ON DELETE SET NULL,
            meta_campaign_id    TEXT,
            meta_adset_id       TEXT,
            meta_ad_id          TEXT,
            meta_creative_id    TEXT,
            meta_image_hash     TEXT,
            status_meta         TEXT DEFAULT 'PAUSED',
            status_sync         TEXT DEFAULT 'pending',
            orcamento_diario    REAL,
            data_inicio         DATE,
            data_fim            DATE,
            targeting_json      TEXT,
            error_log           TEXT,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Meta Marketing API - Métricas
        """
        CREATE TABLE IF NOT EXISTS meta_metricas (
            id                  SERIAL PRIMARY KEY,
            publicacao_id       INTEGER REFERENCES meta_publicacoes(id) ON DELETE CASCADE,
            data_referencia     DATE NOT NULL,
            impressions         INTEGER DEFAULT 0,
            clicks              INTEGER DEFAULT 0,
            spend               REAL DEFAULT 0,
            reach               INTEGER DEFAULT 0,
            cpm                 REAL,
            cpc                 REAL,
            ctr                 REAL,
            conversions         INTEGER DEFAULT 0,
            cost_per_conversion REAL,
            actions_json        TEXT,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(publicacao_id, data_referencia)
        )
        """,
        # Meta Marketing API - Ações pendentes
        """
        CREATE TABLE IF NOT EXISTS meta_acoes_pendentes (
            id              SERIAL PRIMARY KEY,
            publicacao_id   INTEGER REFERENCES meta_publicacoes(id) ON DELETE CASCADE,
            tipo_acao       TEXT NOT NULL,
            params_json     TEXT,
            status          TEXT DEFAULT 'pendente',
            aprovado_em     TIMESTAMP,
            executado_em    TIMESTAMP,
            error_log       TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Hotmart - Configuração
        """
        CREATE TABLE IF NOT EXISTS hotmart_config (
            id                  SERIAL PRIMARY KEY,
            client_id           TEXT NOT NULL,
            client_secret       TEXT NOT NULL,
            basic_token         TEXT NOT NULL,
            ambiente            TEXT DEFAULT 'sandbox',
            access_token        TEXT,
            token_expires_at    TIMESTAMP,
            is_valid            BOOLEAN DEFAULT FALSE,
            last_validated      TIMESTAMP,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Hotmart - Produtos
        """
        CREATE TABLE IF NOT EXISTS hotmart_produtos (
            id                      SERIAL PRIMARY KEY,
            produto_dra_id          INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
            hotmart_product_id      TEXT UNIQUE,
            nome                    TEXT NOT NULL,
            descricao_curta         TEXT,
            descricao_completa      TEXT,
            categoria               TEXT,
            formato                 TEXT DEFAULT 'online_course',
            idioma                  TEXT DEFAULT 'pt_BR',
            url_checkout            TEXT,
            url_area_membros        TEXT,
            status_hotmart          TEXT DEFAULT 'draft',
            status_sync             TEXT DEFAULT 'local',
            provider_llm            TEXT,
            model_llm               TEXT,
            score_ia                REAL,
            error_log               TEXT,
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Hotmart - Módulos
        """
        CREATE TABLE IF NOT EXISTS hotmart_modulos (
            id                      SERIAL PRIMARY KEY,
            hotmart_produto_id      INTEGER REFERENCES hotmart_produtos(id) ON DELETE CASCADE,
            hotmart_module_id       TEXT,
            nome                    TEXT NOT NULL,
            descricao               TEXT,
            ordem                   INTEGER NOT NULL DEFAULT 0,
            status_sync             TEXT DEFAULT 'local',
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Hotmart - Aulas
        """
        CREATE TABLE IF NOT EXISTS hotmart_aulas (
            id                      SERIAL PRIMARY KEY,
            hotmart_modulo_id       INTEGER REFERENCES hotmart_modulos(id) ON DELETE CASCADE,
            hotmart_lesson_id       TEXT,
            nome                    TEXT NOT NULL,
            descricao               TEXT,
            tipo                    TEXT DEFAULT 'video',
            duracao_minutos         INTEGER,
            ordem                   INTEGER NOT NULL DEFAULT 0,
            status_sync             TEXT DEFAULT 'local',
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Hotmart - Planos
        """
        CREATE TABLE IF NOT EXISTS hotmart_planos (
            id                      SERIAL PRIMARY KEY,
            hotmart_produto_id      INTEGER REFERENCES hotmart_produtos(id) ON DELETE CASCADE,
            hotmart_plan_id         TEXT,
            nome                    TEXT NOT NULL,
            tipo                    TEXT DEFAULT 'unico',
            preco                   REAL NOT NULL,
            moeda                   TEXT DEFAULT 'BRL',
            max_parcelas            INTEGER DEFAULT 1,
            periodicidade           TEXT,
            ativo                   BOOLEAN DEFAULT TRUE,
            status_sync             TEXT DEFAULT 'local',
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Hotmart - Gerações IA
        """
        CREATE TABLE IF NOT EXISTS hotmart_geracoes_ia (
            id                      SERIAL PRIMARY KEY,
            hotmart_produto_id      INTEGER REFERENCES hotmart_produtos(id) ON DELETE CASCADE,
            tipo_geracao            TEXT NOT NULL,
            provider_llm            TEXT NOT NULL,
            model_llm               TEXT NOT NULL,
            prompt_usado            TEXT,
            resultado_json          TEXT,
            score                   REAL,
            tentativa               INTEGER DEFAULT 1,
            status                  TEXT DEFAULT 'gerado',
            created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]

    for stmt in statements:
        cur.execute(stmt)

    cur.close()
    conn.close()
    print("init_db: tabelas criadas/confirmadas no PostgreSQL.")
