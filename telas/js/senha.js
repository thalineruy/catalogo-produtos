(() => {
  const usuario = montarBarraNavegacao({ exigirLogin: true });
  if (!usuario) return;

  const form = document.getElementById('form-senha');
  const campoAtual = document.getElementById('senha-atual');
  const campoNova = document.getElementById('senha-nova');
  const campoConfirma = document.getElementById('senha-confirma');
  const erro = document.getElementById('senha-erro');
  const botao = document.getElementById('botao-trocar-senha');
  const lista = document.getElementById('lista-criterios');
  const situacao = document.getElementById('situacao-senha');

  // Os mesmos critérios que o servidor aplica. Repetidos aqui só para
  // mostrar o que falta enquanto a pessoa digita — quem decide é o
  // servidor, que valida de novo antes de gravar.
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

  let email = '';

  function partesDoUsuario() {
    return [email.split('@')[0], ...usuario.nome.split(/\s+/)]
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

  function descreverIdadeDaSenha(dataIso) {
    if (!dataIso) {
      situacao.textContent = 'Não há registro de quando esta senha foi definida.';
      return;
    }
    const dias = Math.floor((Date.now() - new Date(dataIso).getTime()) / 86400000);
    if (dias >= 60) {
      situacao.textContent = `Sua senha tem ${dias} dias. Recomendamos trocar.`;
    } else if (dias >= 50) {
      situacao.textContent = `Sua senha tem ${dias} dias e completa 60 em breve.`;
    } else {
      situacao.textContent = `Sua senha tem ${dias} dia(s).`;
    }
  }

  campoNova.addEventListener('input', () => desenharCriterios(campoNova.value));

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erro.hidden = true;

    const nova = campoNova.value;

    if (nova !== campoConfirma.value) {
      erro.textContent = 'A nova senha e a repetição não são iguais.';
      erro.hidden = false;
      return;
    }
    if (!todosAtendidos(nova)) {
      erro.textContent = 'A nova senha ainda não atende a todos os critérios ao lado.';
      erro.hidden = false;
      return;
    }

    botao.disabled = true;
    try {
      await trocarMinhaSenha(campoAtual.value, nova);
      form.reset();
      desenharCriterios('');
      exibirAviso('Senha trocada com sucesso.');
      await carregarConta();
    } catch (falha) {
      erro.textContent = falha.message;
      erro.hidden = false;
    } finally {
      botao.disabled = false;
    }
  });

  async function carregarConta() {
    try {
      const conta = await buscarMinhaConta();
      email = conta.email || '';
      descreverIdadeDaSenha(conta.senha_atualizada_em);
    } catch (falha) {
      situacao.textContent = 'Não foi possível verificar a idade da senha.';
    }
  }

  desenharCriterios('');
  carregarConta();
})();
