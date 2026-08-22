const express = require('express');
const bcrypt = require('bcrypt');

const convitesRepositorio = require('../repositorios/convitesRepositorio');
const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { hashToken } = require('../servicos/convite');
const { conferirSenha } = require('../servicos/validacaoSenha');
const { criarLimitador } = require('../servicos/limitadorTentativas');

const router = express.Router();

// Rota pública: quem chega aqui ainda não tem senha. O limite existe para
// que ninguém fique tentando adivinhar tokens.
const limitador = criarLimitador({ limite: 20, janelaMs: 60 * 60 * 1000 });

// Devolve o convite só se ele existir, não tiver sido usado e não tiver
// expirado. Qualquer um dos três casos responde igual, para não contar a
// quem tenta quais tokens existem.
async function convitePorToken(token) {
  if (!token || typeof token !== 'string') return null;
  const convite = await convitesRepositorio.buscarPorTokenHash(hashToken(token));
  if (!convite) return null;
  if (convite.usado_em) return null;
  if (new Date(convite.expira_em).getTime() < Date.now()) return null;
  return convite;
}

// A tela de ativação chama isto antes de mostrar o formulário, para não
// pedir uma senha que já se sabe que não vai ser aceita.
router.post('/validar', async (req, res, next) => {
  try {
    const controle = limitador.registrar(req.ip);
    if (!controle.permitido) {
      return res.status(429).json({ erro: 'muitas tentativas, tente novamente mais tarde' });
    }

    const convite = await convitePorToken(req.body && req.body.token);
    if (!convite) return res.status(400).json({ erro: 'link inválido ou expirado' });

    res.json({ nome: convite.usuario_nome, email: convite.usuario_email });
  } catch (erro) {
    next(erro);
  }
});

router.post('/definir-senha', async (req, res, next) => {
  try {
    const controle = limitador.registrar(req.ip);
    if (!controle.permitido) {
      return res.status(429).json({ erro: 'muitas tentativas, tente novamente mais tarde' });
    }

    const { token, senha } = req.body || {};

    const convite = await convitePorToken(token);
    if (!convite) return res.status(400).json({ erro: 'link inválido ou expirado' });

    const problemas = conferirSenha(senha, {
      nome: convite.usuario_nome,
      email: convite.usuario_email,
    });
    if (problemas.length > 0) return res.status(400).json({ erro: problemas[0], problemas });

    const senhaHash = await bcrypt.hash(senha, 10);
    await usuariosRepositorio.atualizarSenha(convite.usuario_id, senhaHash);
    await convitesRepositorio.marcarUsado(convite.id);

    logsRepositorio
      .registrar({
        usuarioId: convite.usuario_id,
        tipo: 'Acesso',
        detalhes: 'Definiu a senha pelo link de ativação',
      })
      .catch((erro) => console.error('falha ao registrar log de ativação', erro));

    res.json({ mensagem: 'senha definida' });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
module.exports.limitador = limitador;
