const express = require('express');

const repositorio = require('../repositorios/categoriasRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { autenticar } = require('../middleware/autenticacao');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await repositorio.listar());
  } catch (erro) {
    next(erro);
  }
});

router.post('/', autenticar, async (req, res, next) => {
  try {
    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

    const existente = await repositorio.buscarPorNome(nome);
    if (existente) return res.status(409).json({ erro: 'já existe uma categoria com este nome' });

    const categoria = await repositorio.criar(nome);

    logsRepositorio
      .registrar({ usuarioId: req.usuario.id, tipo: 'Cadastro', detalhes: `Cadastrou a categoria "${categoria.nome}"` })
      .catch((erro) => console.error('falha ao registrar log de cadastro', erro));

    res.status(201).json(categoria);
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id', autenticar, async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'categoria não encontrada' });

    const nome = (req.body.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });

    const duplicado = await repositorio.buscarPorNome(nome, req.params.id);
    if (duplicado) return res.status(409).json({ erro: 'já existe uma categoria com este nome' });

    const categoria = await repositorio.atualizar(req.params.id, nome);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Renomeou a categoria "${atual.nome}" para "${categoria.nome}"`,
      })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.json(categoria);
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', autenticar, async (req, res, next) => {
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

    logsRepositorio
      .registrar({ usuarioId: req.usuario.id, tipo: 'Exclusão', detalhes: `Excluiu a categoria "${atual.nome}"` })
      .catch((erro) => console.error('falha ao registrar log de exclusão', erro));

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
