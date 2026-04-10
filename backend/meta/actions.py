"""
Executa ações aprovadas sobre campanhas no Meta.

Ações suportadas:
- activate  → muda Campaign + AdSet + Ad para ACTIVE
- pause     → muda tudo para PAUSED
- update_budget → altera daily_budget do AdSet
- archive   → arquiva a campanha

Toda ação passa pela tabela meta_acoes_pendentes e requer aprovação do Davi.
"""
import asyncio
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from meta.client import get_meta_api


def execute_action_sync(
    action_type: str,
    meta_campaign_id: str,
    meta_adset_id: str = None,
    meta_ad_id: str = None,
    params: dict = None,
) -> dict:
    """Executa uma ação aprovada no Meta."""
    get_meta_api()
    params = params or {}
    
    if action_type == "activate":
        # Ativar campaign, adset e ad
        Campaign(meta_campaign_id).api_update(params={
            Campaign.Field.status: Campaign.Status.active,
        })
        if meta_adset_id:
            AdSet(meta_adset_id).api_update(params={
                AdSet.Field.status: AdSet.Status.active,
            })
        if meta_ad_id:
            Ad(meta_ad_id).api_update(params={
                Ad.Field.status: Ad.Status.active,
            })
        return {"status": "ACTIVE", "msg": "Campanha ativada com sucesso"}
    
    elif action_type == "pause":
        Campaign(meta_campaign_id).api_update(params={
            Campaign.Field.status: Campaign.Status.paused,
        })
        return {"status": "PAUSED", "msg": "Campanha pausada com sucesso"}
    
    elif action_type == "update_budget":
        new_budget = params.get("orcamento_diario")
        if not new_budget or not meta_adset_id:
            raise ValueError("orcamento_diario e meta_adset_id são obrigatórios")
        budget_cents = int(float(new_budget) * 100)
        AdSet(meta_adset_id).api_update(params={
            AdSet.Field.daily_budget: budget_cents,
        })
        return {"status": "UPDATED", "msg": f"Orçamento atualizado para R${new_budget}"}
    
    elif action_type == "archive":
        Campaign(meta_campaign_id).api_update(params={
            Campaign.Field.status: "ARCHIVED",
        })
        return {"status": "ARCHIVED", "msg": "Campanha arquivada"}
    
    else:
        raise ValueError(f"Ação desconhecida: {action_type}")


async def execute_action(action_type, meta_campaign_id, **kwargs) -> dict:
    return await asyncio.to_thread(
        execute_action_sync, action_type, meta_campaign_id, **kwargs
    )
