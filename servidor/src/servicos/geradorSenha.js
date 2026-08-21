const crypto = require('crypto');

function gerarSenhaTemporaria() {
  return crypto.randomBytes(6).toString('base64url');
}

module.exports = { gerarSenhaTemporaria };
