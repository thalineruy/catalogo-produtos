(() => {
  const passos = {
    senha: document.getElementById('passo-senha'),
    recuperar: document.getElementById('passo-recuperar'),
    codigo: document.getElementById('passo-codigo'),
  };

  const form = document.getElementById('form-login');
  const campoErro = document.getElementById('login-erro');
  const botaoEsqueciSenha = document.getElementById('botao-esqueci-senha');
  const botaoVoltarSenha = document.getElementById('botao-voltar-senha');

  const formRecuperar = document.getElementById('form-recuperar');
  const campoRecuperarEmail = document.getElementById('recuperar-email');
  const campoRecuperarMotivo = document.getElementById('recuperar-motivo');
  const recuperarConfirmacao = document.getElementById('recuperar-confirmacao');
  const recuperarErro = document.getElementById('recuperar-erro');

  const botaoVoltarCodigo = document.getElementById('botao-voltar-codigo');
  const botaoPerdiAplicativo = document.getElementById('botao-perdi-aplicativo');
  const blocoConfiguracao = document.getElementById('codigo-configuracao');
  const instrucaoPadrao = document.getElementById('codigo-instrucao-padrao');
  const imagemQr = document.getElementById('codigo-qr');
  const chaveManual = document.getElementById('codigo-chave-manual');
  const formCodigo = document.getElementById('form-codigo');
  const digitos = Array.from(document.querySelectorAll('#codigo-digitos input'));
  const campoConfiarDispositivo = document.getElementById('codigo-confiar-dispositivo');
  const codigoErro = document.getElementById('codigo-erro');

  if (obterToken()) {
    window.location.href = 'catalogo.html';
    return;
  }

  iniciarBarraCookies();

  let tokenPendente = null;

  function mostrarPasso(nome) {
    Object.entries(passos).forEach(([chave, elemento]) => {
      elemento.hidden = chave !== nome;
    });
  }

  function limparDigitos() {
    digitos.forEach((campo) => { campo.value = ''; });
  }

  function limparCodigo() {
    limparDigitos();
    codigoErro.hidden = true;
    campoConfiarDispositivo.checked = false;
  }

  function irParaSenha() {
    mostrarPasso('senha');
    recuperarErro.hidden = true;
    recuperarConfirmacao.hidden = true;
    formRecuperar.reset();
    limparCodigo();
    tokenPendente = null;
    document.getElementById('login-email').focus();
  }

  function irParaRecuperar() {
    mostrarPasso('recuperar');
    campoRecuperarEmail.focus();
  }

  function irParaCodigo(configuracao) {
    mostrarPasso('codigo');

    if (configuracao) {
      blocoConfiguracao.hidden = false;
      instrucaoPadrao.hidden = true;
      imagemQr.src = configuracao.qrCodeDataUrl;
      chaveManual.textContent = configuracao.chaveManual;
    } else {
      blocoConfiguracao.hidden = true;
      instrucaoPadrao.hidden = false;
    }

    limparCodigo();
    digitos[0].focus();
  }

  botaoEsqueciSenha.addEventListener('click', irParaRecuperar);
  botaoVoltarSenha.addEventListener('click', irParaSenha);
  botaoVoltarCodigo.addEventListener('click', irParaSenha);
  botaoPerdiAplicativo.addEventListener('click', irParaRecuperar);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    campoErro.hidden = true;

    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    try {
      const resultado = await login(email, senha, obterTokenDispositivo());

      if (resultado.pendente) {
        tokenPendente = resultado.tokenPendente;
        irParaCodigo(resultado.configuracao);
        return;
      }

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

  digitos.forEach((campo, indice) => {
    campo.addEventListener('input', () => {
      campo.value = campo.value.replace(/[^0-9]/g, '').slice(-1);
      if (campo.value && indice < digitos.length - 1) {
        digitos[indice + 1].focus();
      }
    });

    campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Backspace' && !campo.value && indice > 0) {
        digitos[indice - 1].focus();
      }
    });

    campo.addEventListener('paste', (evento) => {
      const colado = (evento.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      if (!colado) return;
      evento.preventDefault();
      colado
        .slice(0, digitos.length - indice)
        .split('')
        .forEach((digito, deslocamento) => {
          digitos[indice + deslocamento].value = digito;
        });
      const proximo = digitos[Math.min(indice + colado.length, digitos.length - 1)];
      proximo.focus();
    });
  });

  formCodigo.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    codigoErro.hidden = true;

    const codigo = digitos.map((campo) => campo.value).join('');
    if (codigo.length !== digitos.length) {
      codigoErro.textContent = 'Informe os seis dígitos do código.';
      codigoErro.hidden = false;
      return;
    }

    try {
      const resultado = await verificarCodigoLogin(tokenPendente, codigo, campoConfiarDispositivo.checked);
      if (resultado.dispositivoToken) {
        salvarTokenDispositivo(resultado.dispositivoToken);
      }
      salvarSessao(resultado.token, resultado.usuario);
      window.location.href = 'catalogo.html';
    } catch (erro) {
      codigoErro.textContent = erro.message;
      codigoErro.hidden = false;
      limparDigitos();
      digitos[0].focus();
    }
  });
})();
