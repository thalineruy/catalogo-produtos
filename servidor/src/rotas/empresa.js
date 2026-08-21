const express = require('express');
const multer = require('multer');

const empresaRepositorio = require('../repositorios/empresaRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { autenticar } = require('../middleware/autenticacao');
const { exigirAdministrador } = require('../middleware/autorizacao');
const { validarDadosEmpresa } = require('../servicos/validacaoEmpresa');
const {
  validarArquivoLogotipo,
  enviarLogotipo,
  TAMANHO_MAXIMO_BYTES,
} = require('../servicos/armazenamentoLogotipo');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAXIMO_BYTES } });

router.get('/', autenticar, async (req, res, next) => {
  try {
    const empresa = await empresaRepositorio.buscar();
    if (!empresa) return res.status(404).json({ erro: 'dados da empresa não cadastrados' });
    res.json(empresa);
  } catch (erro) {
    next(erro);
  }
});

router.put('/', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const erros = validarDadosEmpresa(req.body);
    if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

    const empresa = await empresaRepositorio.atualizar(req.body);

    logsRepositorio
      .registrar({ usuarioId: req.usuario.id, tipo: 'Edição', detalhes: 'Atualizou os dados da empresa' })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.json(empresa);
  } catch (erro) {
    next(erro);
  }
});

router.post(
  '/logotipo',
  autenticar,
  exigirAdministrador,
  (req, res, next) => {
    upload.single('logotipo')(req, res, (erroUpload) => {
      if (erroUpload) {
        return res.status(400).json({ erro: 'arquivo inválido: verifique o formato e o tamanho (máx. 2 MB)' });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const erroValidacao = validarArquivoLogotipo(req.file);
      if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

      const url = await enviarLogotipo(req.file);
      const empresa = await empresaRepositorio.atualizarLogotipo(url);

      logsRepositorio
        .registrar({ usuarioId: req.usuario.id, tipo: 'Edição', detalhes: 'Atualizou o logotipo da empresa' })
        .catch((erro) => console.error('falha ao registrar log de edição', erro));

      res.json(empresa);
    } catch (erro) {
      next(erro);
    }
  },
);

module.exports = router;
