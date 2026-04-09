"""
CRUD de Produtos.
"""
import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_auth

router = APIRouter()


class ProdutoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: Optional[float] = None
    url_vendas: Optional[str] = None


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[float] = None
    url_vendas: Optional[str] = None
    ativo: Optional[bool] = None


@router.get("/")
async def listar_produtos(db=Depends(get_db), user=Depends(verify_auth)):
    rows = db.execute("SELECT * FROM produtos WHERE ativo = TRUE ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


@router.post("/", status_code=201)
async def criar_produto(data: ProdutoCreate, db=Depends(get_db), user=Depends(verify_auth)):
    cursor = db.execute(
        "INSERT INTO produtos (nome, descricao, preco, url_vendas) VALUES (?, ?, ?, ?) RETURNING id",
        (data.nome, data.descricao, data.preco, data.url_vendas),
    )
    db.commit()
    return {"id": cursor.lastrowid, **data.model_dump()}


@router.get("/{produto_id}")
async def detalhe_produto(produto_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    row = db.execute("SELECT * FROM produtos WHERE id = ?", (produto_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return dict(row)


@router.put("/{produto_id}")
async def atualizar_produto(produto_id: int, data: ProdutoUpdate, db=Depends(get_db), user=Depends(verify_auth)):
    campos = {k: v for k, v in data.model_dump().items() if v is not None}
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    sets = ", ".join(f"{k} = ?" for k in campos)
    values = list(campos.values()) + [produto_id]
    db.execute(f"UPDATE produtos SET {sets} WHERE id = ?", values)
    db.commit()
    return {"ok": True}


@router.delete("/{produto_id}")
async def deletar_produto(produto_id: int, db=Depends(get_db), user=Depends(verify_auth)):
    db.execute("UPDATE produtos SET ativo = FALSE WHERE id = ?", (produto_id,))
    db.commit()
    return {"ok": True}
