const jwt = require('jsonwebtoken');

const usuariosRepositorio = require('../repositorios/usuariosRepositorio');

async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'token de acesso ausente' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (erro) {
    return res.status(401).json({ erro: 'token inválido ou expirado' });
  }

  if (payload.pendente) {
    return res.status(401).json({ erro: 'verificação em duas etapas ainda não concluída' });
  }

  // A sessão vale 8 horas, então só conferir a situação no login deixaria
  // quem foi desativado trabalhando o resto do dia. Esta consulta é uma
  // leitura por chamada, num índice de chave primária, e também cobre a
  // conta excluída enquanto o token dela ainda estava válido.
  try {
    const conta = await usuariosRepositorio.situacaoDaConta(payload.id);
    if (!conta) {
      return res.status(401).json({ erro: 'esta conta não existe mais' });
    }
    if (conta.ativo === false) {
      return res.status(401).json({ erro: 'esta conta está desativada. Procure um administrador.' });
    }
  } catch (erro) {
    return next(erro);
  }

  req.usuario = { id: payload.id, nome: payload.nome, nivel: payload.nivel };
  next();
}

module.exports = { autenticar };
