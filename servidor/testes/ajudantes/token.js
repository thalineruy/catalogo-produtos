require('dotenv').config({ quiet: true });
const jwt = require('jsonwebtoken');

function gerarToken({ id = 1, nome = 'Usuário Teste', nivel = 'operador' } = {}) {
  return jwt.sign({ id, nome, nivel }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { gerarToken };
