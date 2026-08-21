const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const dispositivosRepositorio = require('../repositorios/dispositivosConfiaveisRepositorio');
const totp = require('../servicos/totp');
const dispositivoConfiavel = require('../servicos/dispositivoConfiavel');

const router = express.Router();

const EMISSOR_TOTP = 'Catálogo de Produtos';

function assinarSessao(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, nivel: usuario.nivel },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

async function montarConfiguracaoTotp(usuario) {
  if (usuario.totp_confirmado_em) return null;

  let secret = usuario.totp_secret;
  if (!secret) {
    secret = totp.gerarSegredo();
    await usuariosRepositorio.salvarTotpSecret(usuario.id, secret);
  }

  const qrCodeDataUrl = await totp.gerarQrCodeDataUrl({ email: usuario.email, secret, emissor: EMISSOR_TOTP });
  return { qrCodeDataUrl, chaveManual: secret };
}

router.post('/', async (req, res, next) => {
  try {
    const { email, senha, dispositivoToken } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'email e senha são obrigatórios' });
    }

    const usuario = await usuariosRepositorio.buscarPorEmail(email);
    const senhaValida = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;

    if (!usuario || !senhaValida) {
      return res.status(401).json({ erro: 'email ou senha inválidos' });
    }

    if (dispositivoToken) {
      const dispositivo = await dispositivosRepositorio.buscarValido({
        usuarioId: usuario.id,
        tokenHash: dispositivoConfiavel.hashToken(dispositivoToken),
      });

      if (dispositivo) {
        const token = assinarSessao(usuario);

        logsRepositorio
          .registrar({ usuarioId: usuario.id, tipo: 'Acesso', detalhes: `Login realizado por ${usuario.nome} (dispositivo confiável)` })
          .catch((erro) => console.error('falha ao registrar log de acesso', erro));

        return res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, nivel: usuario.nivel } });
      }
    }

    const configuracao = await montarConfiguracaoTotp(usuario);
    const tokenPendente = jwt.sign({ id: usuario.id, pendente: true }, process.env.JWT_SECRET, { expiresIn: '5m' });

    res.json({ pendente: true, tokenPendente, configuracao });
  } catch (erro) {
    next(erro);
  }
});

router.post('/verificar-codigo', async (req, res, next) => {
  try {
    const { tokenPendente, codigo, confiarDispositivo } = req.body;
    if (!tokenPendente || !codigo) {
      return res.status(400).json({ erro: 'código de verificação é obrigatório' });
    }

    let payload;
    try {
      payload = jwt.verify(tokenPendente, process.env.JWT_SECRET);
    } catch (erro) {
      return res.status(401).json({ erro: 'sessão de verificação expirada, faça login novamente' });
    }
    if (!payload.pendente) {
      return res.status(401).json({ erro: 'sessão de verificação inválida' });
    }

    const usuario = await usuariosRepositorio.buscarPorId(payload.id);
    if (!usuario || !usuario.totp_secret) {
      return res.status(401).json({ erro: 'sessão de verificação inválida' });
    }

    if (!totp.verificarCodigo({ codigo, secret: usuario.totp_secret })) {
      return res.status(401).json({ erro: 'código inválido' });
    }

    if (!usuario.totp_confirmado_em) {
      await usuariosRepositorio.confirmarTotp(usuario.id);
    }

    let dispositivoToken;
    if (confiarDispositivo) {
      dispositivoToken = dispositivoConfiavel.gerarToken();
      await dispositivosRepositorio.criar({
        usuarioId: usuario.id,
        tokenHash: dispositivoConfiavel.hashToken(dispositivoToken),
        expiraEm: dispositivoConfiavel.calcularExpiracao(),
      });
    }

    const token = assinarSessao(usuario);

    logsRepositorio
      .registrar({ usuarioId: usuario.id, tipo: 'Acesso', detalhes: `Login com verificação em duas etapas realizado por ${usuario.nome}` })
      .catch((erro) => console.error('falha ao registrar log de acesso', erro));

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, nivel: usuario.nivel },
      ...(dispositivoToken ? { dispositivoToken } : {}),
    });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
