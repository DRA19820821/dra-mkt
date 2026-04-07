"""
Pipeline de geração de criativos (imagens) para anúncios.

Usa Nano Banana (Gemini Image) e Imagen 4 via google-genai SDK.
Imagens são salvas em disco em /home/dra-mkt/media/criativos/ (NÃO em base64 no SQLite).
"""
import os
import asyncio
import uuid
import json
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
    "nano-banana-2": {
        "id": "gemini-2.0-flash-exp-image-generation",
        "label": "Gemini Flash Image ⭐ Recomendado",
        "type": "gemini_native",
        "supports_edit": True,
        "price_approx": "$0.039/img",
    },
    "imagen-4": {
        "id": "imagen-3.0-generate-002",
        "label": "Imagen 3 (Google)",
        "type": "imagen",
        "supports_edit": False,
        "price_approx": "$0.04/img",
    },
}


# ===== PROMPT =====

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


def _generate_sync(prompt: str, model_config: dict) -> bytes:
    """
    Chamada SÍNCRONA ao SDK google-genai.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY não configurada")
    
    client = genai.Client(api_key=api_key)
    model_id = model_config["id"]
    model_type = model_config["type"]
    
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
    
    fmt = AD_FORMATS.get(formato)
    if not fmt:
        raise ValueError(f"Formato desconhecido: {formato}")
    
    prompt = PROMPT_CRIATIVO.format(
        plataforma="Instagram e Facebook",
        produto_nome=produto.get("nome", ""),
        produto_descricao=produto.get("descricao", ""),
        persona_nome=persona.get("nome", ""),
        persona_descricao=persona.get("descricao", ""),
        objetivo=objetivo,
        tom=tom,
        formato_label=fmt["label"],
        width=fmt["width"],
        height=fmt["height"],
        estilo=estilo,
        headline=headline,
        instrucoes_adicionais=instrucoes_adicionais,
    )
    
    img_bytes = await asyncio.to_thread(_generate_sync, prompt, model_config)
    
    file_info = _save_image_to_disk(img_bytes, formato)
    
    return {
        "imagem_path": file_info["imagem_path"],
        "thumbnail_path": file_info["thumbnail_path"],
        "tamanho_bytes": file_info["tamanho_bytes"],
        "prompt_usado": prompt,
        "modelo_usado": model_config["id"],
        "formato": formato,
    }


def list_image_models():
    """Retorna lista de modelos de imagem disponíveis."""
    return [
        {
            "key": key,
            "label": cfg["label"],
            "type": cfg["type"],
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
