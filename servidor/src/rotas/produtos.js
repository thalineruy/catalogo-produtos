const express = require('express');

const repositorio = require('../repositorios/produtosRepositorio');
const categoriasRepositorio = require('../repositorios/categoriasRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { validarProduto } = require('../servicos/validacaoProdutos');
const { autenticar } = require('../middleware/autenticacao');
const { lerPaginacao, montarResposta } = require('../servicos/paginacao');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const paginacao = lerPaginacao(req.query);
    const filtros = {
      busca: req.query.busca,
      categoria: req.query.categoria,
      estoque: req.query.estoque,
      status: req.query.status,
      imagem: req.query.imagem,
      porPagina: paginacao.porPagina,
      deslocamento: paginacao.deslocamento,
    };

    const linhas = await repositorio.listar(filtros);

    // Quem digitou certo recebe só o que casa exatamente. Se a busca não
    // achou nada, vale mais mostrar o parecido do que uma tela vazia: quem
    // procura "armasao" quer "Armação".
    if (linhas.length === 0 && (req.query.busca || '').trim()) {
      const aproximadas = await repositorio.listar({ ...filtros, tolerante: true });
      if (aproximadas.length > 0) {
        return res.json({ ...montarResposta(aproximadas, paginacao), aproximada: true });
      }
    }

    res.json(montarResposta(linhas, paginacao));
  } catch (erro) {
    next(erro);
  }
});

// As duas rotas abaixo precisam vir antes de "/:id", senão os nomes seriam
// lidos como se fossem o id de um produto.
router.get('/para-selecao', autenticar, async (req, res, next) => {
  try {
    res.json(await repositorio.listarParaSelecao());
  } catch (erro) {
    next(erro);
  }
});

router.get('/alertas-estoque', autenticar, async (req, res, next) => {
  try {
    res.json(await repositorio.listarAlertasDeEstoque());
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const produto = await repositorio.buscarPorId(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'produto não encontrado' });
    res.json(produto);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', autenticar, async (req, res, next) => {
  try {
    const erros = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const categoria = await categoriasRepositorio.buscarPorId(req.body.categoria_id);
    if (!categoria) return res.status(400).json({ erro: 'categoria informada não existe' });

    const existente = await repositorio.buscarPorCodigo(req.body.codigo_interno);
    if (existente) return res.status(409).json({ erro: 'já existe um produto com este código interno' });

    const produto = await repositorio.criar(req.body);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Cadastro',
        detalhes: `Cadastrou o produto "${produto.nome}" (${produto.codigo_interno})`,
      })
      .catch((erro) => console.error('falha ao registrar log de cadastro', erro));

    res.status(201).json(produto);
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id', autenticar, async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'produto não encontrado' });

    const erros = validarProduto(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const categoria = await categoriasRepositorio.buscarPorId(req.body.categoria_id);
    if (!categoria) return res.status(400).json({ erro: 'categoria informada não existe' });

    const duplicado = await repositorio.buscarPorCodigo(req.body.codigo_interno, req.params.id);
    if (duplicado) return res.status(409).json({ erro: 'já existe um produto com este código interno' });

    const produto = await repositorio.atualizar(req.params.id, req.body);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Editou o produto "${produto.nome}" (${produto.codigo_interno})`,
      })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.json(produto);
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', autenticar, async (req, res, next) => {
  try {
    const atual = await repositorio.buscarPorId(req.params.id);
    if (!atual) return res.status(404).json({ erro: 'produto não encontrado' });

    await repositorio.excluir(req.params.id);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Exclusão',
        detalhes: `Excluiu o produto "${atual.nome}" (${atual.codigo_interno})`,
      })
      .catch((erro) => console.error('falha ao registrar log de exclusão', erro));

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
