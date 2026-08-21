const express = require('express');

const { autenticar } = require('../middleware/autenticacao');
const { exigirAdministrador } = require('../middleware/autorizacao');
const repositorio = require('../repositorios/estatisticasRepositorio');
const { calcularEstatisticas } = require('../servicos/calculadoraEstatisticas');

const router = express.Router();

router.get('/', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const [produtos, categorias, saidas] = await Promise.all([
      repositorio.buscarProdutos(),
      repositorio.buscarCategorias(),
      repositorio.buscarSaidas(),
    ]);

    res.json(calcularEstatisticas({ produtos, categorias, saidas }));
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
