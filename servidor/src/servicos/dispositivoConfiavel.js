const crypto = require('crypto');

const DIAS_CONFIANCA = 30;

function gerarToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function calcularExpiracao() {
  return new Date(Date.now() + DIAS_CONFIANCA * 24 * 60 * 60 * 1000);
}

module.exports = { gerarToken, hashToken, calcularExpiracao, DIAS_CONFIANCA };
