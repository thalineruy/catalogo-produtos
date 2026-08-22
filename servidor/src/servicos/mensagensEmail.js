const { HORAS_VALIDADE } = require('./convite');

function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// HTML simples de propósito: cliente de e-mail não é navegador, e uma
// mensagem que depende de CSS moderno chega quebrada em metade deles.
function moldura(conteudo) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#201e1d">
${conteudo}
<p style="margin-top:24px;font-size:12px;color:#6b6664">Esta mensagem foi enviada automaticamente pelo Catálogo de Produtos. Não responda a este e-mail.</p>
</div>`;
}

function conviteDeAcesso({ nome, empresa, link }) {
  const primeiroNome = String(nome).trim().split(/\s+/)[0];
  const nomeEmpresa = empresa || 'sua empresa';

  const texto = [
    `Olá, ${primeiroNome}.`,
    '',
    `Uma conta foi criada para você no Catálogo de Produtos de ${nomeEmpresa}.`,
    '',
    'Para começar a usar, defina sua senha neste link:',
    link,
    '',
    `O link vale por ${HORAS_VALIDADE} horas e só pode ser usado uma vez.`,
    'Se você não esperava este convite, ignore esta mensagem.',
  ].join('\n');

  const html = moldura(`<p>Olá, ${escapar(primeiroNome)}.</p>
<p>Uma conta foi criada para você no Catálogo de Produtos de <strong>${escapar(nomeEmpresa)}</strong>.</p>
<p><a href="${escapar(link)}" style="display:inline-block;padding:12px 20px;background:#ec3013;color:#fff;font-weight:bold;text-decoration:none">Definir minha senha</a></p>
<p style="font-size:13px;color:#6b6664">Ou copie este endereço: ${escapar(link)}</p>
<p>O link vale por ${HORAS_VALIDADE} horas e só pode ser usado uma vez. Se você não esperava este convite, ignore esta mensagem.</p>`);

  return { assunto: `Seu acesso ao Catálogo de Produtos de ${nomeEmpresa}`, texto, html };
}

function pedidoDeAcesso({ email, motivo, link }) {
  const texto = [
    'Um pedido de acesso foi registrado no Catálogo de Produtos.',
    '',
    `E-mail informado: ${email}`,
    `Motivo: ${motivo}`,
    '',
    'Atenda pela tela de Administração:',
    link,
  ].join('\n');

  const html = moldura(`<p>Um pedido de acesso foi registrado no Catálogo de Produtos.</p>
<p><strong>E-mail informado:</strong> ${escapar(email)}<br>
<strong>Motivo:</strong> ${escapar(motivo)}</p>
<p><a href="${escapar(link)}">Atender pela tela de Administração</a></p>`);

  return { assunto: `Pedido de acesso: ${motivo}`, texto, html };
}

module.exports = { conviteDeAcesso, pedidoDeAcesso };
