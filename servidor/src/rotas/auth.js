const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'email e senha são obrigatórios' });
    }

    const usuario = await usuariosRepositorio.buscarPorEmail(email);
    const senhaValida = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;

    if (!usuario || !senhaValida) {
      return res.status(401).json({ erro: 'email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, nivel: usuario.nivel },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    logsRepositorio
      .registrar({ usuarioId: usuario.id, tipo: 'Acesso', detalhes: `Login realizado por ${usuario.nome}` })
      .catch((erro) => console.error('falha ao registrar log de acesso', erro));

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, nivel: usuario.nivel } });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
