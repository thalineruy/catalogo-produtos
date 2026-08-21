const express = require('express');
const bcrypt = require('bcrypt');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const { autenticar } = require('../middleware/autenticacao');
const { exigirAdministrador } = require('../middleware/autorizacao');
const { gerarSenhaTemporaria } = require('../servicos/geradorSenha');

const router = express.Router();
const NIVEIS_VALIDOS = ['administrador', 'operador'];

router.get('/', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    res.json(await usuariosRepositorio.listar());
  } catch (erro) {
    next(erro);
  }
});

router.post('/', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const { nome, email, nivel } = req.body;

    if (!nome || !email || !nivel) {
      return res.status(400).json({ erro: 'nome, email e nível são obrigatórios' });
    }
    if (!NIVEIS_VALIDOS.includes(nivel)) {
      return res.status(400).json({ erro: 'nível deve ser administrador ou operador' });
    }

    const existente = await usuariosRepositorio.buscarPorEmail(email);
    if (existente) return res.status(409).json({ erro: 'já existe um usuário com este email' });

    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);
    const usuario = await usuariosRepositorio.criar({ nome, email, nivel, senhaHash });

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Cadastro',
        detalhes: `Cadastrou o usuário ${nome} (${email})`,
      })
      .catch((erro) => console.error('falha ao registrar log de cadastro', erro));

    res.status(201).json({ ...usuario, senhaTemporaria });
  } catch (erro) {
    next(erro);
  }
});

router.put('/:id/nivel', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const { nivel } = req.body;
    if (!NIVEIS_VALIDOS.includes(nivel)) {
      return res.status(400).json({ erro: 'nível deve ser administrador ou operador' });
    }

    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });

    if (String(alvo.id) === String(req.usuario.id) && nivel !== 'administrador') {
      return res.status(409).json({ erro: 'você não pode rebaixar a própria conta de administrador' });
    }

    const usuario = await usuariosRepositorio.atualizarNivel(req.params.id, nivel);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Alterou o nível de ${alvo.nome} para ${nivel}`,
      })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.json(usuario);
  } catch (erro) {
    next(erro);
  }
});

router.post('/:id/reset-senha', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });

    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);
    await usuariosRepositorio.atualizarSenha(req.params.id, senhaHash);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Gerou senha temporária para ${alvo.nome}`,
      })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.json({ senhaTemporaria });
  } catch (erro) {
    next(erro);
  }
});

router.delete('/:id', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });

    if (String(alvo.id) === String(req.usuario.id)) {
      return res.status(409).json({ erro: 'você não pode excluir a própria conta' });
    }

    await usuariosRepositorio.excluir(req.params.id);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Exclusão',
        detalhes: `Excluiu o usuário ${alvo.nome} (${alvo.email})`,
      })
      .catch((erro) => console.error('falha ao registrar log de exclusão', erro));

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
