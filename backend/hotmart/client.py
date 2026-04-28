"""
Cliente da Hotmart REST API para dra-mkt.
Documentação: https://developers.hotmart.com/docs/pt-BR/

Ambientes:
  Sandbox:   https://sandbox.hotmart.com
  Produção:  https://api-sec-vlc.hotmart.com  (auth)
             https://developers.hotmart.com     (recursos)
"""
import os
import httpx
from datetime import datetime, timedelta
from typing import Optional

SANDBOX_AUTH_URL  = "https://api-sec-vlc.hotmart.com/security/oauth/token"
PROD_AUTH_URL     = "https://api-sec-vlc.hotmart.com/security/oauth/token"
SANDBOX_BASE_URL  = "https://sandbox.hotmart.com"
PROD_BASE_URL     = "https://developers.hotmart.com"


class HotmartClient:
    """
    Wrapper síncrono (httpx) da Hotmart API.
    Gerencia autenticação OAuth2 client_credentials com renovação automática.
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        basic_token: str,
        ambiente: str = "sandbox",
        access_token: str = None,
        token_expires_at: datetime = None,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.basic_token = basic_token
        self.ambiente = ambiente
        self.base_url = SANDBOX_BASE_URL if ambiente == "sandbox" else PROD_BASE_URL
        self.auth_url = SANDBOX_AUTH_URL  # mesma URL para ambos
        self._access_token = access_token
        self._token_expires_at = token_expires_at

    # ------------------------------------------------------------------
    # Autenticação
    # ------------------------------------------------------------------

    def _token_valido(self) -> bool:
        if not self._access_token or not self._token_expires_at:
            return False
        return datetime.utcnow() < self._token_expires_at - timedelta(minutes=5)

    def obter_token(self) -> dict:
        """Obtém novo access_token via client_credentials. Retorna dict com token e expiração."""
        # Hotmart exige Basic Auth header (base64(client_id:client_secret))
        # + form-urlencoded body com grant_type apenas
        import base64
        basic_auth = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        resp = httpx.post(
            self.auth_url,
            headers={
                "Authorization": f"Basic {basic_auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "client_credentials",
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        self._access_token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        return {
            "access_token": self._access_token,
            "token_expires_at": self._token_expires_at,
        }

    def _get_headers(self) -> dict:
        if not self._token_valido():
            self.obter_token()
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Helpers HTTP
    # ------------------------------------------------------------------

    def _get(self, path: str, params: dict = None) -> dict:
        resp = httpx.get(
            f"{self.base_url}{path}",
            headers=self._get_headers(),
            params=params or {},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> dict:
        resp = httpx.post(
            f"{self.base_url}{path}",
            headers=self._get_headers(),
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def _put(self, path: str, body: dict) -> dict:
        resp = httpx.put(
            f"{self.base_url}{path}",
            headers=self._get_headers(),
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # Validação
    # ------------------------------------------------------------------

    def validar_conexao(self) -> dict:
        """Testa a conexão obtendo info da conta. Retorna dict com status."""
        try:
            self.obter_token()
            # Endpoint de produtos como teste
            data = self._get("/product/api/v1/products", {"max_results": 1})
            return {
                "valid": True,
                "ambiente": self.ambiente,
                "total_produtos": data.get("page_info", {}).get("total_results", 0),
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}

    # ------------------------------------------------------------------
    # Produtos
    # ------------------------------------------------------------------

    def criar_produto(self, payload: dict) -> dict:
        """
        Cria um produto na Hotmart.
        payload mínimo: {name, description, format, category, language}
        """
        return self._post("/product/api/v1/products", payload)

    def atualizar_produto(self, product_id: str, payload: dict) -> dict:
        return self._put(f"/product/api/v1/products/{product_id}", payload)

    def listar_produtos(self, page: int = 0, max_results: int = 20) -> dict:
        return self._get("/product/api/v1/products", {
            "page": page,
            "max_results": max_results,
        })

    def obter_produto(self, product_id: str) -> dict:
        return self._get(f"/product/api/v1/products/{product_id}")

    # ------------------------------------------------------------------
    # Módulos
    # ------------------------------------------------------------------

    def criar_modulo(self, product_id: str, payload: dict) -> dict:
        """
        payload: {name, description, position}
        """
        return self._post(f"/product/api/v1/products/{product_id}/modules", payload)

    def listar_modulos(self, product_id: str) -> dict:
        return self._get(f"/product/api/v1/products/{product_id}/modules")

    # ------------------------------------------------------------------
    # Aulas
    # ------------------------------------------------------------------

    def criar_aula(self, product_id: str, module_id: str, payload: dict) -> dict:
        """
        payload: {name, description, type, position}
        type: VIDEO | PDF | TEXT | QUIZ
        """
        return self._post(
            f"/product/api/v1/products/{product_id}/modules/{module_id}/lessons",
            payload,
        )

    def listar_aulas(self, product_id: str, module_id: str) -> dict:
        return self._get(
            f"/product/api/v1/products/{product_id}/modules/{module_id}/lessons"
        )

    # ------------------------------------------------------------------
    # Planos / Preços
    # ------------------------------------------------------------------

    def criar_plano(self, product_id: str, payload: dict) -> dict:
        """
        payload: {name, price, currency, recurrence_type, max_charge_cycles}
        recurrence_type: MONTHLY | ANNUAL | NONE (para único)
        """
        return self._post(f"/product/api/v1/products/{product_id}/plans", payload)

    def listar_planos(self, product_id: str) -> dict:
        return self._get(f"/product/api/v1/products/{product_id}/plans")


def get_hotmart_client(db) -> Optional["HotmartClient"]:
    """
    Instancia HotmartClient a partir da config salva no banco.
    Retorna None se não houver config.
    """
    row = db.execute(
        "SELECT * FROM hotmart_config ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if not row:
        return None
    row = dict(row)
    expires_at = row.get("token_expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            expires_at = None
    return HotmartClient(
        client_id=row["client_id"],
        client_secret=row["client_secret"],
        basic_token=row["basic_token"],
        ambiente=row.get("ambiente", "sandbox"),
        access_token=row.get("access_token"),
        token_expires_at=expires_at,
    )
