const express = require('express');
const bcrypt = require('bcrypt');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');
const logsRepositorio = require('../repositorios/logsRepositorio');
const dispositivosRepositorio = require('../repositorios/dispositivosConfiaveisRepositorio');
const { autenticar } = require('../middleware/autenticacao');
const { exigirAdministrador } = require('../middleware/autorizacao');
const { gerarSenhaTemporaria } = require('../servicos/geradorSenha');
const { conferirSenha } = require('../servicos/validacaoSenha');
const empresaRepositorio = require('../repositorios/empresaRepositorio');
const emissaoConvite = require('../servicos/emissaoConvite');

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

    // A conta nasce com uma senha aleatória que ninguém conhece: quem
    // define a senha de verdade é a própria pessoa, pelo link do convite.
    // Assim nenhuma senha utilizável trafega por e-mail nem aparece na
    // tela do administrador.
    const senhaHash = await bcrypt.hash(gerarSenhaTemporaria(), 10);
    const usuario = await usuariosRepositorio.criar({ nome, email, nivel, senhaHash });

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Cadastro',
        detalhes: `Cadastrou o usuário ${nome} (${email})`,
      })
      .catch((erro) => console.error('falha ao registrar log de cadastro', erro));

    const empresa = await empresaRepositorio.buscar().catch(() => null);
    const convite = await emissaoConvite.emitir({
      usuario,
      empresaNome: empresa && empresa.nome,
    });

    res.status(201).json({ ...usuario, convite });
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

// Desativar é o caminho normal para quem saiu da empresa: corta o acesso
// na mesma hora e preserva o histórico de movimentações da pessoa.
router.put('/:id/situacao', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ erro: 'informe se a conta fica ativa ou desativada' });
    }

    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });

    if (!ativo && String(alvo.id) === String(req.usuario.id)) {
      return res.status(409).json({ erro: 'você não pode desativar a própria conta' });
    }

    if (!ativo && alvo.nivel === 'administrador' && alvo.ativo) {
      const administradores = await usuariosRepositorio.contarAdministradoresAtivos();
      if (administradores <= 1) {
        return res.status(409).json({
          erro: 'este é o único administrador ativo; promova outra pessoa antes de desativar esta conta',
        });
      }
    }

    const usuario = await usuariosRepositorio.definirSituacao(req.params.id, ativo);

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `${ativo ? 'Reativou' : 'Desativou'} o usuário ${alvo.nome} (${alvo.email})`,
      })
      .catch((erro) => console.error('falha ao registrar log de situação', erro));

    res.json(usuario);
  } catch (erro) {
    next(erro);
  }
});

router.post('/:id/reset-senha', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });
    if (alvo.ativo === false) {
      return res.status(409).json({ erro: 'esta conta está desativada; reative antes de gerar uma senha' });
    }

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

// Reenvia o link de ativação. É o caminho normal para quem esqueceu a
// senha e tem acesso ao próprio e-mail. O reset-senha acima continua
// existindo para o caso de a pessoa estar sem acesso à caixa de entrada.
router.post('/:id/convite', autenticar, exigirAdministrador, async (req, res, next) => {
  try {
    const alvo = await usuariosRepositorio.buscarPorId(req.params.id);
    if (!alvo) return res.status(404).json({ erro: 'usuário não encontrado' });
    if (alvo.ativo === false) {
      return res.status(409).json({ erro: 'esta conta está desativada; reative antes de enviar o link de acesso' });
    }

    const empresa = await empresaRepositorio.buscar().catch(() => null);
    const convite = await emissaoConvite.emitir({
      usuario: alvo,
      empresaNome: empresa && empresa.nome,
    });

    logsRepositorio
      .registrar({
        usuarioId: req.usuario.id,
        tipo: 'Edição',
        detalhes: `Reenviou o link de acesso para ${alvo.nome}`,
      })
      .catch((erro) => console.error('falha ao registrar log de edição', erro));

    res.json({ convite });
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

    if (alvo.nivel === 'administrador' && alvo.ativo) {
      const administradores = await usuariosRepositorio.contarAdministradoresAtivos();
      if (administradores <= 1) {
        return res.status(409).json({
          erro: 'este é o único administrador ativo; promova outra pessoa antes de excluir esta conta',
        });
      }
    }

    try {
      await usuariosRepositorio.excluir(req.params.id);
    } catch (erro) {
      // 23503 é a violação de chave estrangeira do PostgreSQL: a conta
      // assina saídas de estoque ou registros de atividade, e apagá-la
      // deixaria esse histórico sem autor. Desativar faz o que a pessoa
      // queria — tirar o acesso — sem perder o registro.
      if (erro && erro.code === '23503') {
        return res.status(409).json({
          erro: 'este usuário tem movimentações registradas e não pode ser excluído. Desative a conta para tirar o acesso.',
        });
      }
      throw erro;
    }

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
