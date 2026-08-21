const express = require('express');
const bcrypt = require('bcrypt');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const dispositivosRepositorio = require('../repositorios/dispositivosConfiaveisRepositorio');
const { autenticar } = require('../middleware/autenticacao');
const { exigirAdministrador } = require('../middleware/autorizacao');
const { gerarSenhaTemporaria } = require('../servicos/geradorSenha');
const { conferirSenha } = require('../servicos/validacaoSenha');

const router = express.Router();
const NIVEIS_VALIDOS = ['administrador', 'operador'];

// Dados da própria conta, usados pelo aviso de senha no menu.
// Precisa vir antes de "/:id" para o "eu" não ser lido como um id.
router.get('/eu', autenticar, async (req, res, next) => {
  try {
    const usuario = await usuariosRepositorio.buscarPorId(req.usuario.id);
    if (!usuario) return res.status(404).json({ erro: 'usuário não encontrado' });

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      nivel: usuario.nivel,
      senha_atualizada_em: usuario.senha_atualizada_em,
    });
  } catch (erro) {
    next(erro);
  }
});

// Troca da própria senha: exige a senha atual, para que uma sessão
// esquecida aberta não permita tomar a conta.
router.put('/eu/senha', autenticar, async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'informe a senha atual e a nova senha' });
    }

    const usuario = await usuariosRepositorio.buscarPorIdComSenha(req.usuario.id);
    if (!usuario) return res.status(404).json({ erro: 'usuário não encontrado' });

    const confere = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!confere) return res.status(401).json({ erro: 'senha atual incorreta' });

    const pendentes = conferirSenha(novaSenha, { nome: usuario.nome, email: usuario.email });
    if (pendentes.length) {
      return res.status(400).json({ erro: `a nova senha precisa de: ${pendentes.join('; ')}` });
    }

    const igualAAtual = await bcrypt.compare(novaSenha, usuario.senha_hash);
    if (igualAAtual) {
      return res.status(400).json({ erro: 'a nova senha precisa ser diferente da atual' });
    }

    await usuariosRepositorio.atualizarSenha(usuario.id, await bcrypt.hash(novaSenha, 10));

    logsRepositorio
      .registrar({ usuarioId: usuario.id, tipo: 'Edição', detalhes: `${usuario.nome} trocou a própria senha` })
      .catch((erro) => console.error('falha ao registrar log de troca de senha', erro));

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

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

router.delete('/:id/totp', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });

    await usuariosRepositorio.limparTotp(req.params.id);
    await dispositivosRepositorio.excluirPorUsuario(req.params.id);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Removeu a verificação em duas etapas de ${alvo.nome}`,
      })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.status(204).send();
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
