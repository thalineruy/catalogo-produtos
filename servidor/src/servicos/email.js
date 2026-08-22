// Envio de e-mail. Dois serviços possíveis, escolhidos pela variável de
// ambiente que estiver preenchida:
//
//   BREVO_API_KEY   -> Brevo. Entrega para qualquer destinatário depois de
//                      validar um único endereço de remetente, sem exigir
//                      domínio próprio.
//   RESEND_API_KEY  -> Resend. Simples, mas com o remetente de teste só
//                      entrega para o e-mail dono da conta.
//
// Sem nenhuma das duas o sistema NÃO quebra: entra em modo simulado,
// registra no console e devolve { enviado: false, simulado: true }. Quem
// chama usa esse retorno para mostrar o link na tela, de modo que o
// administrador consiga repassar à mão.
const REMETENTE_PADRAO = 'Catálogo de Produtos <onboarding@resend.dev>';

// "Nome <endereco@x>" vira { nome, endereco }. O Resend aceita a linha
// inteira; o Brevo quer as duas partes separadas.
function separarRemetente(linha) {
  const texto = String(linha || '').trim();
  const casou = texto.match(/^(.*?)\s*<([^>]+)>$/);
  if (casou) return { nome: casou[1].trim() || 'Catálogo de Produtos', endereco: casou[2].trim() };
  return { nome: 'Catálogo de Produtos', endereco: texto };
}

function remetenteConfigurado() {
  return process.env.EMAIL_REMETENTE || REMETENTE_PADRAO;
}

// Copiar e colar num painel de variáveis costuma trazer espaço ou quebra
// de linha junto, e um cabeçalho de autenticação com sobra é recusado
// exatamente como se a chave estivesse errada.
function chave(nome) {
  return String(process.env[nome] || '').trim();
}

function servicoEscolhido() {
  if (chave('BREVO_API_KEY')) return 'brevo';
  if (chave('RESEND_API_KEY')) return 'resend';
  return null;
}

function estaConfigurado() {
  return servicoEscolhido() !== null;
}

/* ---------- Tradução das recusas ---------- */

// O administrador não deveria precisar abrir os Logs do Render para
// entender por que a mensagem não saiu.
function motivoResend(status, detalhe) {
  const texto = String(detalhe || '');

  if (status === 401 || status === 403) {
    if (/testing emails|own email address|verify a domain/i.test(texto)) {
      return 'o remetente de teste do Resend só entrega para o e-mail dono da conta. Para enviar a outros endereços, verifique um domínio em Domains, no painel do Resend.';
    }
    if (status === 401) return 'a chave RESEND_API_KEY foi recusada. Confira o valor no Render.';
    return 'o Resend recusou o envio (403). Veja os Logs no Render para o motivo exato.';
  }
  if (status === 422) return 'o Resend recusou os dados da mensagem (422), normalmente o remetente.';
  if (status === 429) return 'o limite de envios do Resend foi atingido. Tente mais tarde.';

  return `o serviço de e-mail respondeu ${status}. Veja os Logs no Render.`;
}

function motivoBrevo(status, detalhe) {
  const texto = String(detalhe || '');

  if (status === 401) {
    // A confusão mais comum: o Brevo tem duas credenciais em telas
    // parecidas, e a senha do SMTP não vale para a API v3.
    return 'a chave BREVO_API_KEY foi recusada. Confira se ela começa com "xkeysib-" e se veio da aba API Keys, não da aba SMTP. Se a conta do Brevo foi criada agora, ela também pode ainda estar aguardando ativação.';
  }
  if (status === 400) {
    if (/sender|from/i.test(texto)) {
      return `o remetente ${separarRemetente(remetenteConfigurado()).endereco} ainda não foi validado no Brevo. Valide-o em Senders, IPs & Domains, no painel do Brevo.`;
    }
    return 'o Brevo recusou os dados da mensagem (400). Veja os Logs no Render.';
  }
  if (status === 402) return 'o limite de envios do Brevo foi atingido.';
  if (status === 429) return 'muitos envios seguidos para o Brevo. Tente daqui a pouco.';

  return `o serviço de e-mail respondeu ${status}. Veja os Logs no Render.`;
}

/* ---------- Chamadas de cada serviço ---------- */

function chamadaResend({ para, assunto, texto, html }) {
  return {
    url: 'https://api.resend.com/emails',
    opcoes: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remetenteConfigurado(),
        to: [para],
        subject: assunto,
        text: texto,
        html,
      }),
    },
    motivo: motivoResend,
  };
}

function chamadaBrevo({ para, assunto, texto, html }) {
  const remetente = separarRemetente(remetenteConfigurado());
  return {
    url: 'https://api.brevo.com/v3/smtp/email',
    opcoes: {
      method: 'POST',
      headers: {
        'api-key': chave('BREVO_API_KEY'),
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
    },
    motivo: motivoBrevo,
  };
}

async function enviar({ para, assunto, texto, html }) {
  const servico = servicoEscolhido();

  if (!servico) {
    console.log(`[e-mail simulado] para=${para} assunto=${assunto}`);
    return { enviado: false, simulado: true };
  }

  const { url, opcoes, motivo } =
    servico === 'brevo'
      ? chamadaBrevo({ para, assunto, texto, html })
      : chamadaResend({ para, assunto, texto, html });

  try {
    const resposta = await fetch(url, opcoes);

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      console.error(`falha ao enviar e-mail por ${servico} (${resposta.status})`, detalhe.slice(0, 300));
      return { enviado: false, simulado: false, erro: motivo(resposta.status, detalhe) };
    }

    return { enviado: true, simulado: false, servico };
  } catch (erro) {
    // Um e-mail que não sai não pode derrubar o cadastro do usuário.
    console.error('erro de rede ao enviar e-mail', erro.message);
    return { enviado: false, simulado: false, erro: erro.message };
  }
}

module.exports = { enviar, estaConfigurado, servicoEscolhido, separarRemetente };
