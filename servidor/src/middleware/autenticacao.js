const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'token de acesso ausente' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, nome: payload.nome, nivel: payload.nivel };
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'token inválido ou expirado' });
  }
}

module.exports = { autenticar };
