"""
Pipeline de geração de criativos (imagens) para anúncios.

Usa Nano Banana (Gemini Image) e Imagen 4 via google-genai SDK.
Imagens são salvas em disco em /home/dra-mkt/media/criativos/ (NÃO em base64 no SQLite).
"""
import os
import asyncio
import uuid
import json
import base64
import requests
from pathlib import Path
from datetime import datetime
from typing import Optional
from google import genai
from google.genai import types
from PIL import Image as PILImage
from io import BytesIO


# ===== DIRETÓRIO DE MÍDIA =====
MEDIA_BASE = Path(os.getenv("MEDIA_DIR", "/home/dra-mkt/media"))
CRIATIVOS_DIR = MEDIA_BASE / "criativos"
THUMBS_DIR = CRIATIVOS_DIR / "thumbs"

THUMBNAIL_SIZE = (400, 400)


def _ensure_media_dirs():
    """Cria diretórios de mídia se não existirem."""
    now = datetime.now()
    month_dir = CRIATIVOS_DIR / str(now.year) / f"{now.month:02d}"
    month_dir.mkdir(parents=True, exist_ok=True)
    THUMBS_DIR.mkdir(parents=True, exist_ok=True)
    return month_dir


def _save_image_to_disk(img_bytes: bytes, formato: str) -> dict:
    """
    Salva imagem em disco e gera thumbnail.
    """
    month_dir = _ensure_media_dirs()
    
    file_id = uuid.uuid4().hex[:12]
    filename = f"{file_id}_{formato}.png"
    
    full_path = month_dir / filename
    full_path.write_bytes(img_bytes)
    
    try:
        img = PILImage.open(BytesIO(img_bytes))
        img.thumbnail(THUMBNAIL_SIZE, PILImage.Resampling.LANCZOS)
        thumb_path = THUMBS_DIR / filename
        img.save(str(thumb_path), "PNG", optimize=True)
        thumbnail_rel = f"criativos/thumbs/{filename}"
    except Exception:
        thumbnail_rel = None
    
    imagem_rel = str(full_path.relative_to(MEDIA_BASE))
    
    return {
        "imagem_path": imagem_rel,
        "thumbnail_path": thumbnail_rel,
        "tamanho_bytes": len(img_bytes),
        "full_path": str(full_path),
    }


# ===== CONFIGURAÇÕES =====

AD_FORMATS = {
    "feed_square": {
        "label": "Feed Quadrado (1:1)",
        "width": 1080, "height": 1080,
        "description": "Post quadrado para feed do Instagram/Facebook",
    },
    "feed_portrait": {
        "label": "Feed Retrato (4:5)",
        "width": 1080, "height": 1350,
        "description": "Post retrato para feed — melhor engajamento",
    },
    "story": {
        "label": "Story/Reels (9:16)",
        "width": 1080, "height": 1920,
        "description": "Story ou Reels vertical",
    },
    "feed_landscape": {
        "label": "Feed Paisagem (1.91:1)",
        "width": 1200, "height": 628,
        "description": "Link ad ou carrossel horizontal do Facebook",
    },
}

IMAGE_MODELS = {
    "nano-banana": {
        "id": "gemini-2.5-flash-image",
        "label": "Nano Banana (Econômico)",
        "type": "gemini_native",
        "provider": "google",
        "supports_edit": True,
        "price_approx": "$0.039/img",
    },
    "nano-banana-2": {
        "id": "gemini-3.1-flash-image-preview",
        "label": "Nano Banana 2 ⭐ Recomendado",
        "type": "gemini_native",
        "provider": "google",
        "supports_edit": True,
        "price_approx": "$0.067/img",
    },
    "nano-banana-pro": {
        "id": "gemini-3-pro-image-preview",
        "label": "Nano Banana Pro (Premium)",
        "type": "gemini_native",
        "provider": "google",
        "supports_edit": True,
        "price_approx": "$0.134/img",
    },
    "minimax-image-01": {
        "id": "image-01",
        "label": "Minimax Image-01",
        "type": "minimax",
        "provider": "minimax",
        "supports_edit": False,
        "price_approx": "$0.02/img",
    },
}


# ===== PROMPTS =====

PROMPT_CRIATIVO = """Crie uma imagem profissional para um anúncio de {plataforma}.

## Produto
- **Nome**: {produto_nome}
- **Descrição**: {produto_descricao}

## Público-alvo
- **Persona**: {persona_nome}
- **Perfil**: {persona_descricao}

## Campanha
- **Objetivo**: {objetivo}
- **Tom**: {tom}

## Especificações da Imagem
- **Formato**: {formato_label} ({width}x{height})
- **Estilo**: {estilo}

## Diretrizes
- Estilo visual profissional e moderno para educação online
- Identidade visual da Academia do Raciocínio: tons de azul (#1E3A5F) e dourado (#D4A853)
- O mascote é um cérebro azul antropomórfico — incluir se fizer sentido
- Texto na imagem deve ser legível e curto
- Se incluir texto, usar: "{headline}"
- Não incluir logos de redes sociais
- Sem marcas d'água visíveis
- Fundo limpo e profissional
- A imagem deve funcionar como um anúncio que para o scroll

{instrucoes_adicionais}"""

# Prompt otimizado para Minimax (limite de 1500 caracteres)
PROMPT_CRIATIVO_MINIMAX = """Anúncio profissional para {plataforma}.

PRODUTO: {produto_nome}. {produto_descricao}

PÚBLICO: {persona_nome}. {persona_descricao}

OBJETIVO: {objetivo} | TOM: {tom} | FORMATO: {formato_label} | ESTILO: {estilo}

DIRETRIZES: Estilo profissional educação online. Cores: azul #1E3A5F e dourado #D4A853. Mascote cérebro azul antropomórfico se fizer sentido. Texto legível e curto: "{headline}". Sem logos redes sociais. Sem marcas d'água. Fundo limpo. Anúncio que para o scroll.

{instrucoes_adicionais}"""

# Limite de caracteres do Minimax (deixando margem de segurança)
MINIMAX_PROMPT_LIMIT = 1400


# Mapeamento de formatos para aspect_ratio do Minimax
MINIMAX_ASPECT_RATIOS = {
    "feed_square": "1:1",      # 1080x1080 -> 1024x1024
    "feed_portrait": "4:5",    # 1080x1350 -> aprox 4:5
    "story": "9:16",           # 1080x1920 -> 9:16
    "feed_landscape": "16:9",  # 1200x628 -> aprox 16:9
}

# Endpoints da API Minimax por região
MINIMAX_ENDPOINTS = {
    "global": "https://api.minimax.io/v1/image_generation",      # Internacional
    "mainland": "https://api.minimaxi.com/v1/image_generation",  # China
}


def _clean_base64(data: str) -> str:
    """
    Limpa e corrige string base64 comum em APIs.
    - Remove prefixo data URI (data:image/jpeg;base64,)
    - Remove whitespace
    - Adiciona padding se necessário
    """
    if not data:
        raise ValueError("Dados base64 vazios")
    
    # Remover prefixo data URI se existir
    if ',' in data:
        data = data.split(',')[1]
    
    # Remover whitespace e novas linhas
    data = data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
    
    # Adicionar padding se necessário (base64 precisa ser múltiplo de 4)
    padding_needed = len(data) % 4
    if padding_needed:
        data += '=' * (4 - padding_needed)
    
    return data


def _safe_b64decode(data: str) -> bytes:
    """
    Decodifica base64 com tratamento robusto de erros.
    """
    try:
        cleaned = _clean_base64(data)
        return base64.b64decode(cleaned, validate=True)
    except Exception as e:
        # Log do erro para debug
        sample = data[:100] if len(data) > 100 else data
        raise ValueError(f"Falha ao decodificar base64: {e}. Dados recebidos: {sample}...")


def _generate_minimax(prompt: str, model_id: str, formato: str = "feed_square") -> bytes:
    """
    Chamada à API do Minimax para geração de imagens.
    Docs: https://platform.minimaxi.com/docs/api-reference/image-generation-t2i
    
    IMPORTANTE: A Minimax tem DUAS regiões com API keys diferentes:
    - Global (api.minimax.io): Contas internacionais
    - Mainland (api.minimaxi.com): Contas chinesas
    """
    api_key = os.getenv("MINIMAX_API_KEY")
    if not api_key:
        raise ValueError("MINIMAX_API_KEY não configurada no .env")
    
    # Detectar região (global ou mainland)
    region = os.getenv("MINIMAX_REGION", "global").lower().strip()
    url = MINIMAX_ENDPOINTS.get(region, MINIMAX_ENDPOINTS["global"])
    
    # Debug: mostrar qual endpoint está sendo usado (sem expor a API key)
    print(f"[Minimax] Usando região: {region} | Endpoint: {url}")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Mapear formato para aspect_ratio
    aspect_ratio = MINIMAX_ASPECT_RATIOS.get(formato, "1:1")
    
    payload = {
        "model": model_id,
        "prompt": prompt,
        "n": 1,
        "aspect_ratio": aspect_ratio,
        "response_format": "base64",  # ESSENCIAL: solicitar base64 explicitamente
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # Capturar erro 401/403 específico de API key inválida
        if response.status_code in (401, 403):
            raise ValueError(
                f"Minimax API key inválida (HTTP {response.status_code}). "
                f"Verifique: (1) se a API key está correta, "
                f"(2) se a região '{region}' corresponde à sua conta. "
                f"Tente MINIMAX_REGION={'mainland' if region == 'global' else 'global'}"
            )
        raise ValueError(f"Minimax API error (HTTP {response.status_code}): {e}")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Erro na requisição Minimax: {e}")
    
    data = response.json()
    
    # Verificar erro na resposta (estrutura pode variar)
    base_resp = data.get("base_resp", {})
    if base_resp and base_resp.get("status_code", 0) != 0:
        error_msg = base_resp.get("status_msg", "Erro desconhecido")
        raise ValueError(f"Minimax API error: {error_msg}")
    
    # Extrair imagem base64 do campo correto
    response_data = data.get("data", {})
    
    # Tentar diferentes campos possíveis na resposta
    images = response_data.get("image_base64") or response_data.get("images") or response_data.get("image_urls")
    
    if not images:
        # Debug: mostrar estrutura da resposta
        raise ValueError(f"Minimax não retornou imagem. Resposta: {list(response_data.keys())}")
    
    if isinstance(images, list):
        img_data = images[0]
    else:
        img_data = images
    
    # Decodificar base64 com tratamento robusto
    return _safe_b64decode(img_data)


def _generate_sync(prompt: str, model_config: dict, formato: str = "feed_square") -> bytes:
    """
    Chamada SÍNCRONA ao SDK de geração de imagens.
    """
    model_id = model_config["id"]
    model_type = model_config["type"]
    
    if model_type == "minimax":
        return _generate_minimax(prompt, model_id, formato)
    
    # Google/Gemini models
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY não configurada")
    
    client = genai.Client(api_key=api_key)
    
    if model_type == "gemini_native":
        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                return part.inline_data.data
        raise ValueError("Modelo Gemini não retornou imagem na resposta")
    
    elif model_type == "imagen":
        response = client.models.generate_images(
            model=model_id,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
            ),
        )
        if not response.generated_images:
            raise ValueError("Imagen não retornou imagem")
        return response.generated_images[0].image.image_bytes
    
    else:
        raise ValueError(f"Tipo de modelo desconhecido: {model_type}")


def _truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Trunca texto para o limite de caracteres especificado."""
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)].rsplit(" ", 1)[0] + suffix


def _build_prompt(
    produto: dict,
    persona: dict,
    objetivo: str,
    tom: str,
    formato: str,
    estilo: str,
    headline: str,
    instrucoes_adicionais: str,
    is_minimax: bool = False,
) -> str:
    """Constrói o prompt apropriado baseado no provider."""
    fmt = AD_FORMATS.get(formato)
    if not fmt:
        raise ValueError(f"Formato desconhecido: {formato}")
    
    # Truncar campos longos para Minimax
    produto_nome = produto.get("nome", "")
    produto_descricao = produto.get("descricao", "")
    persona_nome = persona.get("nome", "")
    persona_descricao = persona.get("descricao", "")
    
    if is_minimax:
        # Versão concisa para Minimax
        produto_descricao = _truncate_text(produto_descricao, 200)
        persona_descricao = _truncate_text(persona_descricao, 200)
        instrucoes = _truncate_text(instrucoes_adicionais, 150)
        
        prompt = PROMPT_CRIATIVO_MINIMAX.format(
            plataforma="Instagram/Facebook",
            produto_nome=produto_nome,
            produto_descricao=produto_descricao,
            persona_nome=persona_nome,
            persona_descricao=persona_descricao,
            objetivo=objetivo,
            tom=tom,
            formato_label=fmt["label"],
            estilo=estilo,
            headline=headline or "Aprovação Garantida",
            instrucoes_adicionais=instrucoes,
        )
        
        # Garantir que não excede o limite
        if len(prompt) > MINIMAX_PROMPT_LIMIT:
            prompt = prompt[:MINIMAX_PROMPT_LIMIT].rsplit(".", 1)[0] + "."
        
        return prompt
    
    # Versão completa para Google/Gemini
    return PROMPT_CRIATIVO.format(
        plataforma="Instagram e Facebook",
        produto_nome=produto_nome,
        produto_descricao=produto_descricao,
        persona_nome=persona_nome,
        persona_descricao=persona_descricao,
        objetivo=objetivo,
        tom=tom,
        formato_label=fmt["label"],
        width=fmt["width"],
        height=fmt["height"],
        estilo=estilo,
        headline=headline,
        instrucoes_adicionais=instrucoes_adicionais,
    )


async def gerar_criativo(
    produto: dict,
    persona: dict,
    objetivo: str,
    tom: str,
    formato: str,
    modelo: str = "nano-banana-2",
    estilo: str = "moderno e profissional",
    headline: str = "",
    instrucoes_adicionais: str = "",
) -> dict:
    """
    Gera uma imagem criativa para anúncio.
    """
    model_config = IMAGE_MODELS.get(modelo)
    if not model_config:
        raise ValueError(f"Modelo desconhecido: {modelo}")
    
    is_minimax = model_config.get("provider") == "minimax"
    
    prompt = _build_prompt(
        produto=produto,
        persona=persona,
        objetivo=objetivo,
        tom=tom,
        formato=formato,
        estilo=estilo,
        headline=headline,
        instrucoes_adicionais=instrucoes_adicionais,
        is_minimax=is_minimax,
    )
    
    # Validar limite do Minimax
    if is_minimax and len(prompt) > 1500:
        raise ValueError(
            f"Prompt muito longo para Minimax ({len(prompt)} chars). "
            f"Limite: 1500 caracteres. Reduza a descrição do produto/persona."
        )
    
    img_bytes = await asyncio.to_thread(_generate_sync, prompt, model_config, formato)
    
    file_info = _save_image_to_disk(img_bytes, formato)
    
    return {
        "imagem_path": file_info["imagem_path"],
        "thumbnail_path": file_info["thumbnail_path"],
        "tamanho_bytes": file_info["tamanho_bytes"],
        "prompt_usado": prompt,
        "modelo_usado": model_config["id"],
        "provider": model_config.get("provider", "google"),
        "formato": formato,
    }


def list_image_models():
    """Retorna lista de modelos de imagem disponíveis."""
    return [
        {
            "key": key,
            "label": cfg["label"],
            "type": cfg["type"],
            "provider": cfg.get("provider", "google"),
            "supports_edit": cfg["supports_edit"],
            "price_approx": cfg["price_approx"],
        }
        for key, cfg in IMAGE_MODELS.items()
    ]


def list_ad_formats():
    """Retorna lista de formatos de anúncio disponíveis."""
    return [
        {"key": key, "label": cfg["label"], "width": cfg["width"], "height": cfg["height"], "description": cfg["description"]}
        for key, cfg in AD_FORMATS.items()
    ]
