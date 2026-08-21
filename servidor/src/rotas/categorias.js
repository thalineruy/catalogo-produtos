const express = require('express');

const repositorio = require('../repositorios/categoriasRepositorio');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await repositorio.listar());
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

    const existente = await repositorio.buscarPorNome(nome);
    if (existente) return res.status(409).json({ erro: 'já existe uma categoria com este nome' });

    const categoria = await repositorio.criar(nome);
    res.status(201).json(categoria);
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'categoria não encontrada' });

    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

    const duplicado = await repositorio.buscarPorNome(nome, req.params.id);
    if (duplicado) return res.status(409).json({ erro: 'já existe uma categoria com este nome' });

    const categoria = await repositorio.atualizar(req.params.id, nome);
    res.json(categoria);
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'categoria não encontrada' });

    const total = await repositorio.contarProdutosVinculados(req.params.id);
    if (total > 0) {
      return res
        .status(409)
        .json({ erro: `não é possível excluir: existem ${total} produto(s) vinculado(s) a esta categoria` });
    }

    await repositorio.excluir(req.params.id);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
