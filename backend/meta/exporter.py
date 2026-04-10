"""
Exportador (fallback): Gera pacote formatado para upload manual.

Quando o token Meta falha ou o Davi prefere subir manualmente,
exporta um ZIP com:
- imagem_criativo.png
- copy.txt (headline + body + CTA formatados)
- config.json (targeting, orçamento, objetivo)
- instrucoes.txt (passo a passo para subir no Ads Manager)
"""
import json
import zipfile
import os
from pathlib import Path
from io import BytesIO
from datetime import datetime


def generate_export_package(
    campanha: dict,
    copy_variante: dict,
    criativo_path: str,
    produto: dict = None,
    persona: dict = None,
) -> bytes:
    """
    Gera um ZIP com tudo necessário para subir manualmente.
    Retorna: bytes do arquivo ZIP.
    """
    buffer = BytesIO()
    
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # 1. Imagem do criativo
        if criativo_path and Path(criativo_path).exists():
            zf.write(criativo_path, "criativo.png")
        
        # 2. Copy formatada
        copy_text = f"""HEADLINE:
{copy_variante.get('headline', '')}

TEXTO DO ANÚNCIO (PRIMARY TEXT):
{copy_variante.get('body_text', '')}

CALL-TO-ACTION:
{copy_variante.get('cta', '')}

---
URL de destino: {campanha.get('url_destino', 'https://academiadoraciocinio.com.br')}
"""
        zf.writestr("copy.txt", copy_text)
        
        # 3. Configuração JSON
        config = {
            "campanha": campanha.get("nome"),
            "objetivo": campanha.get("objetivo"),
            "plataforma": campanha.get("plataforma"),
            "orcamento_diario_brl": campanha.get("orcamento_diario"),
            "produto": produto.get("nome") if produto else None,
            "persona": persona.get("nome") if persona else None,
            "gerado_em": datetime.now().isoformat(),
        }
        zf.writestr("config.json", json.dumps(config, indent=2, ensure_ascii=False))
        
        # 4. Instruções
        instrucoes = f"""INSTRUÇÕES PARA SUBIR NO META ADS MANAGER
==========================================

1. Acesse business.facebook.com/adsmanager
2. Clique em "+ Criar"
3. Selecione o objetivo: {campanha.get('objetivo', 'Vendas').upper()}
4. Nome da campanha: {campanha.get('nome', '')}
5. No Ad Set:
   - Orçamento diário: R$ {campanha.get('orcamento_diario', 20):.2f}
   - Público: Brasil, 18-65+
   - Posicionamentos: Automáticos (Advantage+)
6. No Anúncio:
   - Faça upload da imagem "criativo.png"
   - Cole o texto de "copy.txt"
   - Configure o CTA: {copy_variante.get('cta', '')}
   - URL de destino: {campanha.get('url_destino', '')}
7. Revise e publique

Gerado pelo DRA Marketing em {datetime.now().strftime('%d/%m/%Y %H:%M')}
"""
        zf.writestr("instrucoes.txt", instrucoes)
    
    buffer.seek(0)
    return buffer.read()
