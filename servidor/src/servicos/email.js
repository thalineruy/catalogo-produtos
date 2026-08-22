// Envio de e-mail pelo Brevo.
//
// Escolhido porque entrega para qualquer destinatário depois de validar um
// único endereço de remetente, sem exigir domínio próprio.
//
// Sem BREVO_API_KEY o sistema NÃO quebra: entra em modo simulado, registra
// no console e devolve { enviado: false, simulado: true }. Quem chama usa
// esse retorno para mostrar o link na tela, de modo que o administrador
// consiga repassar à mão. Isso mantém o cadastro funcionando em
// desenvolvimento e enquanto a conta de envio não estiver pronta.
const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';

// Copiar e colar num painel de variáveis costuma trazer espaço ou quebra
// de linha junto, e um cabeçalho de autenticação com sobra é recusado
// exatamente como se a chave estivesse errada.
function chave() {
  return String(process.env.BREVO_API_KEY || '').trim();
}

// "Nome <endereco@x>" vira { nome, endereco }: o Brevo quer as duas partes
// apartadas, mas guardar numa linha só é mais simples de configurar.
function separarRemetente(linha) {
  const texto = String(linha || '').trim();
  const casou = texto.match(/^(.*?)\s*<([^>]+)>$/);
  if (casou) return { nome: casou[1].trim() || 'Catálogo de Produtos', endereco: casou[2].trim() };
  return { nome: 'Catálogo de Produtos', endereco: texto };
}

function remetenteConfigurado() {
  return separarRemetente(process.env.EMAIL_REMETENTE);
}

function estaConfigurado() {
  return Boolean(chave());
}

// Mantido para a rota /saude, que precisa dizer se o envio está de pé sem
// expor a chave.
function servicoEscolhido() {
  return estaConfigurado() ? 'brevo' : null;
}

// O administrador não deveria precisar abrir os Logs do Render para
// entender por que a mensagem não saiu.
function motivoLegivel(status, detalhe) {
  const texto = String(detalhe || '');

  if (status === 401) {
    // As duas confusões mais comuns: a senha do SMTP, que não vale na API
    // v3, e a lista de IPs autorizados, que vem ligada em contas novas e
    // recusa com o mesmo 401 de chave inválida.
    return 'a chave BREVO_API_KEY foi recusada. Confira se ela começa com "xkeysib-", se veio da aba API Keys e não da SMTP, e se a restrição de IPs autorizados está desligada no painel do Brevo.';
  }
  if (status === 400) {
    if (/sender|from/i.test(texto)) {
      return `o remetente ${remetenteConfigurado().endereco || '(não configurado)'} ainda não foi validado no Brevo. Valide-o em Senders, IPs & Domains.`;
    }
    return 'o Brevo recusou os dados da mensagem (400). Veja os Logs no Render.';
  }
  if (status === 402) return 'o limite de envios do Brevo foi atingido.';
  if (status === 429) return 'muitos envios seguidos para o Brevo. Tente daqui a pouco.';

  return `o serviço de e-mail respondeu ${status}. Veja os Logs no Render.`;
}

async function enviar({ para, assunto, texto, html }) {
  if (!estaConfigurado()) {
    console.log(`[e-mail simulado] para=${para} assunto=${assunto}`);
    return { enviado: false, simulado: true };
  }

  const remetente = remetenteConfigurado();
  if (!remetente.endereco) {
    console.error('EMAIL_REMETENTE não configurado');
    return {
      enviado: false,
      simulado: false,
      erro: 'falta configurar EMAIL_REMETENTE no servidor, com um endereço validado no Brevo.',
    };
  }

  try {
    const resposta = await fetch(URL_BREVO, {
      method: 'POST',
      headers: {
        'api-key': chave(),
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: remetente.nome, email: remetente.endereco },
        to: [{ email: para }],
        subject: assunto,
        textContent: texto,
        htmlContent: html,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      console.error(`falha ao enviar e-mail (${resposta.status})`, detalhe.slice(0, 300));
      return { enviado: false, simulado: false, erro: motivoLegivel(resposta.status, detalhe) };
    }

    // Sucesso aqui quer dizer "aceito para entrega", não "entregue": o
    // destino final aparece nos Logs do próprio Brevo.
    return { enviado: true, simulado: false };
  } catch (erro) {
    // Um e-mail que não sai não pode derrubar o cadastro do usuário.
    console.error('erro de rede ao enviar e-mail', erro.message);
    return { enviado: false, simulado: false, erro: erro.message };
  }
}

module.exports = { enviar, estaConfigurado, servicoEscolhido, separarRemetente };
