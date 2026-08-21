(() => {
  const usuario = montarBarraNavegacao({ exigirLogin: true });
  if (!usuario) return;

  const form = document.getElementById('form-saida');
  const campoProduto = document.getElementById('saida-produto');
  const campoQuantidade = document.getElementById('saida-quantidade');
  const campoMotivo = document.getElementById('saida-motivo');
  const campoObservacao = document.getElementById('saida-observacao');
  const operadorInicial = document.getElementById('saida-operador-inicial');
  const operadorNome = document.getElementById('saida-operador-nome');
  const infoQuantidade = document.getElementById('saida-quantidade-info');
  const erroQuantidade = document.getElementById('saida-quantidade-erro');
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
  const tabelaWrapperHistorico = document.querySelector('.rolagem-tabela');

  const paginacao = criarPaginacao('paginacao-saidas', () => carregarHistorico());

  function debounceHistorico(funcao, atraso) {
    let temporizador;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => funcao(...args), atraso);
    };
  }

  let produtos = [];
  let saidas = [];

  // Iniciais do nome (até duas), como o avatar da barra superior
  const iniciais = usuario.nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

  operadorInicial.textContent = iniciais;
  operadorNome.textContent = `${usuario.nome} (${usuario.nivel === 'administrador' ? 'Administrador' : 'Operador'})`;

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

  // Vem da lista de categorias, e não das saídas da página: com a
  // paginação, as saídas visíveis não representam todas as categorias.
  async function preencherSelectCategoriasHistorico() {
    const categorias = await listarCategorias();
    campoHistoricoCategoria.querySelectorAll('option:not(:first-child)').forEach((opcao) => opcao.remove());
    categorias.forEach((categoria) => {
      const opcao = document.createElement('option');
      opcao.value = categoria.nome;
      opcao.textContent = categoria.nome;
      campoHistoricoCategoria.appendChild(opcao);
    });
  }

  // O filtro agora acontece no servidor: aqui só desenhamos a página
  function renderizarHistorico(resposta) {
    const filtradas = resposta.itens;
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
        tdCategoria.className = 'oculta-estreito';
        tdCategoria.textContent = saida.categoria_nome;
        tr.appendChild(tdCategoria);

        const tdQuantidade = document.createElement('td');
        tdQuantidade.className = 'direita';
        tdQuantidade.textContent = String(saida.quantidade);
        tr.appendChild(tdQuantidade);

        const tdMotivo = document.createElement('td');
        tdMotivo.className = 'oculta-estreito';
        tdMotivo.textContent = saida.motivo;
        tr.appendChild(tdMotivo);

        const tdOperador = document.createElement('td');
        tdOperador.textContent = saida.operador_nome;
        tr.appendChild(tdOperador);

        corpoHistorico.appendChild(tr);
      });
    }

    // O total é o do filtro inteiro, não o da página que está na tela
    resumoHistorico.textContent =
      resposta.total === 1 ? '1 saída encontrada' : `${resposta.total} saídas encontradas`;

    paginacao.desenhar(resposta);
  }

  // O seletor precisa de todos os produtos ativos, não de uma página
  async function carregarProdutos() {
    produtos = await listarProdutosParaSelecao();
    preencherSelectProdutos();
  }

  function filtrosHistorico() {
    return {
      busca: campoHistoricoBusca.value.trim(),
      categoria: campoHistoricoCategoria.value,
      pagina: paginacao.pagina,
    };
  }

  async function carregarHistorico() {
    const resposta = await listarSaidas(filtrosHistorico());
    saidas = resposta.itens;
    renderizarHistorico(resposta);
  }

  // Trocar filtro volta para a primeira página
  function recarregarHistoricoDoInicio() {
    paginacao.reiniciar();
    carregarHistorico();
  }

  function limparFormulario() {
    form.reset();
    erroGeral.hidden = true;
    atualizarCartaoEstoque(null);
    atualizarPreviaEstoque();
  }

  campoProduto.addEventListener('change', () => {
    atualizarCartaoEstoque(produtoSelecionado());
    atualizarPreviaEstoque();
  });

  campoQuantidade.addEventListener('input', atualizarPreviaEstoque);

  campoHistoricoBusca.addEventListener('input', debounceHistorico(recarregarHistoricoDoInicio, 300));
  campoHistoricoCategoria.addEventListener('change', recarregarHistoricoDoInicio);

  botaoLimpar.addEventListener('click', limparFormulario);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroGeral.hidden = true;

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

      exibirAviso(`Saída registrada: ${quantidade} un. de "${produto.nome}". Estoque atual: ${resultado.estoque_restante} un.`);

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
      await preencherSelectCategoriasHistorico();
      await carregarHistorico();
    } catch (erro) {
      erroGeral.textContent = `Não foi possível carregar os dados: ${erro.message}`;
      erroGeral.hidden = false;
    }
    atualizarPreviaEstoque();
  })();
})();
