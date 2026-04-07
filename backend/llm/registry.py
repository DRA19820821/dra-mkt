"""
Registry multi-provider de LLMs para dra-mkt.
Baseado no padrão do dra-gera-anki (llm_providers.py).
"""
import os
from typing import Optional


# Modelos que só aceitam temperature=1 (reasoning)
_REASONING_MODELS = {
    "deepseek-reasoner",
    "kimi-k2.5",
    "kimi-k2-thinking",
}


LLM_PROVIDERS = {
    "anthropic": {
        "display_name": "Anthropic",
        "models": [
            {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 ⭐ Recomendado", "tier": "balanced"},
            {"id": "claude-opus-4-6", "name": "Claude Opus 4.6 (Premium)", "tier": "premium"},
            {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5 (Econômico)", "tier": "budget"},
        ],
        "env_var": "ANTHROPIC_API_KEY",
        "langchain_class": "ChatAnthropic",
    },
    "openai": {
        "display_name": "OpenAI",
        "models": [
            {"id": "gpt-5.4", "name": "GPT-5.4 (Flagship)", "tier": "premium"},
            {"id": "gpt-5.4-mini", "name": "GPT-5.4 Mini", "tier": "balanced"},
            {"id": "gpt-5.4-nano", "name": "GPT-5.4 Nano (Econômico)", "tier": "budget"},
        ],
        "env_var": "OPENAI_API_KEY",
        "langchain_class": "ChatOpenAI",
    },
    "google": {
        "display_name": "Google",
        "models": [
            {"id": "gemini-3.1-pro-preview", "name": "Gemini 3.1 Pro Preview", "tier": "premium"},
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "tier": "balanced"},
            {"id": "gemini-3.1-flash-lite-preview", "name": "Gemini 3.1 Flash Lite", "tier": "budget"},
        ],
        "env_var": "GOOGLE_API_KEY",
        "langchain_class": "ChatGoogleGenerativeAI",
    },
    "deepseek": {
        "display_name": "DeepSeek",
        "models": [
            {"id": "deepseek-chat", "name": "DeepSeek Chat V3.2/V4", "tier": "budget"},
            {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner", "tier": "balanced"},
        ],
        "env_var": "DEEPSEEK_API_KEY",
        "langchain_class": "ChatOpenAI",
        "base_url": "https://api.deepseek.com",
    },
    "moonshot": {
        "display_name": "Moonshot AI (Kimi)",
        "models": [
            {"id": "kimi-k2.5", "name": "Kimi K2.5", "tier": "balanced"},
        ],
        "env_var": "MOONSHOT_API_KEY",
        "langchain_class": "ChatOpenAI",
        "base_url": "https://api.moonshot.ai/v1",
    },
}


def get_api_key(provider: str) -> Optional[str]:
    """Retorna a API key do provider do ambiente."""
    config = LLM_PROVIDERS.get(provider)
    if not config:
        return None
    return os.getenv(config["env_var"])


def list_providers() -> list[dict]:
    """Retorna lista de providers e modelos disponíveis."""
    result = []
    for prov_id, prov_data in LLM_PROVIDERS.items():
        api_key = get_api_key(prov_id)
        if api_key:  # Só mostrar providers configurados
            result.append({
                "provider": prov_id,
                "display_name": prov_data["display_name"],
                "models": prov_data["models"],
            })
    return result


def get_llm(provider: str, model: str, temperature: float = 0.7, **kwargs):
    """
    Cria e retorna uma instância do LLM LangChain.
    
    Args:
        provider: ID do provider (anthropic, openai, google, etc.)
        model: ID do modelo
        temperature: Temperatura de sampling (0-1)
        **kwargs: Argumentos adicionais para o LLM
    """
    config = LLM_PROVIDERS.get(provider)
    if not config:
        raise ValueError(f"Provider desconhecido: {provider}")
    
    api_key = get_api_key(provider)
    if not api_key:
        raise ValueError(f"API key não configurada para {provider}: {config['env_var']}")
    
    # Modelos reasoning só aceitam temperature=1
    if model in _REASONING_MODELS:
        temperature = 1.0
    
    cls_name = config["langchain_class"]
    base_url = config.get("base_url")
    
    if cls_name == "ChatAnthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=api_key,
            temperature=temperature,
            max_tokens=4096,
            **kwargs,
        )
    
    elif cls_name == "ChatGoogleGenerativeAI":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=temperature,
            **kwargs,
        )
    
    else:  # ChatOpenAI - OpenAI, DeepSeek, Moonshot
        from langchain_openai import ChatOpenAI
        llm_kwargs = dict(
            model=model,
            api_key=api_key,
            temperature=temperature,
            **kwargs,
        )
        if base_url:
            llm_kwargs["base_url"] = base_url
        return ChatOpenAI(**llm_kwargs)
