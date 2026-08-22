(() => {
  const passoCarregando = document.getElementById('passo-carregando');
  const passoInvalido = document.getElementById('passo-invalido');
  const passoDefinir = document.getElementById('passo-definir');
  const passoPronto = document.getElementById('passo-pronto');

  const campoNome = document.getElementById('ativar-nome');
  const form = document.getElementById('form-ativar');
  const campoSenha = document.getElementById('ativar-senha');
  const campoRepetir = document.getElementById('ativar-repetir');
  const lista = document.getElementById('lista-criterios');
  const erro = document.getElementById('ativar-erro');
  const botao = document.getElementById('botao-ativar');

  // O token vem na URL do e-mail. Nunca é guardado: sai da barra de
  // endereços assim que a senha é definida.
  const token = new URLSearchParams(window.location.search).get('token');

  let dados = { nome: '', email: '' };

  // Mesmas regras do servidor, repetidas aqui só para dar retorno na hora.
  // Quem decide é sempre o servidor.
  const CRITERIOS = [
    { texto: 'Pelo menos 10 caracteres', atende: (s) => s.length >= 10 },
    { texto: 'Uma letra maiúscula', atende: (s) => /\p{Lu}/u.test(s) },
    { texto: 'Uma letra minúscula', atende: (s) => /\p{Ll}/u.test(s) },
    { texto: 'Um número', atende: (s) => /\d/.test(s) },
    {
      texto: 'Não usar seu nome ou e-mail na senha',
      atende: (s) => {
        if (!s) return false;
        const alvo = s.toLowerCase();
        return !partesDoUsuario().some((parte) => alvo.includes(parte));
      },
    },
  ];

  function partesDoUsuario() {
    return [(dados.email || '').split('@')[0], ...(dados.nome || '').split(/\s+/)]
      .map((p) => (p || '').toLowerCase())
      .filter((p) => p.length >= 4);
  }

  function desenharCriterios(senha) {
    lista.innerHTML = '';
    CRITERIOS.forEach((criterio) => {
      const ok = criterio.atende(senha);
      const item = document.createElement('li');
      item.className = ok ? 'criterio atendido' : 'criterio';

      const marca = document.createElement('span');
      marca.className = 'criterio-marca';
      marca.setAttribute('aria-hidden', 'true');
      marca.textContent = ok ? '✓' : '·';

      const texto = document.createElement('span');
      texto.textContent = criterio.texto;

      // Sem depender de cor: o leitor de tela também ouve a situação
      const leitor = document.createElement('span');
      leitor.className = 'apenas-leitor';
      leitor.textContent = ok ? ' (atendido)' : ' (falta)';

      item.append(marca, texto, leitor);
      lista.appendChild(item);
    });
  }

  function todosAtendidos(senha) {
    return CRITERIOS.every((criterio) => criterio.atende(senha));
  }

  function mostrar(passo) {
    [passoCarregando, passoInvalido, passoDefinir, passoPronto].forEach((bloco) => {
      bloco.hidden = bloco !== passo;
    });
  }

  function exibirErro(mensagem) {
    erro.textContent = mensagem;
    erro.hidden = false;
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erro.hidden = true;

    const senha = campoSenha.value;

    if (!todosAtendidos(senha)) {
      exibirErro('A senha ainda não atende a todos os critérios da lista.');
      campoSenha.focus();
      return;
    }
    if (senha !== campoRepetir.value) {
      exibirErro('As duas senhas não são iguais.');
      campoRepetir.focus();
      return;
    }

    botao.disabled = true;
    try {
      await definirSenhaPorConvite(token, senha);
      // Tira o token da barra de endereços: ele já não vale mais, mas não
      // custa nada não deixá-lo no histórico do navegador.
      window.history.replaceState({}, '', 'ativar.html');
      mostrar(passoPronto);
    } catch (falha) {
      exibirErro(falha.message);
      botao.disabled = false;
    }
  });

  campoSenha.addEventListener('input', () => desenharCriterios(campoSenha.value));

  (async function iniciar() {
    carregarMarcaEntrada();
    iniciarBarraCookies();

    if (!token) {
      mostrar(passoInvalido);
      return;
    }

    try {
      dados = await validarConvite(token);
      campoNome.textContent = (dados.nome || '').split(/\s+/)[0];
      desenharCriterios('');
      mostrar(passoDefinir);
      campoSenha.focus();
    } catch (falha) {
      mostrar(passoInvalido);
    }
  })();
})();
