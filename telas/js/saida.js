(() => {
  const usuario = montarBarraNavegacao({ exigirLogin: true });
  if (!usuario) return;

  const form = document.getElementById('form-saida');
  const campoProduto = document.getElementById('saida-produto');
  const campoQuantidade = document.getElementById('saida-quantidade');
  const campoMotivo = document.getElementById('saida-motivo');
  const campoObservacao = document.getElementById('saida-observacao');
  const campoOperador = document.getElementById('saida-operador');
  const infoQuantidade = document.getElementById('saida-quantidade-info');
  const erroQuantidade = document.getElementById('saida-quantidade-erro');
  const confirmacao = document.getElementById('saida-confirmacao');
  const erroGeral = document.getElementById('saida-erro-geral');
  const botaoRegistrar = document.getElementById('botao-registrar-saida');
  const botaoLimpar = document.getElementById('botao-limpar-saida');

  const cartaoEstoque = document.getElementById('cartao-estoque');
  const estoqueProdutoNome = document.getElementById('estoque-produto-nome');
  const estoqueProdutoQuantidade = document.getElementById('estoque-produto-quantidade');

  const campoHistoricoBusca = document.getElementById('historico-busca');
  const campoHistoricoCategoria = document.getElementById('historico-categoria');
  const resumoHistorico = document.getElementById('historico-resumo');
  const corpoHistorico = document.getElementById('corpo-historico');
  const historicoVazio = document.getElementById('historico-vazio');
  const tabelaWrapperHistorico = document.querySelector('.tabela-wrapper-historico');

  let produtos = [];
  let saidas = [];

  campoOperador.value = `${usuario.nome} (${usuario.nivel === 'administrador' ? 'Administrador' : 'Operador'})`;

  function produtoSelecionado() {
    const id = campoProduto.value;
    if (!id) return null;
    return produtos.find((produto) => String(produto.id) === id) || null;
  }

  function formatarData(dataIso) {
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function atualizarCartaoEstoque(produto) {
    if (!produto) {
      cartaoEstoque.hidden = true;
      return;
    }
    cartaoEstoque.hidden = false;
    estoqueProdutoNome.textContent = `${produto.nome} (${produto.codigo_interno})`;
    estoqueProdutoQuantidade.textContent = `${produto.quantidade} un. em estoque`;
  }

  function atualizarPreviaEstoque() {
    const produto = produtoSelecionado();

    erroQuantidade.hidden = true;
    erroQuantidade.textContent = '';
    campoQuantidade.setAttribute('aria-invalid', 'false');
    botaoRegistrar.disabled = false;

    if (!produto) {
      infoQuantidade.textContent = 'Selecione um produto para ver o estoque.';
      return;
    }

    const quantidadeTexto = campoQuantidade.value;
    if (!quantidadeTexto) {
      infoQuantidade.textContent = `Estoque atual: ${produto.quantidade} un.`;
      return;
    }

    const quantidade = Number(quantidadeTexto);

    if (quantidade <= 0) {
      infoQuantidade.textContent = `Estoque atual: ${produto.quantidade} un.`;
      erroQuantidade.textContent = 'A quantidade precisa ser maior que zero.';
      erroQuantidade.hidden = false;
      campoQuantidade.setAttribute('aria-invalid', 'true');
      botaoRegistrar.disabled = true;
      return;
    }

    const restante = produto.quantidade - quantidade;

    if (restante < 0) {
      infoQuantidade.textContent = 'Estoque após a saída: indisponível.';
      erroQuantidade.textContent = `Quantidade maior que o disponível: existem apenas ${produto.quantidade} unidade(s) em estoque.`;
      erroQuantidade.hidden = false;
      campoQuantidade.setAttribute('aria-invalid', 'true');
      botaoRegistrar.disabled = true;
      return;
    }

    infoQuantidade.textContent = `Estoque após a saída: ${restante} un.`;
  }

  function preencherSelectProdutos() {
    campoProduto.querySelectorAll('option:not(:first-child)').forEach((opcao) => opcao.remove());
    produtos.forEach((produto) => {
      const opcao = document.createElement('option');
      opcao.value = produto.id;
      opcao.textContent = `${produto.codigo_interno} — ${produto.nome} (${produto.quantidade} em estoque)`;
      campoProduto.appendChild(opcao);
    });
  }

  function preencherSelectCategoriasHistorico() {
    const categoriasUnicas = [...new Set(saidas.map((saida) => saida.categoria_nome))].sort();
    campoHistoricoCategoria.querySelectorAll('option:not(:first-child)').forEach((opcao) => opcao.remove());
    categoriasUnicas.forEach((nome) => {
      const opcao = document.createElement('option');
      opcao.value = nome;
      opcao.textContent = nome;
      campoHistoricoCategoria.appendChild(opcao);
    });
  }

  function renderizarHistorico() {
    const busca = campoHistoricoBusca.value.trim().toLowerCase();
    const categoria = campoHistoricoCategoria.value;

    const filtradas = saidas.filter((saida) => {
      if (busca && !saida.produto_nome.toLowerCase().includes(busca)) return false;
      if (categoria && saida.categoria_nome !== categoria) return false;
      return true;
    });

    corpoHistorico.innerHTML = '';

    if (filtradas.length === 0) {
      tabelaWrapperHistorico.hidden = true;
      historicoVazio.hidden = false;
    } else {
      tabelaWrapperHistorico.hidden = false;
      historicoVazio.hidden = true;

      filtradas.forEach((saida) => {
        const tr = document.createElement('tr');

        const tdData = document.createElement('td');
        tdData.textContent = formatarData(saida.data_saida);
        tr.appendChild(tdData);

        const tdProduto = document.createElement('td');
        tdProduto.textContent = saida.produto_nome;
        tr.appendChild(tdProduto);

        const tdCategoria = document.createElement('td');
        tdCategoria.className = 'col-categoria';
        tdCategoria.textContent = saida.categoria_nome;
        tr.appendChild(tdCategoria);

        const tdQuantidade = document.createElement('td');
        tdQuantidade.textContent = String(saida.quantidade);
        tr.appendChild(tdQuantidade);

        const tdMotivo = document.createElement('td');
        tdMotivo.className = 'col-motivo';
        tdMotivo.textContent = saida.motivo;
        tr.appendChild(tdMotivo);

        const tdOperador = document.createElement('td');
        tdOperador.textContent = saida.operador_nome;
        tr.appendChild(tdOperador);

        corpoHistorico.appendChild(tr);
      });
    }

    resumoHistorico.textContent =
      filtradas.length === 1 ? '1 saída encontrada' : `${filtradas.length} saídas encontradas`;
  }

  async function carregarProdutos() {
    produtos = await listarProdutos();
    preencherSelectProdutos();
  }

  async function carregarHistorico() {
    saidas = await listarSaidas();
    preencherSelectCategoriasHistorico();
    renderizarHistorico();
  }

  function limparFormulario() {
    form.reset();
    confirmacao.textContent = '';
    erroGeral.hidden = true;
    atualizarCartaoEstoque(null);
    atualizarPreviaEstoque();
  }

  campoProduto.addEventListener('change', () => {
    atualizarCartaoEstoque(produtoSelecionado());
    atualizarPreviaEstoque();
  });

  campoQuantidade.addEventListener('input', atualizarPreviaEstoque);

  campoHistoricoBusca.addEventListener('input', renderizarHistorico);
  campoHistoricoCategoria.addEventListener('change', renderizarHistorico);

  botaoLimpar.addEventListener('click', limparFormulario);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;
    confirmacao.textContent = '';

    const produto = produtoSelecionado();
    const quantidade = Number(campoQuantidade.value);
    const motivo = campoMotivo.value;

    if (!produto) {
      erroGeral.textContent = 'Selecione um produto.';
      erroGeral.hidden = false;
      return;
    }
    if (!quantidade || quantidade <= 0) {
      erroGeral.textContent = 'Informe uma quantidade maior que zero.';
      erroGeral.hidden = false;
      return;
    }
    if (quantidade > produto.quantidade) {
      erroGeral.textContent = `Quantidade maior que o disponível: existem apenas ${produto.quantidade} unidade(s) em estoque.`;
      erroGeral.hidden = false;
      return;
    }
    if (!motivo) {
      erroGeral.textContent = 'Selecione o motivo da saída.';
      erroGeral.hidden = false;
      return;
    }

    botaoRegistrar.disabled = true;

    try {
      const resultado = await registrarSaida({
        produto_id: Number(produto.id),
        quantidade,
        motivo,
        observacao: campoObservacao.value.trim() || undefined,
      });

      produto.quantidade = resultado.estoque_restante;
      preencherSelectProdutos();
      campoProduto.value = String(produto.id);
      atualizarCartaoEstoque(produto);

      confirmacao.textContent = `Saída registrada: ${quantidade} un. de "${produto.nome}". Estoque atual: ${resultado.estoque_restante} un.`;

      campoQuantidade.value = '';
      campoMotivo.value = '';
      campoObservacao.value = '';
      atualizarPreviaEstoque();

      await carregarHistorico();
    } catch (erro) {
      erroGeral.textContent = erro.message;
      erroGeral.hidden = false;
    } finally {
      botaoRegistrar.disabled = false;
    }
  });

  (async function iniciar() {
    try {
      await carregarProdutos();
      await carregarHistorico();
    } catch (erro) {
      erroGeral.textContent = `Não foi possível carregar os dados: ${erro.message}`;
      erroGeral.hidden = false;
    }
    atualizarPreviaEstoque();
  })();
})();
