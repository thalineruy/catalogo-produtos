(() => {
  const form = document.getElementById('form-login');
  const campoErro = document.getElementById('login-erro');
  const botaoEsqueciSenha = document.getElementById('botao-esqueci-senha');

  if (obterToken()) {
    window.location.href = 'catalogo.html';
    return;
  }

  botaoEsqueciSenha.addEventListener('click', () => {
    exibirAviso('Recuperação de senha ainda não disponível. Fale com o administrador do sistema.');
  });

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
})();
