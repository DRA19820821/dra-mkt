"""
Sincronizador: Puxa status e métricas das campanhas publicadas no Meta.

Métricas puxadas: impressions, clicks, spend, reach, cpm, cpc, ctr, conversions.
Granularidade: diária (um registro por dia por publicação).
"""
import asyncio
from datetime import datetime, timedelta
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from meta.client import get_meta_api


def sync_campaign_status_sync(meta_campaign_id: str) -> dict:
    """Puxa o status atual da campanha no Meta."""
    get_meta_api()
    campaign = Campaign(meta_campaign_id)
    data = campaign.api_get(fields=[
        'name', 'status', 'effective_status', 'configured_status',
        'daily_budget', 'lifetime_budget', 'start_time', 'stop_time',
    ])
    return {
        "status": data.get("effective_status"),
        "configured_status": data.get("configured_status"),
        "daily_budget": data.get("daily_budget"),
        "start_time": data.get("start_time"),
        "stop_time": data.get("stop_time"),
    }


def fetch_insights_sync(
    meta_campaign_id: str,
    date_start: str = None,
    date_end: str = None,
) -> list[dict]:
    """
    Puxa métricas de performance da campanha.
    
    Retorna lista de dicts, um por dia:
    [{"date": "2026-04-09", "impressions": 1234, "clicks": 56, ...}, ...]
    """
    get_meta_api()
    
    if not date_start:
        date_start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    if not date_end:
        date_end = datetime.now().strftime("%Y-%m-%d")
    
    campaign = Campaign(meta_campaign_id)
    
    insights = campaign.get_insights(
        fields=[
            'impressions', 'clicks', 'spend', 'reach',
            'cpm', 'cpc', 'ctr',
            'actions', 'cost_per_action_type',
        ],
        params={
            'time_range': {
                'since': date_start,
                'until': date_end,
            },
            'time_increment': 1,  # Granularidade diária
        },
    )
    
    results = []
    for row in insights:
        # Extrair conversões do campo actions
        conversions = 0
        cost_per_conversion = 0
        actions = row.get("actions", [])
        for action in actions:
            if action.get("action_type") in ("offsite_conversion", "purchase", "lead"):
                conversions += int(action.get("value", 0))
        
        cost_actions = row.get("cost_per_action_type", [])
        for ca in cost_actions:
            if ca.get("action_type") in ("offsite_conversion", "purchase", "lead"):
                cost_per_conversion = float(ca.get("value", 0))
        
        results.append({
            "date": row.get("date_start"),
            "impressions": int(row.get("impressions", 0)),
            "clicks": int(row.get("clicks", 0)),
            "spend": float(row.get("spend", 0)),
            "reach": int(row.get("reach", 0)),
            "cpm": float(row.get("cpm", 0)),
            "cpc": float(row.get("cpc", 0)) if row.get("cpc") else 0,
            "ctr": float(row.get("ctr", 0)),
            "conversions": conversions,
            "cost_per_conversion": cost_per_conversion,
            "actions_json": str(actions),
        })
    
    return results


async def sync_campaign_status(meta_campaign_id: str) -> dict:
    return await asyncio.to_thread(sync_campaign_status_sync, meta_campaign_id)


async def fetch_insights(meta_campaign_id: str, **kwargs) -> list[dict]:
    return await asyncio.to_thread(fetch_insights_sync, meta_campaign_id, **kwargs)
