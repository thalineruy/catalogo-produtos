const express = require('express');

const { autenticar } = require('../middleware/autenticacao');
const saidasRepositorio = require('../repositorios/saidasRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { validarSaida } = require('../servicos/validacaoSaida');

const router = express.Router();

router.post('/', autenticar, async (req, res, next) => {
  try {
    const erros = validarSaida(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const resultado = await saidasRepositorio.registrarSaida({
      produtoId: req.body.produto_id,
      quantidade: Number(req.body.quantidade),
      motivo: req.body.motivo,
      observacao: req.body.observacao,
      usuarioId: req.usuario.id,
    });

    if (resultado.tipo === 'produto_nao_encontrado') {
      return res.status(404).json({ erro: 'produto não encontrado' });
    }
    if (resultado.tipo === 'estoque_insuficiente') {
      return res.status(409).json({
        erro: `estoque insuficiente: existem apenas ${resultado.disponivel} unidade(s) disponível(is)`,
      });
    }

    res.status(201).json(resultado.saida);
  } catch (erro) {
    next(erro);
  }
});

router.get('/', autenticar, async (req, res, next) => {
  try {
    const saidas = await saidasRepositorio.listar({
      produtoId: req.query.produto,
      categoria: req.query.categoria,
      operador: req.query.operador,
      inicio: req.query.inicio,
      fim: req.query.fim,
    });

    logsRepositorio
      .registrar({ usuarioId: req.usuario.id, tipo: 'Relatório', detalhes: 'Consultou o histórico de saídas' })
      .catch((erro) => console.error('falha ao registrar log de relatório', erro));

    res.json(saidas);
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
