"""
CRUD de Prompt Templates editáveis.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth

router = APIRouter()


class TemplateCreate(BaseModel):
    nome: str
    tipo_campanha: str
    template_gerador: str
    template_revisor: str


class TemplateUpdate(BaseModel):
    nome: Optional[str] = None
    tipo_campanha: Optional[str] = None
    template_gerador: Optional[str] = None
    template_revisor: Optional[str] = None
    ativo: Optional[bool] = None


@router.get("/")
async def listar_templates(db=Depends(get_db), user=Depends(verify_auth)):
    rows = db.execute("SELECT * FROM prompt_templates WHERE ativo = 1 ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


@router.post("/", status_code=201)
async def criar_template(data: TemplateCreate, db=Depends(get_db), user=Depends(verify_auth)):
    cursor = db.execute(
        "INSERT INTO prompt_templates (nome, tipo_campanha, template_gerador, template_revisor) VALUES (?, ?, ?, ?)",
        (data.nome, data.tipo_campanha, data.template_gerador, data.template_revisor),
    )
    db.commit()
    return {"id": cursor.lastrowid, **data.model_dump()}


@router.get("/defaults")
async def templates_default(user=Depends(verify_auth)):
    """Retorna os templates default do sistema."""
    from agents.copy_pipeline import PROMPT_GERADOR, PROMPT_REVISOR
    return {
        "template_gerador": PROMPT_GERADOR,
        "template_revisor": PROMPT_REVISOR,
    }


@router.get("/{template_id}")
async def detalhe_template(template_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    row = db.execute("SELECT * FROM prompt_templates WHERE id = ?", (template_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return dict(row)


@router.put("/{template_id}")
async def atualizar_template(template_id: int, data: TemplateUpdate, db=Depends(get_db), user=Depends(verify_auth)):
    campos = {k: v for k, v in data.model_dump().items() if v is not None}
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    sets = ", ".join(f"{k} = ?" for k in campos)
    values = list(campos.values()) + [template_id]
    db.execute(f"UPDATE prompt_templates SET {sets} WHERE id = ?", values)
    db.commit()
    return {"ok": True}


@router.delete("/{template_id}")
async def deletar_template(template_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("UPDATE prompt_templates SET ativo = 0 WHERE id = ?", (template_id,))
    db.commit()
    return {"ok": True}
