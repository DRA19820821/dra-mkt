"""
Wrapper do SDK facebook-business para uso no DRA-MKT.

Inicializa a API com o token configurado (do .env ou do banco).
Todas as chamadas ao Meta SDK passam por aqui.
"""
import os
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage


def get_meta_api(access_token: str = None, app_id: str = None, app_secret: str = None):
    """
    Inicializa e retorna a Meta API.
    Se não receber parâmetros, usa variáveis de ambiente.
    """
    token = access_token or os.getenv("META_ACCESS_TOKEN")
    aid = app_id or os.getenv("META_APP_ID")
    secret = app_secret or os.getenv("META_APP_SECRET")
    
    if not token:
        raise ValueError("META_ACCESS_TOKEN não configurado")
    
    api = FacebookAdsApi.init(aid, secret, token)
    return api


def get_ad_account(ad_account_id: str = None):
    """Retorna o objeto AdAccount."""
    account_id = ad_account_id or os.getenv("META_AD_ACCOUNT_ID")
    if not account_id:
        raise ValueError("META_AD_ACCOUNT_ID não configurado")
    return AdAccount(account_id)


def validate_connection(access_token: str = None, ad_account_id: str = None) -> dict:
    """
    Testa a conexão com a Meta API.
    Retorna: {"valid": True, "account_name": "...", "currency": "BRL", ...}
    """
    try:
        get_meta_api(access_token=access_token)
        account = get_ad_account(ad_account_id)
        info = account.api_get(fields=[
            'name', 'currency', 'account_status', 'business_name',
            'timezone_name', 'amount_spent',
        ])
        
        status_map = {
            1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED',
            7: 'PENDING_RISK_REVIEW', 9: 'IN_GRACE_PERIOD',
        }
        
        return {
            "valid": True,
            "account_name": info.get('name'),
            "business_name": info.get('business_name'),
            "currency": info.get('currency'),
            "timezone": info.get('timezone_name'),
            "account_status": status_map.get(info.get('account_status'), 'UNKNOWN'),
            "total_spent": info.get('amount_spent'),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}
