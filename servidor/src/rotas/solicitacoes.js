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

module.exports = router;
