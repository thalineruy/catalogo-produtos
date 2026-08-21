// Critérios de senha segura. Cada regra devolve uma frase curta, para a
// tela poder listar o que falta enquanto a pessoa digita.

const TAMANHO_MINIMO = 10;

const REGRAS = [
  {
    chave: 'tamanho',
    texto: `Pelo menos ${TAMANHO_MINIMO} caracteres`,
    atende: (senha) => senha.length >= TAMANHO_MINIMO,
  },
  {
    chave: 'maiuscula',
    texto: 'Uma letra maiúscula',
    atende: (senha) => /\p{Lu}/u.test(senha),
  },
  {
    chave: 'minuscula',
    texto: 'Uma letra minúscula',
    atende: (senha) => /\p{Ll}/u.test(senha),
  },
  {
    chave: 'numero',
    texto: 'Um número',
    atende: (senha) => /\d/.test(senha),
  },
];

// Evita a senha ser o próprio e-mail ou o nome: é o primeiro palpite de
// quem tenta invadir a conta.
function pareceComOsDados(senha, { email = '', nome = '' } = {}) {
  const alvo = senha.toLowerCase();
  const partes = [email.split('@')[0], ...nome.split(/\s+/)]
    .map((p) => (p || '').toLowerCase())
    .filter((p) => p.length >= 4);

  return partes.some((parte) => alvo.includes(parte));
}

function conferirSenha(senha = '', dados = {}) {
  const texto = String(senha);
  const pendentes = REGRAS.filter((regra) => !regra.atende(texto)).map((regra) => regra.texto);

  if (texto && pareceComOsDados(texto, dados)) {
    pendentes.push('Não usar seu nome ou e-mail na senha');
  }

  return pendentes;
}

function senhaValida(senha, dados) {
  return conferirSenha(senha, dados).length === 0;
}

module.exports = { conferirSenha, senhaValida, REGRAS, TAMANHO_MINIMO };
