"""
Pipeline LangGraph para geração de produto Hotmart.
Arquivo: backend/agents/hotmart_pipeline.py
"""
import json
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from llm.registry import get_llm


class HotmartPipelineState(TypedDict):
    # Inputs
    tema: str
    publico_alvo: str
    nivel: str
    carga_horaria_total: int
    num_modulos: int
    estilo_copy: str
    provider: str
    model: str
    # Estado
    estrutura: dict
    revisao_estrutura: dict
    copy_vendas: dict
    revisao_copy: dict
    tentativa: int
    score_threshold: float
    max_tentativas: int
    fase: str  # 'estrutura' | 'copy'
    # Output
    resultado_final: dict
    status: str


PROMPT_ESTRUTURA = """Você é um especialista em design instrucional para cursos online no Brasil.

## Produto
- Tema: {tema}
- Público: {publico_alvo}
- Nível: {nivel}
- Carga horária total: {carga_horaria_total}h
- Quantidade de módulos: {num_modulos}

## Tarefa
Crie a estrutura completa do curso com {num_modulos} módulos.
Para cada módulo, defina:
- nome (título conciso e atraente)
- descricao (o que o aluno vai aprender — 1 parágrafo)
- aulas: lista de aulas com {{nome, tipo (video/pdf/quiz), duracao_minutos, descricao}}
  - Distribua a carga horária de forma equilibrada
  - Inclua pelo menos 1 quiz por módulo
  - Vídeos de no máximo 20 minutos

{feedback_anterior}

Responda SOMENTE com JSON válido, sem markdown:
{{
  "modulos": [
    {{
      "nome": "...",
      "descricao": "...",
      "ordem": 1,
      "aulas": [
        {{"nome": "...", "tipo": "video", "duracao_minutos": 15, "descricao": "..."}},
        ...
      ]
    }}
  ]
}}"""

PROMPT_REVISOR_ESTRUTURA = """Você é um revisor de design instrucional sênior.

## Estrutura proposta
{estrutura_json}

## Contexto
- Tema: {tema}
- Público: {publico_alvo}
- Nível: {nivel}
- Carga horária: {carga_horaria_total}h

## Critérios de avaliação (0-10)
1. progressao_didatica: A sequência lógica de módulos faz sentido?
2. abrangencia: Cobre os tópicos essenciais do tema?
3. equilibrio_carga: A carga está bem distribuída entre módulos?
4. variedade_formatos: Usa diferentes tipos de aula (vídeo, pdf, quiz)?
5. clareza_objetivos: As descrições deixam claro o que o aluno aprenderá?

Score geral = média ponderada (progressao 30%, abrangencia 25%, equilibrio 20%, variedade 15%, clareza 10%).

Responda SOMENTE com JSON válido:
{{
  "score_geral": 8.5,
  "scores": {{"progressao_didatica": 9, "abrangencia": 8, ...}},
  "feedback": "Pontos fortes: ... | Melhorias sugeridas: ...",
  "sugestoes_estrutura": ["Sugestão 1...", "Sugestão 2..."]
}}"""

PROMPT_COPY = """Você é um copywriter especialista em infoprodutos e cursos online para o mercado brasileiro.

## Produto
- Tema: {tema}
- Estrutura: {resumo_estrutura}
- Público: {publico_alvo}
- Nível: {nivel}
- Estilo de copy: {estilo_copy}

## Tarefa
Crie o copy completo de vendas do produto para a página da Hotmart:

1. **titulo**: Nome comercial do produto (impactante, até 60 chars)
2. **subtitulo**: Proposta de valor em 1 frase (até 120 chars)
3. **descricao_curta**: Texto de preview para listagens (até 160 chars, sem HTML)
4. **descricao_html**: Descrição completa em HTML semântico para a página de vendas.
   Inclua: hero section com promessa principal, benefícios (lista), para quem é,
   o que vai aprender (baseado nos módulos), depoimentos fictícios de exemplo,
   bônus sugeridos, garantia, CTA final. Use h2, h3, p, ul, li, strong.
5. **cta**: Texto do botão de compra (ex: "Quero garantir minha vaga agora")

{feedback_anterior}

Responda SOMENTE com JSON válido:
{{
  "titulo": "...",
  "subtitulo": "...",
  "descricao_curta": "...",
  "descricao_html": "<h2>...</h2>...",
  "cta": "..."
}}"""

PROMPT_REVISOR_COPY = """Você é um revisor sênior de copy para infoprodutos.

## Copy submetida
{copy_json}

## Contexto
- Tema: {tema}
- Público: {publico_alvo}
- Estilo: {estilo_copy}

## Critérios (0-10)
1. impacto_titulo: O título é memorável e claro?
2. proposta_valor: A proposta de valor está explícita?
3. adequacao_persona: Fala diretamente com o público-alvo?
4. gatilhos_mentais: Usa gatilhos adequados ao estilo?
5. html_qualidade: O HTML é bem estruturado e persuasivo?
6. cta_forca: O CTA convida à ação?

Score = média ponderada (impacto 20%, proposta 20%, persona 20%, gatilhos 15%, html 15%, cta 10%).

Responda SOMENTE com JSON válido:
{{
  "score_geral": 8.0,
  "scores": {{"impacto_titulo": 9, ...}},
  "feedback": "...",
  "aprovado": true
}}"""


def _parse_json_response(content) -> dict | list:
    """Extrai e parseia JSON da resposta do LLM (trata markdown fences e listas)."""
    if isinstance(content, list):
        parts = [item.get("text", str(item)) if isinstance(item, dict) else str(item) for item in content]
        content = "".join(parts)
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return json.loads(content.strip())


async def gerar_estrutura(state: HotmartPipelineState) -> dict:
    llm = get_llm(state["provider"], state["model"], temperature=0.7)
    feedback_anterior = ""
    if state.get("revisao_estrutura") and state.get("tentativa", 0) > 0:
        rev = state["revisao_estrutura"]
        sugestoes = "\n".join(f"- {s}" for s in rev.get("sugestoes_estrutura", []))
        feedback_anterior = f"\n## Feedback da revisão anterior:\n{rev.get('feedback','')}\n\nSugestões:\n{sugestoes}"

    prompt = PROMPT_ESTRUTURA.format(
        tema=state["tema"],
        publico_alvo=state["publico_alvo"],
        nivel=state["nivel"],
        carga_horaria_total=state["carga_horaria_total"],
        num_modulos=state["num_modulos"],
        feedback_anterior=feedback_anterior,
    )
    resp = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        estrutura = _parse_json_response(resp.content)
    except Exception as e:
        estrutura = {"modulos": [], "erro": str(e)}
    return {"estrutura": estrutura, "tentativa": state.get("tentativa", 0) + 1, "fase": "estrutura"}


async def revisar_estrutura(state: HotmartPipelineState) -> dict:
    llm = get_llm(state["provider"], state["model"], temperature=0.2)
    prompt = PROMPT_REVISOR_ESTRUTURA.format(
        estrutura_json=json.dumps(state["estrutura"], ensure_ascii=False, indent=2),
        tema=state["tema"],
        publico_alvo=state["publico_alvo"],
        nivel=state["nivel"],
        carga_horaria_total=state["carga_horaria_total"],
    )
    resp = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        revisao = _parse_json_response(resp.content)
    except Exception:
        revisao = {"score_geral": 7.0, "feedback": "Revisão automática", "sugestoes_estrutura": []}
    return {"revisao_estrutura": revisao}


async def gerar_copy(state: HotmartPipelineState) -> dict:
    llm = get_llm(state["provider"], state["model"], temperature=0.8)
    # Resumo da estrutura para o prompt de copy
    modulos = state.get("estrutura", {}).get("modulos", [])
    resumo = "; ".join([f"Módulo {i+1}: {m.get('nome','')}" for i, m in enumerate(modulos)])
    feedback_anterior = ""
    if state.get("revisao_copy"):
        rev = state["revisao_copy"]
        feedback_anterior = f"\n## Feedback da revisão anterior:\n{rev.get('feedback','')}"

    prompt = PROMPT_COPY.format(
        tema=state["tema"],
        resumo_estrutura=resumo,
        publico_alvo=state["publico_alvo"],
        nivel=state["nivel"],
        estilo_copy=state["estilo_copy"],
        feedback_anterior=feedback_anterior,
    )
    resp = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        copy_vendas = _parse_json_response(resp.content)
    except Exception as e:
        copy_vendas = {"titulo": state["tema"], "subtitulo": "", "descricao_curta": "", "descricao_html": "", "cta": "Comprar", "erro": str(e)}
    return {"copy_vendas": copy_vendas, "fase": "copy"}


async def revisar_copy(state: HotmartPipelineState) -> dict:
    llm = get_llm(state["provider"], state["model"], temperature=0.2)
    prompt = PROMPT_REVISOR_COPY.format(
        copy_json=json.dumps(state["copy_vendas"], ensure_ascii=False, indent=2),
        tema=state["tema"],
        publico_alvo=state["publico_alvo"],
        estilo_copy=state["estilo_copy"],
    )
    resp = await llm.ainvoke([HumanMessage(content=prompt)])
    try:
        revisao = _parse_json_response(resp.content)
    except Exception:
        revisao = {"score_geral": 7.0, "feedback": "Revisão automática", "aprovado": True}
    return {"revisao_copy": revisao}


def decidir(state: HotmartPipelineState) -> Literal["gerar_estrutura", "gerar_copy", "__end__"]:
    threshold = state.get("score_threshold", 7.0)
    max_tent = state.get("max_tentativas", 3)
    tentativa = state.get("tentativa", 1)
    fase = state.get("fase", "estrutura")

    if fase == "estrutura":
        score = state.get("revisao_estrutura", {}).get("score_geral", 0)
        if score >= threshold or tentativa >= max_tent:
            return "gerar_copy"   # estrutura aprovada, parte para copy
        return "gerar_estrutura"  # refaz estrutura

    elif fase == "copy":
        score = state.get("revisao_copy", {}).get("score_geral", 0)
        if score >= threshold or tentativa >= max_tent:
            return "__end__"      # copy aprovada, finaliza
        return "gerar_copy"       # refaz copy


def build_hotmart_pipeline():
    graph = StateGraph(HotmartPipelineState)
    graph.add_node("gerar_estrutura", gerar_estrutura)
    graph.add_node("revisar_estrutura", revisar_estrutura)
    graph.add_node("gerar_copy", gerar_copy)
    graph.add_node("revisar_copy", revisar_copy)

    graph.add_edge(START, "gerar_estrutura")
    graph.add_edge("gerar_estrutura", "revisar_estrutura")
    graph.add_conditional_edges("revisar_estrutura", decidir)
    graph.add_edge("gerar_copy", "revisar_copy")
    graph.add_conditional_edges("revisar_copy", decidir)

    return graph.compile()


hotmart_pipeline = build_hotmart_pipeline()
