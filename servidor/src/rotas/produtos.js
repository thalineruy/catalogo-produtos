const express = require('express');

const repositorio = require('../repositorios/produtosRepositorio');
const categoriasRepositorio = require('../repositorios/categoriasRepositorio');
const { aplicarFiltros } = require('../servicos/filtroProdutos');
const { validarProduto } = require('../servicos/validacaoProdutos');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const produtos = await repositorio.listar();
    res.json(aplicarFiltros(produtos, req.query));
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const produto = await repositorio.buscarPorId(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'produto não encontrado' });
    res.json(produto);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const erros = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const categoria = await categoriasRepositorio.buscarPorId(req.body.categoria_id);
    if (!categoria) return res.status(400).json({ erro: 'categoria informada não existe' });

    const existente = await repositorio.buscarPorCodigo(req.body.codigo_interno);
    if (existente) return res.status(409).json({ erro: 'já existe um produto com este código interno' });

    const produto = await repositorio.criar(req.body);
    res.status(201).json(produto);
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'produto não encontrado' });

    const erros = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const categoria = await categoriasRepositorio.buscarPorId(req.body.categoria_id);
    if (!categoria) return res.status(400).json({ erro: 'categoria informada não existe' });

    const duplicado = await repositorio.buscarPorCodigo(req.body.codigo_interno, req.params.id);
    if (duplicado) return res.status(409).json({ erro: 'já existe um produto com este código interno' });

    const produto = await repositorio.atualizar(req.params.id, req.body);
    res.json(produto);
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'produto não encontrado' });

    await repositorio.excluir(req.params.id);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
