const express = require('express');

const { autenticar } = require('../middleware/autenticacao');
const logsRepositorio = require('../repositorios/logsRepositorio');

const router = express.Router();

router.get('/', autenticar, async (req, res, next) => {
  try {
    const logs = await logsRepositorio.listar({
      usuarioIdSolicitante: req.usuario.id,
      nivelSolicitante: req.usuario.nivel,
      operador: req.query.operador,
      tipo: req.query.tipo,
      inicio: req.query.inicio,
      fim: req.query.fim,
    });

    logsRepositorio
      .registrar({ usuarioId: req.usuario.id, tipo: 'Relatório', detalhes: 'Consultou o histórico de logs' })
      .catch((erro) => console.error('falha ao registrar log de relatório', erro));

    res.json(logs);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
