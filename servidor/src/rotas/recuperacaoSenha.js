const express = require('express');

const logsRepositorio = require('../repositorios/logsRepositorio');

const router = express.Router();

const MOTIVOS_VALIDOS = ['Esqueci a senha', 'Perdi o acesso ao Google Authenticator', 'Troquei de celular'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rota pública: quem pede recuperação ainda não está autenticado.
// Não confirma nem nega se o e-mail existe no sistema, para não vazar
// quais contas estão cadastradas.
router.post('/', async (req, res, next) => {
  try {
    const { email, motivo } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ erro: 'informe um e-mail válido' });
    }
    if (!MOTIVOS_VALIDOS.includes(motivo)) {
      return res.status(400).json({ erro: 'motivo inválido' });
    }

    await logsRepositorio.registrar({
      usuarioId: null,
      tipo: 'Recuperação',
      detalhes: `Solicitou recuperação de senha (${motivo}) para o e-mail ${email}`,
    });

    res.status(201).json({ mensagem: 'Pedido registrado. O administrador vai enviar uma senha temporária.' });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
