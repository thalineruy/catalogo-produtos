function apenasDigitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

function calcularDigitoVerificador(digitos, pesos) {
  const soma = digitos.reduce((total, digito, indice) => total + digito * pesos[indice], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function validarCnpj(cnpjTexto) {
  const cnpj = apenasDigitos(cnpjTexto);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digitos = cnpj.split('').map(Number);

  const primeiroDigito = calcularDigitoVerificador(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (primeiroDigito !== digitos[12]) return false;

  const segundoDigito = calcularDigitoVerificador(digitos.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (segundoDigito !== digitos[13]) return false;

  return true;
}

module.exports = { validarCnpj, apenasDigitos };
