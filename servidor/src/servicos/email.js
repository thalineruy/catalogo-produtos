// Envio de e-mail pela API do Resend.
//
// Sem RESEND_API_KEY configurada o sistema NÃO quebra: entra em modo
// simulado, registra no console e devolve { enviado: false, simulado:
// true }. Quem chama usa esse retorno para mostrar o link na tela, de
// modo que o administrador consiga repassar à mão. Isso mantém o
// cadastro funcionando em desenvolvimento e enquanto a conta de envio
// não estiver pronta.
const REMETENTE_PADRAO = 'Catálogo de Produtos <onboarding@resend.dev>';

function estaConfigurado() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function enviar({ para, assunto, texto, html }) {
  if (!estaConfigurado()) {
    console.log(`[e-mail simulado] para=${para} assunto=${assunto}`);
    return { enviado: false, simulado: true };
  }

  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_REMETENTE || REMETENTE_PADRAO,
        to: [para],
        subject: assunto,
        text: texto,
        html,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      console.error(`falha ao enviar e-mail (${resposta.status})`, detalhe.slice(0, 300));
      return { enviado: false, simulado: false, erro: `status ${resposta.status}` };
    }

    return { enviado: true, simulado: false };
  } catch (erro) {
    // Um e-mail que não sai não pode derrubar o cadastro do usuário.
    console.error('erro de rede ao enviar e-mail', erro.message);
    return { enviado: false, simulado: false, erro: erro.message };
  }
}

module.exports = { enviar, estaConfigurado };
