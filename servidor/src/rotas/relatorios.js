const express = require('express');

const { autenticar } = require('../middleware/autenticacao');
const relatoriosRepositorio = require('../repositorios/relatoriosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { validarCampos, construirRelatorio } = require('../servicos/construtorRelatorio');
const { aplicarFiltrosRelatorio } = require('../servicos/filtroRelatorio');

const router = express.Router();

router.get('/saidas', autenticar, async (req, res, next) => {
  try {
    const validacao = validarCampos(req.query.campos);
    if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

    const todasSaidas = await relatoriosRepositorio.buscarSaidasParaRelatorio();
    const saidasFiltradas = aplicarFiltrosRelatorio(todasSaidas, {
      dataInicial: req.query.dataInicial,
      dataFinal: req.query.dataFinal,
      operador: req.query.operador,
      categoria: req.query.categoria,
      estoqueMinimo: req.query.estoqueMinimo,
    });

    const relatorio = construirRelatorio(saidasFiltradas, validacao.chaves);

    logsRepositorio
      .registrar({ usuarioId: req.usuario.id, tipo: 'Relatório', detalhes: 'Emitiu o relatório de saídas' })
      .catch((erro) => console.error('falha ao registrar log de relatório', erro));

    res.json(relatorio);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
