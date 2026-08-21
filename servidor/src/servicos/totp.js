const { authenticator } = require('otplib');
const QRCode = require('qrcode');

function gerarSegredo() {
  return authenticator.generateSecret();
}

async function gerarQrCodeDataUrl({ email, secret, emissor }) {
  const otpauth = authenticator.keyuri(email, emissor, secret);
  return QRCode.toDataURL(otpauth, { width: 220, margin: 1 });
}

function verificarCodigo({ codigo, secret }) {
  try {
    return authenticator.verify({ token: String(codigo), secret });
  } catch (erro) {
    return false;
  }
}

module.exports = { gerarSegredo, gerarQrCodeDataUrl, verificarCodigo };
