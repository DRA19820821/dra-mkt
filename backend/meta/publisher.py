"""
Publicador: Cria Campaign → Ad Set → Ad no Meta.

TODAS as campanhas são criadas com status PAUSED.
O Davi precisa aprovar a ativação via meta_acoes_pendentes.

Hierarquia Meta:
  Campaign (objetivo, nome)
    └── Ad Set (targeting, orçamento, schedule)
          └── Ad (creative: imagem + textos)

Usa API v25.0 com objectives outcome-based (OUTCOME_SALES, etc.)
"""
import os
import asyncio
from pathlib import Path
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.targeting import Targeting
from meta.client import get_meta_api, get_ad_account


# Mapeamento dos objetivos DRA-MKT → Meta API v25.0 (outcome-based)
OBJECTIVE_MAP = {
    "conversao": "OUTCOME_SALES",
    "awareness": "OUTCOME_AWARENESS",
    "remarketing": "OUTCOME_SALES",  # Remarketing usa mesmo objetivo com targeting diferente
    "lancamento": "OUTCOME_ENGAGEMENT",
}

# Mapeamento de otimização por objetivo
OPTIMIZATION_MAP = {
    "OUTCOME_SALES": "OFFSITE_CONVERSIONS",
    "OUTCOME_AWARENESS": "REACH",
    "OUTCOME_ENGAGEMENT": "POST_ENGAGEMENT",
    "OUTCOME_TRAFFIC": "LINK_CLICKS",
    "OUTCOME_LEADS": "LEAD_GENERATION",
}

# Billing event por otimização
BILLING_MAP = {
    "OFFSITE_CONVERSIONS": "IMPRESSIONS",
    "REACH": "IMPRESSIONS",
    "POST_ENGAGEMENT": "IMPRESSIONS",
    "LINK_CLICKS": "LINK_CLICKS",
    "LEAD_GENERATION": "IMPRESSIONS",
}


def _upload_image(ad_account: AdAccount, image_path: str) -> str:
    """
    Faz upload de uma imagem para o Meta e retorna o image_hash.
    O image_hash é usado para criar o AdCreative.
    """
    image = AdImage(parent_id=ad_account.get_id())
    image[AdImage.Field.filename] = image_path
    image.remote_create()
    return image[AdImage.Field.hash]


def publish_campaign_sync(
    campanha: dict,
    copy_variante: dict,
    criativo_path: str,
    targeting_config: dict = None,
    ad_account_id: str = None,
    page_id: str = None,
) -> dict:
    """
    Cria a campanha completa no Meta (Campaign + Ad Set + Ad).
    TUDO é criado com status PAUSED.
    
    Args:
        campanha: dict com dados da campanha do DRA-MKT
        copy_variante: dict com headline, body_text, cta da variante escolhida
        criativo_path: caminho absoluto da imagem no disco
        targeting_config: dict de targeting (opcional, usa default Brasil se None)
        ad_account_id: override do account ID
        page_id: override do page ID
        
    Retorna: {
        "meta_campaign_id": "...",
        "meta_adset_id": "...",
        "meta_ad_id": "...",
        "meta_creative_id": "...",
        "meta_image_hash": "...",
        "status": "PAUSED",
    }
    """
    get_meta_api()
    account = get_ad_account(ad_account_id)
    pg_id = page_id or os.getenv("META_PAGE_ID")
    
    objective = OBJECTIVE_MAP.get(campanha.get("objetivo"), "OUTCOME_SALES")
    optimization = OPTIMIZATION_MAP.get(objective, "LINK_CLICKS")
    billing_event = BILLING_MAP.get(optimization, "IMPRESSIONS")
    
    # ===== 1. CRIAR CAMPAIGN (PAUSADA) =====
    campaign_params = {
        Campaign.Field.name: f"[DRA-MKT] {campanha.get('nome', 'Campanha')}",
        Campaign.Field.objective: objective,
        Campaign.Field.status: Campaign.Status.paused,
        Campaign.Field.special_ad_categories: [],  # Ajustar se for crédito/emprego/moradia
    }
    
    campaign = account.create_campaign(params=campaign_params)
    meta_campaign_id = campaign.get_id()
    
    # ===== 2. UPLOAD DA IMAGEM =====
    image_hash = _upload_image(account, criativo_path)
    
    # ===== 3. CRIAR AD CREATIVE =====
    # Mapear CTA do DRA-MKT para CTA type do Meta
    cta_map = {
        "Saiba mais": "LEARN_MORE",
        "Comprar agora": "SHOP_NOW",
        "Inscreva-se": "SIGN_UP",
        "Baixar agora": "DOWNLOAD",
        "Quero garantir minha vaga": "SIGN_UP",
        "Ver mais": "LEARN_MORE",
    }
    cta_type = cta_map.get(copy_variante.get("cta", ""), "LEARN_MORE")
    
    creative_params = {
        AdCreative.Field.name: f"Creative - {campanha.get('nome', '')}",
        AdCreative.Field.object_story_spec: {
            "page_id": pg_id,
            "link_data": {
                "image_hash": image_hash,
                "link": campanha.get("url_destino") or "https://academiadoraciocinio.com.br",
                "message": copy_variante.get("body_text", ""),
                "name": copy_variante.get("headline", ""),
                "call_to_action": {
                    "type": cta_type,
                    "value": {
                        "link": campanha.get("url_destino") or "https://academiadoraciocinio.com.br",
                    },
                },
            },
        },
    }
    
    creative = account.create_ad_creative(params=creative_params)
    meta_creative_id = creative.get_id()
    
    # ===== 4. CRIAR AD SET (PAUSADO) =====
    # Targeting default: Brasil, 18-65+
    if targeting_config is None:
        targeting_config = {
            Targeting.Field.geo_locations: {
                "countries": ["BR"],
            },
            Targeting.Field.age_min: 18,
            Targeting.Field.age_max: 65,
            # Interesses podem ser adicionados futuramente
        }
    
    orcamento = campanha.get("orcamento_diario", 20.0)
    # Meta API espera orçamento em centavos para BRL
    budget_cents = int(orcamento * 100)
    
    adset_params = {
        AdSet.Field.name: f"AdSet - {campanha.get('nome', '')}",
        AdSet.Field.campaign_id: meta_campaign_id,
        AdSet.Field.daily_budget: budget_cents,
        AdSet.Field.billing_event: billing_event,
        AdSet.Field.optimization_goal: optimization,
        AdSet.Field.targeting: targeting_config,
        AdSet.Field.status: AdSet.Status.paused,
        # Advantage+ placements (recomendado pela Meta)
        # Não especificar publisher_platforms para usar automatic placements
    }
    
    adset = account.create_ad_set(params=adset_params)
    meta_adset_id = adset.get_id()
    
    # ===== 5. CRIAR AD (PAUSADO) =====
    ad_params = {
        Ad.Field.name: f"Ad - {campanha.get('nome', '')}",
        Ad.Field.adset_id: meta_adset_id,
        Ad.Field.creative: {"creative_id": meta_creative_id},
        Ad.Field.status: Ad.Status.paused,
    }
    
    ad = account.create_ad(params=ad_params)
    meta_ad_id = ad.get_id()
    
    return {
        "meta_campaign_id": meta_campaign_id,
        "meta_adset_id": meta_adset_id,
        "meta_ad_id": meta_ad_id,
        "meta_creative_id": meta_creative_id,
        "meta_image_hash": image_hash,
        "status": "PAUSED",
    }


async def publish_campaign(campanha, copy_variante, criativo_path, **kwargs) -> dict:
    """Versão async-safe (o SDK facebook-business é síncrono)."""
    return await asyncio.to_thread(
        publish_campaign_sync,
        campanha, copy_variante, criativo_path, **kwargs
    )
