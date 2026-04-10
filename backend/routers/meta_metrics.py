"""
Métricas de performance das campanhas publicadas no Meta.

Endpoints:
    POST /api/meta/metrics/sync/{pub_id}  → Sincronizar métricas de uma publicação
    POST /api/meta/metrics/sync-all       → Sincronizar todas as ativas
    GET  /api/meta/metrics/{pub_id}       → Buscar métricas de uma publicação
    GET  /api/meta/metrics/summary        → Resumo geral (totais)
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from database import get_db
from auth import verify_auth
from meta.syncer import sync_campaign_status, fetch_insights

router = APIRouter()


@router.post("/sync/{pub_id}")
async def sync_metrics(pub_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    """Sincroniza métricas de uma publicação específica."""
    pub = db.execute("SELECT * FROM meta_publicacoes WHERE id = ?", (pub_id,)).fetchone()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    pub = dict(pub)
    
    # Sincronizar status
    status_data = await sync_campaign_status(pub["meta_campaign_id"])
    db.execute(
        "UPDATE meta_publicacoes SET status_meta = ?, status_sync = 'synced', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (status_data.get("status", "UNKNOWN"), pub_id),
    )
    
    # Buscar insights
    insights = await fetch_insights(pub["meta_campaign_id"])
    
    for day in insights:
        # Upsert por (publicacao_id, data_referencia)
        existing = db.execute(
            "SELECT id FROM meta_metricas WHERE publicacao_id = ? AND data_referencia = ?",
            (pub_id, day["date"]),
        ).fetchone()
        
        if existing:
            db.execute(
                """UPDATE meta_metricas SET 
                   impressions=?, clicks=?, spend=?, reach=?, cpm=?, cpc=?, ctr=?,
                   conversions=?, cost_per_conversion=?, actions_json=?
                   WHERE id=?""",
                (day["impressions"], day["clicks"], day["spend"], day["reach"],
                 day["cpm"], day["cpc"], day["ctr"], day["conversions"],
                 day["cost_per_conversion"], day.get("actions_json"),
                 existing["id"]),
            )
        else:
            db.execute(
                """INSERT INTO meta_metricas 
                   (publicacao_id, data_referencia, impressions, clicks, spend, reach,
                    cpm, cpc, ctr, conversions, cost_per_conversion, actions_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""",
                (pub_id, day["date"], day["impressions"], day["clicks"], day["spend"],
                 day["reach"], day["cpm"], day["cpc"], day["ctr"], day["conversions"],
                 day["cost_per_conversion"], day.get("actions_json")),
            )
    
    db.commit()
    return {"ok": True, "days_synced": len(insights), "status": status_data}


@router.post("/sync-all")
async def sync_all_metrics(db=Depends(get_db), user=Depends(verify_auth)):
    """Sincroniza métricas de todas as publicações ativas."""
    pubs = db.execute(
        "SELECT id FROM meta_publicacoes WHERE status_meta IN ('ACTIVE', 'PAUSED')"
    ).fetchall()
    
    results = []
    for pub in pubs:
        try:
            result = await sync_metrics(pub["id"], db=db, user=user)
            results.append({"pub_id": pub["id"], "ok": True})
        except Exception as e:
            results.append({"pub_id": pub["id"], "ok": False, "error": str(e)})
    
    return {"synced": len(results), "results": results}


@router.get("/{pub_id}")
async def get_metrics(
    pub_id: int,
    days: int = 7,
    db=Depends(get_db),
    user=Depends(verify_auth),
):
    """Retorna métricas de uma publicação."""
    rows = db.execute(
        """SELECT * FROM meta_metricas 
           WHERE publicacao_id = ?
           ORDER BY data_referencia DESC 
           LIMIT ?""",
        (pub_id, days),
    ).fetchall()
    
    metrics = [dict(r) for r in rows]
    
    # Calcular totais
    totals = {
        "impressions": sum(m["impressions"] for m in metrics),
        "clicks": sum(m["clicks"] for m in metrics),
        "spend": sum(m["spend"] for m in metrics),
        "reach": sum(m["reach"] for m in metrics),
        "conversions": sum(m["conversions"] for m in metrics),
    }
    if totals["impressions"] > 0:
        totals["cpm"] = (totals["spend"] / totals["impressions"]) * 1000
        totals["ctr"] = (totals["clicks"] / totals["impressions"]) * 100
    if totals["clicks"] > 0:
        totals["cpc"] = totals["spend"] / totals["clicks"]
    if totals["conversions"] > 0:
        totals["cost_per_conversion"] = totals["spend"] / totals["conversions"]
    
    return {"daily": metrics, "totals": totals}


@router.get("/summary")
async def metrics_summary(db=Depends(get_db), user=Depends(verify_auth)):
    """Resumo geral de todas as campanhas."""
    row = db.execute(
        """SELECT 
             COUNT(DISTINCT publicacao_id) as campanhas,
             SUM(impressions) as total_impressions,
             SUM(clicks) as total_clicks,
             SUM(spend) as total_spend,
             SUM(conversions) as total_conversions
           FROM meta_metricas"""
    ).fetchone()
    return dict(row) if row else {}
