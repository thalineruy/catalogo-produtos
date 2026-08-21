function exigirAdministrador(req, res, next) {
  if (!req.usuario || req.usuario.nivel !== 'administrador') {
    return res.status(403).json({ erro: 'apenas administradores podem acessar este recurso' });
  }
  next();
}

module.exports = { exigirAdministrador };
