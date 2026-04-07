"""
CRUD de Personas.
"""
import json
import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from database import get_db
from auth import verify_auth

router = APIRouter()


class PersonaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    faixa_etaria: Optional[str] = None
    interesses: List[str] = Field(default_factory=list)
    dores: List[str] = Field(default_factory=list)
    objetivos: List[str] = Field(default_factory=list)


class PersonaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    faixa_etaria: Optional[str] = None
    interesses: Optional[List[str]] = None
    dores: Optional[List[str]] = None
    objetivos: Optional[List[str]] = None


def _serialize_list(value):
    """Serializa lista para JSON string."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def _deserialize_list(value):
    """Desserializa JSON string para lista."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []


@router.get("/")
async def listar_personas(db=Depends(get_db), user=Depends(verify_auth)):
    rows = db.execute("SELECT * FROM personas ORDER BY created_at DESC").fetchall()
    result = []
    for r in rows:
        row_dict = dict(r)
        row_dict["interesses"] = _deserialize_list(row_dict.get("interesses"))
        row_dict["dores"] = _deserialize_list(row_dict.get("dores"))
        row_dict["objetivos"] = _deserialize_list(row_dict.get("objetivos"))
        result.append(row_dict)
    return result


@router.post("/", status_code=201)
async def criar_persona(data: PersonaCreate, db=Depends(get_db), user=Depends(verify_auth)):
    cursor = db.execute(
        "INSERT INTO personas (nome, descricao, faixa_etaria, interesses, dores, objetivos) VALUES (?, ?, ?, ?, ?, ?)",
        (
            data.nome,
            data.descricao,
            data.faixa_etaria,
            _serialize_list(data.interesses),
            _serialize_list(data.dores),
            _serialize_list(data.objetivos),
        ),
    )
    db.commit()
    return {
        "id": cursor.lastrowid,
        "nome": data.nome,
        "descricao": data.descricao,
        "faixa_etaria": data.faixa_etaria,
        "interesses": data.interesses,
        "dores": data.dores,
        "objetivos": data.objetivos,
    }


@router.get("/{persona_id}")
async def detalhe_persona(persona_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    row = db.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Persona não encontrada")
    row_dict = dict(row)
    row_dict["interesses"] = _deserialize_list(row_dict.get("interesses"))
    row_dict["dores"] = _deserialize_list(row_dict.get("dores"))
    row_dict["objetivos"] = _deserialize_list(row_dict.get("objetivos"))
    return row_dict


@router.put("/{persona_id}")
async def atualizar_persona(persona_id: int, data: PersonaUpdate, db=Depends(get_db), user=Depends(verify_auth)):
    campos = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k in ("interesses", "dores", "objetivos"):
                campos[k] = _serialize_list(v)
            else:
                campos[k] = v
    
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    
    sets = ", ".join(f"{k} = ?" for k in campos)
    values = list(campos.values()) + [persona_id]
    db.execute(f"UPDATE personas SET {sets} WHERE id = ?", values)
    db.commit()
    return {"ok": True}


@router.delete("/{persona_id}")
async def deletar_persona(persona_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("DELETE FROM personas WHERE id = ?", (persona_id,))
    db.commit()
    return {"ok": True}
