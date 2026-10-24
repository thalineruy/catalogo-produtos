const express = require('express');

const solicitacoesRepositorio = require('../repositorios/solicitacoesRepositorio');
const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { autenticar } = require('../middleware/autenticacao');
const { exigirAdministrador } = require('../middleware/autorizacao');
const { lerPaginacao, montarResposta } = require('../servicos/paginacao');

const router = express.Router();

// Lista curta, fora da paginação, para a contagem do sino.
// Precisa vir antes de qualquer rota com parâmetro.
router.get('/pendentes', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const total = await solicitacoesRepositorio.contarPendentes();
    res.json({ total });
  } catch (erro) {
    next(erro);
  }
});

router.get('/', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const paginacao = lerPaginacao(req.query);
    const linhas = await solicitacoesRepositorio.listar(paginacao);
    res.json(montarResposta(linhas, paginacao));
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id/atendida', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const atendida = await solicitacoesRepositorio.marcarAtendida(req.params.id, req.usuario.id);
    if (!atendida) {
      return res.status(404).json({ erro: 'solicitação não encontrada ou já atendida' });
    }

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Atendeu o pedido de acesso de ${atendida.email} (${atendida.motivo})`,
      })
      .catch((erro) => console.error('falha ao registrar log de atendimento', erro));

    res.json(atendida);
  } catch (erro) {
    next(erro);
  }
});

/* Apaga o e-mail de quem pediu acesso.

   Esses pedidos vêm de gente que muitas vezes nem tem conta: o endereço
   é digitado na tela de entrada, antes de qualquer cadastro. A
   anonimização da lista de usuários não alcança esse dado, e sem esta
   rota ele ficaria guardado para sempre. */
router.post('/:id/anonimizar', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const pedido = await solicitacoesRepositorio.buscarPorId(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'solicitação não encontrada' });

    if (pedido.anonimizado_em) {
      return res.status(409).json({ erro: 'este pedido já foi anonimizado' });
    }

    // Com conta, o mesmo e-mail está também na tabela de usuários, e
    // limpar só aqui deixaria o trabalho pela metade. A anonimização da
    // conta já cobre os pedidos dela junto.
    const contaComMesmoEmail = await usuariosRepositorio.buscarPorEmail(pedido.email);
    if (contaComMesmoEmail) {
      return res.status(409).json({
        erro: 'este e-mail também tem conta no sistema; anonimize a conta em Gerenciar Usuários, que os pedidos dela são limpos junto',
      });
    }

    const resultado = await solicitacoesRepositorio.anonimizar(req.params.id, {
      emailAnonimo: 'anonimizado@removido.invalid',
    });
    if (!resultado) return res.status(404).json({ erro: 'solicitação não encontrada' });

    // Sem o e-mail: escrevê-lo aqui devolveria ao histórico o dado que
    // acabou de sair dele.
    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Exclusão',
        detalhes: `Anonimizou o pedido de acesso de código ${pedido.id} (e-mail removido)`,
      })
      .catch((erro) => console.error('falha ao registrar log de anonimização de pedido', erro));

    res.json({ anonimizado: true, ...resultado });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
