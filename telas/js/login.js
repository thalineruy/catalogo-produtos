(() => {
  const passoSenha = document.getElementById('passo-senha');
  const passoRecuperar = document.getElementById('passo-recuperar');

  const form = document.getElementById('form-login');
  const campoErro = document.getElementById('login-erro');
  const botaoEsqueciSenha = document.getElementById('botao-esqueci-senha');
  const botaoVoltarSenha = document.getElementById('botao-voltar-senha');

  const formRecuperar = document.getElementById('form-recuperar');
  const campoRecuperarEmail = document.getElementById('recuperar-email');
  const campoRecuperarMotivo = document.getElementById('recuperar-motivo');
  const recuperarConfirmacao = document.getElementById('recuperar-confirmacao');
  const recuperarErro = document.getElementById('recuperar-erro');

  if (obterToken()) {
    window.location.href = 'catalogo.html';
    return;
  }

  iniciarBarraCookies();

  function irParaRecuperar() {
    passoSenha.hidden = true;
    passoRecuperar.hidden = false;
    campoRecuperarEmail.focus();
  }

  function irParaSenha() {
    passoRecuperar.hidden = true;
    passoSenha.hidden = false;
    recuperarErro.hidden = true;
    recuperarConfirmacao.hidden = true;
    formRecuperar.reset();
    document.getElementById('login-email').focus();
  }

  botaoEsqueciSenha.addEventListener('click', irParaRecuperar);
  botaoVoltarSenha.addEventListener('click', irParaSenha);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    campoErro.hidden = true;

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    try {
      const resultado = await login(email, senha);
      salvarSessao(resultado.token, resultado.usuario);
      window.location.href = 'catalogo.html';
    } catch (erro) {
      campoErro.textContent = erro.message;
      campoErro.hidden = false;
    }
  });

  formRecuperar.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    recuperarErro.hidden = true;

    const email = campoRecuperarEmail.value.trim();
    const motivo = campoRecuperarMotivo.value;

    try {
      await solicitarRecuperacaoSenha(email, motivo);
      recuperarConfirmacao.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 13 4 4 10-10"/></svg>' +
        '<div><strong>Pedido enviado ao administrador</strong><p class="apagado"></p></div>';
      recuperarConfirmacao.querySelector('p').textContent =
        `Uma senha temporária será enviada para ${email}. O pedido aparece nos logs do administrador como solicitação de reset.`;
      recuperarConfirmacao.hidden = false;
      formRecuperar.reset();
    } catch (erro) {
      recuperarErro.textContent = erro.message;
      recuperarErro.hidden = false;
    }
  });
})();
