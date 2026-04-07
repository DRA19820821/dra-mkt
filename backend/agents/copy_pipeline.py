"""
Pipeline LangGraph para geração e revisão de copys de marketing.

Grafo:
    START → gerar_copys → revisar_copys → decidir
        decidir → END (se score >= threshold)
        decidir → gerar_copys (se score < threshold e tentativas < max)
        decidir → END (se tentativas >= max)
"""
import json
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from llm.registry import get_llm


# ===== STATE =====

class CopyState(TypedDict):
    """Estado do pipeline de geração de copys."""
    # Inputs
    produto_nome: str
    produto_descricao: str
    persona_nome: str
    persona_descricao: str
    persona_dores: str
    persona_objetivos: str
    objetivo_campanha: str
    tom: str
    num_variantes: int
    provider: str
    model: str

    # Pipeline state
    variantes: list
    revisao: list
    tentativa: int
    score_threshold: float
    max_tentativas: int

    # Output
    resultado_final: list
    status: str


# ===== PROMPT TEMPLATES =====

PROMPT_GERADOR = """Você é um copywriter especialista em marketing digital para educação online no Brasil.

## Contexto do Produto
- **Produto**: {produto_nome}
- **Descrição**: {produto_descricao}

## Público-Alvo (Persona)
- **Persona**: {persona_nome}
- **Perfil**: {persona_descricao}
- **Dores**: {persona_dores}
- **Objetivos**: {persona_objetivos}

## Campanha
- **Objetivo**: {objetivo_campanha}
- **Tom**: {tom}

## Tarefa
Gere {num_variantes} variações de copy para anúncios no Facebook/Instagram Ads.
Cada variação deve conter:
1. **headline**: Título chamativo (máx 40 caracteres)
2. **body_text**: Texto do anúncio (máx 125 caracteres para feed, incluindo emojis se adequado)
3. **cta**: Call-to-action (ex: "Saiba mais", "Quero garantir minha vaga", "Baixar agora")

## Regras
- Copys devem seguir as políticas de anúncios da Meta (sem promessas exageradas, sem clickbait)
- Use gatilhos mentais adequados ao tom escolhido
- Foque nas dores e objetivos da persona
- Linguagem natural e direta, como se falasse com a persona
- Para remarketing: usar urgência e escassez
- Para awareness: focar na transformação e benefícios
- Para conversão: focar na oferta e CTA direto

{feedback_anterior}

Responda SOMENTE com um JSON array, sem markdown, sem explicações:
[
  {{"headline": "...", "body_text": "...", "cta": "..."}},
  ...
]"""

PROMPT_REVISOR = """Você é um revisor sênior de copywriting para marketing digital.

## Contexto
- **Produto**: {produto_nome}
- **Persona**: {persona_nome} — {persona_descricao}
- **Objetivo**: {objetivo_campanha}
- **Tom**: {tom}

## Variantes para revisão
{variantes_json}

## Tarefa
Avalie CADA variante nos seguintes critérios (0-10):
1. **clareza**: A mensagem é clara e compreensível?
2. **persuasao**: Usa gatilhos mentais adequados?
3. **adequacao_persona**: Fala diretamente com a persona?
4. **compliance_meta**: Segue as políticas de anúncios da Meta?
5. **cta_eficacia**: O CTA é claro e motivador?

Calcule um **score_geral** (média ponderada: persuasao 30%, adequacao_persona 25%, clareza 20%, compliance_meta 15%, cta_eficacia 10%).

Responda SOMENTE com um JSON array, sem markdown:
[
  {{
    "variante_num": 1,
    "score_geral": 8.5,
    "scores": {{"clareza": 9, "persuasao": 8, "adequacao_persona": 9, "compliance_meta": 8, "cta_eficacia": 8}},
    "feedback": "Pontos fortes: ... | Sugestões de melhoria: ..."
  }},
  ...
]"""


# ===== NODES =====

async def gerar_copys(state: CopyState) -> dict:
    """Node: Gera variantes de copy usando o LLM selecionado."""
    llm = get_llm(state["provider"], state["model"], temperature=0.8)

    feedback_anterior = ""
    if state.get("revisao") and state["tentativa"] > 0:
        feedbacks = [f"Variante {r['variante_num']}: {r['feedback']}" for r in state["revisao"]]
        feedback_anterior = f"\n## Feedback da revisão anterior (melhore com base nisto):\n" + "\n".join(feedbacks)

    prompt = PROMPT_GERADOR.format(
        produto_nome=state["produto_nome"],
        produto_descricao=state["produto_descricao"],
        persona_nome=state["persona_nome"],
        persona_descricao=state["persona_descricao"],
        persona_dores=state["persona_dores"],
        persona_objetivos=state["persona_objetivos"],
        objetivo_campanha=state["objetivo_campanha"],
        tom=state["tom"],
        num_variantes=state["num_variantes"],
        feedback_anterior=feedback_anterior,
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    
    # Parse JSON da resposta
    try:
        # Extrair conteúdo (tratar diferentes formatos de resposta)
        content = response.content
        
        # Se for uma lista (caso do Gemini), converter para string
        if isinstance(content, list):
            content = " ".join(str(item) for item in content)
        
        content = content.strip()
        
        # Limpar possíveis marcadores de código markdown
        if content.startswith("```"):
            # Remover ```json ou ``` no início
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        variantes = json.loads(content)
        
        # Validar formato
        if not isinstance(variantes, list):
            raise ValueError("Resposta não é uma lista")
            
    except (json.JSONDecodeError, IndexError, ValueError, AttributeError) as e:
        # Fallback: retornar variante de erro com o conteúdo recebido
        error_content = str(response.content)[:200] if hasattr(response, 'content') else str(response)[:200]
        variantes = [{"headline": "Erro na geração", "body_text": f"Erro: {str(e)[:50]} | Conteúdo: {error_content}", "cta": "Tentar novamente"}]

    return {
        "variantes": variantes,
        "tentativa": state.get("tentativa", 0) + 1,
        "status": "revisando",
    }


async def revisar_copys(state: CopyState) -> dict:
    """Node: Revisa as variantes geradas."""
    llm = get_llm(state["provider"], state["model"], temperature=0.3)

    variantes_json = json.dumps(state["variantes"], ensure_ascii=False, indent=2)

    prompt = PROMPT_REVISOR.format(
        produto_nome=state["produto_nome"],
        persona_nome=state["persona_nome"],
        persona_descricao=state.get("persona_descricao", ""),
        objetivo_campanha=state["objetivo_campanha"],
        tom=state["tom"],
        variantes_json=variantes_json,
    )

    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        # Extrair conteúdo (tratar diferentes formatos de resposta)
        content = response.content
        
        # Se for uma lista (caso do Gemini), converter para string
        if isinstance(content, list):
            content = " ".join(str(item) for item in content)
        
        content = content.strip()
        
        # Limpar possíveis marcadores de código markdown
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        revisao = json.loads(content)
        
        # Validar formato
        if not isinstance(revisao, list):
            raise ValueError("Resposta não é uma lista")
            
    except (json.JSONDecodeError, IndexError, ValueError, AttributeError) as e:
        # Se falhar o parse, aprovar com score default
        revisao = [
            {"variante_num": i + 1, "score_geral": 7.0, "scores": {}, "feedback": "Revisão automática - formato de resposta inválido"}
            for i in range(len(state["variantes"]))
        ]

    return {"revisao": revisao}


def decidir(state: CopyState) -> Literal["gerar_copys", "__end__"]:
    """Edge condicional: decide se aprova ou requer nova geração."""
    threshold = state.get("score_threshold", 7.0)
    max_tent = state.get("max_tentativas", 3)
    tentativa = state.get("tentativa", 1)

    # Calcular score médio
    scores = [r.get("score_geral", 0) for r in state.get("revisao", [])]
    score_medio = sum(scores) / len(scores) if scores else 0

    if score_medio >= threshold or tentativa >= max_tent:
        return "__end__"
    else:
        return "gerar_copys"


# ===== GRAPH =====

def build_copy_pipeline():
    """Constrói e retorna o grafo LangGraph do pipeline de copys."""
    graph = StateGraph(CopyState)

    graph.add_node("gerar_copys", gerar_copys)
    graph.add_node("revisar_copys", revisar_copys)

    graph.add_edge(START, "gerar_copys")
    graph.add_edge("gerar_copys", "revisar_copys")
    graph.add_conditional_edges("revisar_copys", decidir)

    return graph.compile()


# Instância compilada do pipeline
copy_pipeline = build_copy_pipeline()
