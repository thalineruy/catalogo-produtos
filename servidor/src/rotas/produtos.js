const express = require('express');
const multer = require('multer');

const repositorio = require('../repositorios/produtosRepositorio');
const categoriasRepositorio = require('../repositorios/categoriasRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { validarProduto } = require('../servicos/validacaoProdutos');
const { autenticar } = require('../middleware/autenticacao');
const { lerPaginacao, montarResposta } = require('../servicos/paginacao');
const {
  validarImagemProduto,
  enviarImagemProduto,
  removerImagemProduto,
  TAMANHO_MAXIMO_BYTES,
} = require('../servicos/armazenamentoImagemProduto');

const router = express.Router();

// Na memória, e não em disco: o arquivo é conferido e repassado adiante sem
// nunca encostar no sistema de arquivos do servidor.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_BYTES },
});

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

// Recebe a imagem já ajustada pelo navegador e devolve o endereço público.
// Não recebe o id do produto de propósito: assim o mesmo caminho serve para
// um produto que está sendo criado, que ainda não tem id, e para outro que
// já existe. Quem grava o endereço é o salvamento do produto.
router.post(
  '/imagem',
  autenticar,
  (req, res, next) => {
    upload.single('imagem')(req, res, (erroUpload) => {
      if (erroUpload) {
        return res
          .status(400)
          .json({ erro: 'arquivo inválido: verifique o formato e o tamanho (máx. 1 MB)' });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const erroValidacao = validarImagemProduto(req.file);
      if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

      const url = await enviarImagemProduto(req.file);
      res.status(201).json({ url });
    } catch (erro) {
      // Falha do armazenamento não é defeito do sistema: é configuração
      // faltando, e quem está cadastrando precisa saber disso.
      if (erro.deArmazenamento) {
        return res.status(502).json({ erro: `Não foi possível guardar a imagem: ${erro.message}` });
      }
      next(erro);
    }
  },
);

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

    // Trocar a imagem apaga a anterior: guardar as duas ocuparia espaço sem
    // servir para nada, já que só uma aparece. A limpeza não desfaz a troca
    // se falhar, e imagem de terceiros é ignorada.
    if (atual.url_imagem && atual.url_imagem !== produto.url_imagem) {
      removerImagemProduto(atual.url_imagem);
    }

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
    if (atual.url_imagem) removerImagemProduto(atual.url_imagem);

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
