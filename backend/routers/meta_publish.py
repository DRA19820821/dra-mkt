"""
Publicação de campanhas no Meta e exportação de fallback.

Endpoints:
    POST /api/meta/publish/{campanha_id}   → Publicar campanha no Meta (criada pausada)
    POST /api/meta/export/{campanha_id}    → Gerar ZIP para upload manual (fallback)
    GET  /api/meta/publicacoes             → Listar campanhas publicadas no Meta
    GET  /api/meta/publicacoes/{id}        → Detalhe de publicação
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from database import get_db
from auth import verify_auth
from meta.publisher import publish_campaign
from meta.exporter import generate_export_package
from agents.criativo_pipeline import MEDIA_BASE
from io import BytesIO

router = APIRouter()


@router.post("/publish/{campanha_id}")
async def publish_to_meta(campanha_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """
    Publica campanha no Meta Ads.
    Campanha é criada PAUSADA — requer aprovação para ativar.
    """
    # Buscar campanha com dados relacionados
    campanha = db.execute(
        """SELECT c.*, p.nome as produto_nome, p.url_vendas
           FROM campanhas c
           LEFT JOIN produtos p ON c.produto_id = p.id
           WHERE c.id = ?""", (campanha_id,)
    ).fetchone()
    if not campanha:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    campanha = dict(campanha)
    campanha["url_destino"] = campanha.get("url_vendas") or "https://academiadoraciocinio.com.br"
    
    # Buscar copy variante (primeira com melhor score)
    if not campanha.get("copy_id"):
        raise HTTPException(status_code=400, detail="Campanha sem copy vinculada")
    
    variante = db.execute(
        """SELECT * FROM copy_variants WHERE copy_id = ? 
           ORDER BY score_revisor DESC NULLS LAST LIMIT 1""",
        (campanha["copy_id"],)
    ).fetchone()
    if not variante:
        raise HTTPException(status_code=400, detail="Copy sem variantes")
    variante = dict(variante)
    
    # Buscar criativo (caminho da imagem no disco)
    if not campanha.get("criativo_id"):
        raise HTTPException(status_code=400, detail="Campanha sem criativo vinculado")
    
    criativo = db.execute(
        "SELECT imagem_path FROM criativos WHERE id = ?", (campanha["criativo_id"],)
    ).fetchone()
    if not criativo or not criativo["imagem_path"]:
        raise HTTPException(status_code=400, detail="Criativo sem imagem")
    
    criativo_full_path = str(MEDIA_BASE / criativo["imagem_path"])
    
    # Buscar config Meta
    config = db.execute("SELECT * FROM meta_config WHERE is_valid = TRUE ORDER BY id DESC LIMIT 1").fetchone()
    if not config:
        raise HTTPException(status_code=400, detail="Meta não configurado. Vá em Configurações → Meta Connect")
    config = dict(config)
    
    # Publicar
    try:
        result = await publish_campaign(
            campanha=campanha,
            copy_variante=variante,
            criativo_path=criativo_full_path,
            ad_account_id=config["ad_account_id"],
            page_id=config["page_id"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao publicar no Meta: {str(e)}")
    
    # Salvar publicação no banco
    cursor = db.execute(
        """INSERT INTO meta_publicacoes 
           (campanha_id, meta_campaign_id, meta_adset_id, meta_ad_id, 
            meta_creative_id, meta_image_hash, status_meta, status_sync,
            orcamento_diario)
           VALUES (?, ?, ?, ?, ?, ?, 'PAUSED', 'synced', ?) RETURNING id""",
        (
            campanha_id,
            result["meta_campaign_id"],
            result["meta_adset_id"],
            result["meta_ad_id"],
            result["meta_creative_id"],
            result["meta_image_hash"],
            campanha.get("orcamento_diario", 20),
        ),
    )
    db.commit()
    pub_id = cursor.lastrowid
    
    # Atualizar status da campanha local
    db.execute("UPDATE campanhas SET status = 'publicada', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (campanha_id,))
    db.commit()
    
    return {
        "ok": True,
        "publicacao_id": pub_id,
        "meta_campaign_id": result["meta_campaign_id"],
        "status": "PAUSED",
        "msg": "Campanha publicada no Meta (PAUSADA). Aprove a ativação quando quiser.",
    }


@router.post("/export/{campanha_id}")
async def export_campaign(campanha_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Gera ZIP para upload manual (fallback)."""
    campanha = db.execute("SELECT c.*, p.nome as produto_nome, p.url_vendas FROM campanhas c LEFT JOIN produtos p ON c.produto_id = p.id WHERE c.id = ?", (campanha_id,)).fetchone()
    if not campanha:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    campanha = dict(campanha)
    campanha["url_destino"] = campanha.get("url_vendas", "")
    
    variante = db.execute("SELECT * FROM copy_variants WHERE copy_id = ? ORDER BY score_revisor DESC NULLS LAST LIMIT 1", (campanha.get("copy_id"),)).fetchone()
    if not variante:
        raise HTTPException(status_code=400, detail="Copy sem variantes")
    
    criativo = db.execute("SELECT imagem_path FROM criativos WHERE id = ?", (campanha.get("criativo_id"),)).fetchone()
    criativo_path = str(MEDIA_BASE / criativo["imagem_path"]) if criativo and criativo["imagem_path"] else None
    
    zip_bytes = generate_export_package(
        campanha=campanha,
        copy_variante=dict(variante),
        criativo_path=criativo_path,
    )
    
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=campanha_{campanha_id}.zip"},
    )


@router.get("/publicacoes")
async def listar_publicacoes(db=Depends(get_db), user=Depends(verify_auth)):
    """Lista campanhas publicadas no Meta."""
    rows = db.execute(
        """SELECT mp.*, c.nome as campanha_nome, c.objetivo
           FROM meta_publicacoes mp
           LEFT JOIN campanhas c ON mp.campanha_id = c.id
           ORDER BY mp.created_at DESC"""
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/publicacoes/{pub_id}")
async def detalhe_publicacao(pub_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    row = db.execute("SELECT * FROM meta_publicacoes WHERE id = ?", (pub_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    return dict(row)
