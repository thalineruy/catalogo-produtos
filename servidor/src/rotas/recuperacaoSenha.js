const express = require('express');

const logsRepositorio = require('../repositorios/logsRepositorio');
const solicitacoesRepositorio = require('../repositorios/solicitacoesRepositorio');
const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const email = require('../servicos/email');
const mensagensEmail = require('../servicos/mensagensEmail');
const { urlDoSistema } = require('../servicos/emissaoConvite');
const { criarLimitador } = require('../servicos/limitadorTentativas');

const router = express.Router();

const MOTIVOS_VALIDOS = ['Esqueci a senha', 'Perdi o acesso ao Google Authenticator', 'Troquei de celular'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sem freio, qualquer um poderia disparar centenas de pedidos: encheria o
// log de auditoria e, agora que há aviso por e-mail, a caixa de entrada
// dos administradores.
const limitador = criarLimitador({ limite: 5, janelaMs: 60 * 60 * 1000 });

// O aviso não pode atrasar nem derrubar a resposta a quem pediu.
async function avisarAdministradores({ endereco, motivo }) {
  try {
    const administradores = await usuariosRepositorio.listarEmailsDeAdministradores();
    if (administradores.length === 0) return;

    const base = urlDoSistema();
    const mensagem = mensagensEmail.pedidoDeAcesso({
      email: endereco,
      motivo,
      link: base ? `${base.replace(/\/+$/, '')}/administracao.html` : 'a tela de Administração',
    });

    await Promise.all(
      administradores.map((admin) => email.enviar({ para: admin.email, ...mensagem })),
    );
  } catch (erro) {
    console.error('falha ao avisar administradores sobre pedido de acesso', erro.message);
  }
}

// Rota pública: quem pede recuperação ainda não está autenticado.
// Não confirma nem nega se o e-mail existe no sistema, para não vazar
// quais contas estão cadastradas.
router.post('/', async (req, res, next) => {
  try {
    const controle = limitador.registrar(req.ip);
    if (!controle.permitido) {
      return res.status(429).json({
        erro: 'muitos pedidos deste endereço. Tente novamente em alguns minutos.',
      });
    }

    const { email: endereco, motivo } = req.body;

    if (!endereco || !EMAIL_REGEX.test(endereco)) {
      return res.status(400).json({ erro: 'informe um e-mail válido' });
    }
    if (!MOTIVOS_VALIDOS.includes(motivo)) {
      return res.status(400).json({ erro: 'motivo inválido' });
    }

    await solicitacoesRepositorio.registrar({ email: endereco, motivo });

    await logsRepositorio.registrar({
      usuarioId: null,
      tipo: 'Recuperação',
      detalhes: `Solicitou recuperação de senha (${motivo}) para o e-mail ${endereco}`,
    });

    avisarAdministradores({ endereco, motivo });

    res.status(201).json({
      mensagem: 'Pedido registrado. O administrador vai enviar um link de acesso para o seu e-mail.',
    });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
module.exports.limitador = limitador;
