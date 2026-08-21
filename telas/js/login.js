(() => {
  const form = document.getElementById('form-login');
  const campoErro = document.getElementById('login-erro');

  if (obterToken()) {
    window.location.href = 'catalogo.html';
    return;
  }

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
