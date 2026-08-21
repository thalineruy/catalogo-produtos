const express = require('express');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const { autenticar } = require('../middleware/autenticacao');

const router = express.Router();

router.get('/', autenticar, async (req, res, next) => {
  try {
    res.json(await usuariosRepositorio.listar());
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
