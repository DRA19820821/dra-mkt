# DRA Marketing - Guia do Projeto

## Visão Geral

Sistema completo de marketing digital para geração e publicação de campanhas no Meta Ads (Facebook/Instagram).

- **Backend**: FastAPI + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS v4
- **Integrações**: Meta Marketing API, LLMs (Anthropic, Google, OpenAI)

---

## Estrutura do Projeto

```
dra-mkt/
├── backend/              # API FastAPI
│   ├── agents/           # Pipelines de IA
│   ├── meta/             # Integração Meta Marketing API
│   ├── routers/          # Endpoints da API
│   ├── static/           # Frontend buildado (SPA)
│   ├── main.py           # Entry point
│   ├── database.py       # PostgreSQL wrapper
│   ├── config.py         # Configurações
│   └── auth.py           # Autenticação DRA
├── frontend/             # React SPA
│   ├── src/
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── api.js        # Cliente API
│   │   └── App.jsx       # Roteamento
│   └── package.json
├── media/                # Arquivos gerados (criativos)
└── venv/                 # Python virtual env
```

---

## Módulos do Sistema

### 1. Produtos
Cadastro de produtos/serviços para campanhas.

**Tabela**: `produtos`
- `id`, `nome`, `descricao`, `preco`, `url_vendas`, `ativo`

**API**: `GET|POST|PUT|DELETE /api/produtos`

---

### 2. Personas
Definição de público-alvo.

**Tabela**: `personas`
- `id`, `nome`, `descricao`, `faixa_etaria`, `interesses`, `dores`, `objetivos`

**API**: `GET|POST|PUT|DELETE /api/personas`

---

### 3. Copys (Textos de Anúncios)
Geração de copy com pipeline de IA em 2 etapas:
1. **Gerador**: Cria variantes baseado em template + contexto
2. **Revisor**: Score e feedback em cada variante

**Tabela**: `copys`
- `id`, `produto_id`, `persona_id`, `template_id`, `objetivo`, `tom`
- `status` (rascunho/aprovado/rejeitado), `favorito`, `tags`

**Tabela**: `copy_variants`
- `id`, `copy_id`, `variante_num`, `headline`, `body_text`, `cta`
- `score_revisor`, `feedback_revisor`

**API**: 
- `GET|POST|PUT|DELETE /api/copys`
- `POST /api/copys/{id}/gerar` - Gera variantes via LLM

---

### 4. Templates de Prompt
Templates configuráveis por tipo de campanha.

**Tabela**: `prompt_templates`
- `id`, `nome`, `tipo_campanha`, `template_gerador`, `template_revisor`

**API**: `GET|POST|PUT|DELETE /api/templates`

---

### 5. Criativos (Imagens)
Geração de imagens via IA. Suporta múltiplos providers:

| Modelo | Provider | Preço Aprox. | Características |
|--------|----------|--------------|-----------------|
| Nano Banana | Google | $0.039/img | Econômico, Gemini 2.5 Flash |
| Nano Banana 2 | Google | $0.067/img | ⭐ Recomendado, Gemini 3.1 Flash |
| Nano Banana Pro | Google | $0.134/img | Premium, Gemini 3 Pro |
| **Image-01** | **Minimax** | **$0.02/img** | **Limite: 1500 chars no prompt** |

**Notas sobre Minimax**:

1. **Região da API (IMPORTANTE!)**: A Minimax tem dois endpoints separados com API keys diferentes:
   - **Global** (`MINIMAX_REGION=global`): `api.minimax.io` - Contas internacionais
   - **Mainland** (`MINIMAX_REGION=mainland`): `api.minimaxi.com` - Contas chinesas
   
   Se receber "invalid api key", verifique se a região corresponde à sua conta!

2. **Limite de prompt (1500 chars)**: O sistema automaticamente:
   - Usa um template de prompt mais conciso
   - Trunca descrições longas de produto/persona (200 chars cada)
   - Retorna erro amigável se ainda assim exceder o limite

3. **Formatos suportados**: A API usa `aspect_ratio` em vez de dimensões fixas:
   - Feed Quadrado (1:1) → 1024x1024
   - Feed Retrato (4:5) → 1152x864
   - Story (9:16) → 720x1280
   - Feed Paisagem (16:9) → 1280x720

**Tabela**: `criativos`
- `id`, `produto_id`, `persona_id`, `campanha_id`
- `tipo`, `formato`, `prompt_usado`, `modelo_ia`, `provider`
- `imagem_path`, `thumbnail_path`, `tamanho_bytes`, `status`, `favorito`

**Storage**: `media/criativos/YYYY/MM/`

**API**: `GET|POST|PUT|DELETE /api/criativos`

---

### 6. Campanhas
Orquestração completa: produto + persona + copy + criativo.

**Tabela**: `campanhas`
- `id`, `nome`, `produto_id`, `persona_id`, `objetivo`, `tom`, `status`
- `copy_id`, `criativo_id`, `plataforma`, `orcamento_diario`, `publico_alvo`

**API**: `GET|POST|PUT|DELETE /api/campanhas`

---

### 7. Meta Marketing API

#### Configuração
**Tabela**: `meta_config`
- `app_id`, `ad_account_id`, `page_id`, `access_token`, `api_version`

**API**: `GET|POST /api/meta/config`

#### Publicação (2 etapas com aprovação)
1. Preview: `POST /api/meta/publish/preview`
2. Aprovar: `POST /api/meta/publish/execute/{id}`

**Tabela**: `meta_publicacoes`
- `campanha_id`, `meta_campaign_id`, `meta_adset_id`, `meta_ad_id`, `meta_creative_id`
- `status_meta`, `status_sync`, `targeting_json`, `error_log`

#### Métricas
**Tabela**: `meta_metricas`
- `publicacao_id`, `data_referencia`, `impressions`, `clicks`, `spend`
- `cpm`, `cpc`, `ctr`, `conversions`, `cost_per_conversion`

**API**: `GET /api/meta/metrics/{publicacao_id}`

#### Ações Pendentes
Fila para ações que precisam de aprovação manual.

**Tabela**: `meta_acoes_pendentes`
- `publicacao_id`, `tipo_acao`, `params_json`, `status`

**API**: 
- `GET /api/meta/actions/pending`
- `POST /api/meta/actions/{id}/approve`

---

## Configuração de Ambiente

### Variáveis de Ambiente (.env)
```bash
# PostgreSQL
DATABASE_URL_MKT=postgresql://user:pass@localhost:5432/dra_mkt

# Auth DRA
DRA_AUTH_URL=http://127.0.0.1:8099

# LLM Providers
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=AI...
OPENAI_API_KEY=sk-...

# Image Generation Providers
MINIMAX_API_KEY=ey...
# Minimax region: 'global' (api.minimax.io) para contas internacionais 
# ou 'mainland' (api.minimaxi.com) para contas chinesas
MINIMAX_REGION=global

# Meta Marketing API
META_APP_ID=1234567890
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=EAAB...
META_AD_ACCOUNT_ID=act_123456789
META_PAGE_ID=1234567890
META_API_VERSION=v25.0
```

### Dependências

**Backend**:
```bash
cd backend
pip install fastapi uvicorn psycopg2-binary python-multipart
```

**Frontend**:
```bash
cd frontend
npm install
```

---

## Comandos de Execução

```bash
# Backend
cd backend && uvicorn main:app --host 127.0.0.1 --port 8020 --reload

# Frontend (dev)
cd frontend && npm run dev

# Frontend (build para produção)
cd frontend && npm run build
# Output vai para backend/static/
```

---

## Roteamento (Nginx)

```nginx
location /dra-mkt {
    proxy_pass http://127.0.0.1:8020;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

O backend serve o SPA React em todas as rotas não-API.

---

## Padrões de Código

### Backend
- Módulos separados por domínio em `routers/`
- Database wrapper compatível sqlite3 API
- Meta API abstraída em `meta/client.py`
- Pipelines de IA em `agents/`

### Frontend
- Páginas em `src/pages/`
- Componente Layout em `src/components/Layout.jsx`
- API client centralizado em `src/api.js`
- Toast notifications com `react-hot-toast`

---

## Fluxos Principais

### Gerar Copy
1. Usuário seleciona produto, persona, objetivo, tom
2. Sistema busca template apropriado
3. Pipeline gera 3 variantes via LLM
4. Revisor avalia cada variante (score + feedback)
5. Usuário aprova/rejeita ou regenera

### Publicar no Meta Ads
1. Usuário configura credenciais em MetaConnect
2. Seleciona campanha e clica "Publicar"
3. Sistema cria preview (status: pending)
4. Usuário revisa e aprova
5. Sistema executa: Campaign → AdSet → Ad → Creative
6. Sincronização periódica de status e métricas

### Gerar Criativo
1. Usuário descreve a imagem desejada
2. Sistema gera prompt otimizado
3. Chamada à API do Google Imagen
4. Armazena em `media/criativos/`
5. Gera thumbnail para preview

---

## 8. Hotmart

Integração com a Hotmart API para criação e gestão de produtos digitais.

### Configuração
**Tabela**: `hotmart_config`
- `client_id`, `client_secret`, `basic_token`, `ambiente` (sandbox/producao)
- `access_token`, `token_expires_at`, `is_valid`

**API**:
- `GET|POST|DELETE /api/hotmart/config`
- `POST /api/hotmart/config/validar`

### Produtos Hotmart
**Tabela**: `hotmart_produtos`
- `id`, `produto_dra_id`, `hotmart_product_id`, `nome`, `descricao_curta`, `descricao_completa`
- `categoria`, `formato`, `idioma`, `status_hotmart`, `status_sync`
- `provider_llm`, `model_llm`, `score_ia`

**Tabelas relacionadas**:
- `hotmart_modulos` — módulos/seções do curso
- `hotmart_aulas` — aulas de cada módulo (video/pdf/texto/quiz)
- `hotmart_planos` — planos de preço (unico/recorrente/parcelado)
- `hotmart_geracoes_ia` — histórico de gerações IA

**API**:
- `GET /api/hotmart/produtos` — lista com agregação
- `GET /api/hotmart/produtos/{id}` — detalhe com módulos + aulas + planos
- `POST /api/hotmart/produtos` — cria local
- `PUT|DELETE /api/hotmart/produtos/{id}`
- `POST /api/hotmart/produtos/{id}/sincronizar` — envia para Hotmart API
- `POST /api/hotmart/produtos/{id}/modulos` — adiciona módulo com aulas
- `POST /api/hotmart/produtos/{id}/planos` — adiciona plano
- `GET /api/hotmart/produtos/importar` — importa da Hotmart

### Pipeline IA (Hotmart)
Gera estrutura do curso + copy de vendas via LangGraph:

**Nós**:
1. `gerar_estrutura` — cria módulos e aulas com design instrucional
2. `revisar_estrutura` — avalia progressão didática, abrangência, equilíbrio
3. `gerar_copy` — cria copy completo (título, subtítulo, HTML, CTA)
4. `revisar_copy` — avalia impacto, proposta de valor, gatilhos mentais

**Loop**: score < threshold → refaz até max_tentativas

**API**:
- `GET /api/hotmart/ia/providers`
- `POST /api/hotmart/ia/gerar` — SSE streaming
- `POST /api/hotmart/ia/aplicar/{produto_id}`
- `GET /api/hotmart/ia/historico/{produto_id}`

### Fluxo de Geração Hotmart
1. Usuário preenche tema, público, nível, carga horária
2. Pipeline IA gera estrutura do curso (módulos + aulas)
3. Revisor avalia estrutura (score 0-10)
4. Se aprovado, gera copy de vendas completa em HTML
5. Revisor avalia copy (score 0-10)
6. Resultado salvo no banco: produto + módulos + aulas
7. Usuário pode sincronizar com Hotmart API (cria produto, módulos, aulas, planos)

---

## Versionamento

Fazer commit após mudanças significativas:

```bash
git add AGENTS.md
git commit -m "docs: atualiza documentação do projeto"
```

---

## Troubleshooting

### Erro de conexão PostgreSQL
Verificar `DATABASE_URL_MKT` no `.env`

### Meta API retorna 400
Verificar se `ad_account_id` tem prefixo `act_`

### Frontend não carrega
Verificar se build foi feito: `npm run build`

### Criativo não gera
Verificar `GOOGLE_API_KEY` e quota do Imagen
