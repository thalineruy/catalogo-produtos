const express = require('express');

const empresaRepositorio = require('../repositorios/empresaRepositorio');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const empresa = await empresaRepositorio.buscar();
    if (!empresa) return res.status(404).json({ erro: 'dados da empresa não cadastrados' });
    res.json(empresa);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
