(() => {
  const usuario = montarBarraNavegacao({ exigirLogin: true });
  if (!usuario) return;

  const form = document.getElementById('form-filtros-logs');
  const campoPeriodo = document.getElementById('logs-periodo');
  const campoInicio = document.getElementById('logs-inicio');
  const campoFim = document.getElementById('logs-fim');
  const blocoInicio = document.getElementById('campo-data-inicio');
  const blocoFim = document.getElementById('campo-data-fim');
  const campoOperador = document.getElementById('logs-operador');
  const iconeCadeado = document.getElementById('icone-cadeado-operador');
  const explicacaoOperador = document.getElementById('logs-operador-explicacao');
  const campoTipo = document.getElementById('logs-tipo');
  const botaoLimpar = document.getElementById('botao-limpar-filtros-logs');

  const resumo = document.getElementById('logs-resumo');
  const mensagemErro = document.getElementById('logs-erro');
  const tabelaWrapper = document.querySelector('.rolagem-tabela');
  const corpoLogs = document.getElementById('corpo-logs');
  const estadoVazio = document.getElementById('logs-vazio');

  const ehAdministrador = usuario.nivel === 'administrador';

  function formatarData(dataIso) {
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function exibirErro(mensagem) {
    mensagemErro.textContent = mensagem;
    mensagemErro.hidden = false;
  }

  function limparErro() {
    mensagemErro.hidden = true;
  }

  function paraTextoData(data) {
    const doisDigitos = (n) => String(n).padStart(2, '0');
    return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
  }

  // Traduz o atalho escolhido para o par de datas que a API espera.
  // "personalizado" usa o que estiver nos dois campos de data.
  function intervaloDoPeriodo() {
    const escolha = campoPeriodo.value;

    if (escolha === 'personalizado') {
      return { inicio: campoInicio.value, fim: campoFim.value };
    }
    if (escolha === 'tudo') {
      return { inicio: '', fim: '' };
    }

    const hoje = new Date();
    const fim = paraTextoData(hoje);

    if (escolha === 'mes') {
      return { inicio: paraTextoData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim };
    }

    const dias = Number(escolha);
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - (dias - 1));
    return { inicio: paraTextoData(inicio), fim };
  }

  function atualizarVisibilidadeDatas() {
    const personalizado = campoPeriodo.value === 'personalizado';
    blocoInicio.hidden = !personalizado;
    blocoFim.hidden = !personalizado;
  }

  function filtrosAtuais() {
    const { inicio, fim } = intervaloDoPeriodo();
    const filtros = { tipo: campoTipo.value, inicio, fim };
    if (ehAdministrador) {
      filtros.operador = campoOperador.value;
    }
    return filtros;
  }

  function renderizarLogs(logs) {
    corpoLogs.innerHTML = '';

    if (logs.length === 0) {
      tabelaWrapper.hidden = true;
      estadoVazio.hidden = false;
    } else {
      tabelaWrapper.hidden = false;
      estadoVazio.hidden = true;

      logs.forEach((log) => {
        const tr = document.createElement('tr');

        const tdData = document.createElement('td');
        tdData.textContent = formatarData(log.criado_em);
        tr.appendChild(tdData);

        const tdOperador = document.createElement('td');
        tdOperador.textContent = log.operador_nome || '—';
        tr.appendChild(tdOperador);

        const tdTipo = document.createElement('td');
        tdTipo.textContent = log.tipo;
        tr.appendChild(tdTipo);

        const tdDetalhes = document.createElement('td');
        tdDetalhes.textContent = log.detalhes || '';
        tr.appendChild(tdDetalhes);

        corpoLogs.appendChild(tr);
      });
    }

    resumo.textContent = logs.length === 1 ? '1 registro encontrado' : `${logs.length} registros encontrados`;
  }

  async function carregarLogs() {
    try {
      limparErro();
      const logs = await listarLogs(filtrosAtuais());
      renderizarLogs(logs);
    } catch (erro) {
      exibirErro(`Não foi possível carregar os logs: ${erro.message}`);
      renderizarLogs([]);
    }
  }

  async function configurarFiltroOperador() {
    if (!ehAdministrador) {
      campoOperador.disabled = true;
      campoOperador.innerHTML = '';
      const opcao = document.createElement('option');
      opcao.value = usuario.id;
      opcao.textContent = `${usuario.nome} (você)`;
      campoOperador.appendChild(opcao);
      campoOperador.value = usuario.id;
      iconeCadeado.hidden = false;
      explicacaoOperador.hidden = false;
      return;
    }

    try {
      const usuarios = await listarUsuarios();
      usuarios.forEach((item) => {
        const opcao = document.createElement('option');
        opcao.value = item.id;
        opcao.textContent = item.nome;
        campoOperador.appendChild(opcao);
      });
    } catch (erro) {
      exibirErro(`Não foi possível carregar a lista de operadores: ${erro.message}`);
    }
  }

  function limparFiltros() {
    campoPeriodo.value = 'tudo';
    campoInicio.value = '';
    campoFim.value = '';
    campoTipo.value = '';
    if (ehAdministrador) campoOperador.value = '';
    atualizarVisibilidadeDatas();
    carregarLogs();
  }

  form.addEventListener('submit', (evento) => evento.preventDefault());
  campoPeriodo.addEventListener('change', () => {
    atualizarVisibilidadeDatas();
    // No modo personalizado só busca quando as datas forem preenchidas
    if (campoPeriodo.value !== 'personalizado') carregarLogs();
  });
  campoInicio.addEventListener('change', carregarLogs);
  campoFim.addEventListener('change', carregarLogs);
  campoTipo.addEventListener('change', carregarLogs);
  campoOperador.addEventListener('change', () => {
    if (ehAdministrador) carregarLogs();
  });
  botaoLimpar.addEventListener('click', limparFiltros);

  (async function iniciar() {
    atualizarVisibilidadeDatas();
    await configurarFiltroOperador();
    await carregarLogs();
  })();
})();
