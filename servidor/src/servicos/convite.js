const crypto = require('crypto');

const HORAS_VALIDADE = 48;

function gerarToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Determinístico de propósito: é assim que se acha a linha a partir do
// token que chega na URL. Serve porque o token é aleatório de 32 bytes,
// não uma senha que dê para adivinhar por força bruta.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function calcularExpiracao() {
  return new Date(Date.now() + HORAS_VALIDADE * 60 * 60 * 1000);
}

function montarLink(token, baseUrl) {
  const base = (baseUrl || '').replace(/\/+$/, '');
  return `${base}/ativar.html?token=${encodeURIComponent(token)}`;
}

module.exports = { gerarToken, hashToken, calcularExpiracao, montarLink, HORAS_VALIDADE };
