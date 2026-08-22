const convite = require('./convite');
const email = require('./email');
const mensagensEmail = require('./mensagensEmail');
const convitesRepositorio = require('../repositorios/convitesRepositorio');

// Endereço público das telas, usado para montar o link do convite. Sem
// ele o link sai relativo e não serve para nada num e-mail.
function urlDoSistema() {
  const bruto = process.env.URL_SISTEMA || process.env.CORS_ORIGIN || '';
  // CORS_ORIGIN pode ser "*" ou uma lista; nenhum dos dois vira link.
  if (!bruto || bruto === '*' || bruto.includes(',')) return process.env.URL_SISTEMA || '';
  return bruto;
}

// Emite um convite de uso único e tenta mandar por e-mail. O link só volta
// para quem chamou quando o e-mail não saiu — aí o administrador repassa à
// mão. No caminho normal, só a caixa de entrada da pessoa tem o link.
async function emitir({ usuario, empresaNome }) {
  const token = convite.gerarToken();

  await convitesRepositorio.invalidarDoUsuario(usuario.id);
  await convitesRepositorio.criar({
    usuarioId: usuario.id,
    tokenHash: convite.hashToken(token),
    expiraEm: convite.calcularExpiracao(),
  });

  const link = convite.montarLink(token, urlDoSistema());
  const mensagem = mensagensEmail.conviteDeAcesso({
    nome: usuario.nome,
    empresa: empresaNome,
    link,
  });

  const envio = await email.enviar({ para: usuario.email, ...mensagem });

  return {
    emailEnviado: envio.enviado,
    emailSimulado: Boolean(envio.simulado),
    // Só devolve o link quando não deu para enviar
    link: envio.enviado ? null : link,
    validoPorHoras: convite.HORAS_VALIDADE,
  };
}

module.exports = { emitir, urlDoSistema };
