(() => {
  const form = document.getElementById('form-filtros');
  const campoBusca = document.getElementById('campo-busca');
  const filtroCategoria = document.getElementById('filtro-categoria');
  const filtroEstoque = document.getElementById('filtro-estoque');
  const filtroStatus = document.getElementById('filtro-status');
  const filtroImagem = document.getElementById('filtro-imagem');
  const botaoLimparFiltros = document.getElementById('botao-limpar-filtros');
  const botaoLimparFiltrosVazio = document.getElementById('botao-limpar-filtros-vazio');
  const botaoNovoProduto = document.getElementById('botao-novo-produto');

  const resumoResultados = document.getElementById('resumo-resultados');
  const mensagemErro = document.getElementById('mensagem-erro');
  const tabelaWrapper = document.querySelector('.tabela-wrapper');
  const corpoTabela = document.getElementById('corpo-tabela-produtos');
  const estadoVazio = document.getElementById('estado-vazio');

  const modal = document.getElementById('modal-produto');
  const formProduto = document.getElementById('form-produto');
  const modalTitulo = document.getElementById('modal-produto-titulo');
  const modalErro = document.getElementById('modal-erro');
  const botaoFecharModal = document.getElementById('botao-fechar-modal');
  const botaoCancelarModal = document.getElementById('botao-cancelar-modal');
  const campoCategoriaModal = document.getElementById('produto-categoria');

  let categorias = [];
  let elementoAbriuModal = null;

  function debounce(funcao, atraso) {
    let temporizador;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => funcao(...args), atraso);
    };
  }

  function filtrosAtuais() {
    return {
      busca: campoBusca.value.trim(),
      categoria: filtroCategoria.value,
      estoque: filtroEstoque.value,
      status: filtroStatus.value,
      imagem: filtroImagem.value,
    };
  }

  function exibirErro(mensagem) {
    mensagemErro.textContent = mensagem;
    mensagemErro.hidden = false;
  }

  function limparErro() {
    mensagemErro.hidden = true;
    mensagemErro.textContent = '';
  }

  function informacaoEstoque(produto) {
    if (produto.quantidade === 0) {
      return { texto: 'Sem estoque', classe: 'estoque-critico' };
    }
    if (produto.quantidade <= produto.estoque_minimo) {
      return { texto: 'Estoque baixo', classe: 'estoque-baixo' };
    }
    return null;
  }

  function criarCelulaImagem(produto) {
    const td = document.createElement('td');
    td.className = 'col-imagem';

    if (produto.url_imagem) {
      const img = document.createElement('img');
      img.src = produto.url_imagem;
      img.alt = '';
      img.className = 'produto-imagem';
      img.addEventListener('error', () => {
        img.replaceWith(criarPlaceholderImagem());
      });
      td.appendChild(img);
    } else {
      td.appendChild(criarPlaceholderImagem());
    }

    return td;
  }

  function criarPlaceholderImagem() {
    const span = document.createElement('span');
    span.className = 'produto-imagem-padrao';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '🖼';
    return span;
  }

  function criarCelulaProduto(produto) {
    const td = document.createElement('td');
    td.className = 'col-produto';

    const nome = document.createElement('div');
    nome.className = 'produto-nome';
    nome.textContent = produto.nome;
    td.appendChild(nome);

    const codigo = document.createElement('div');
    codigo.className = 'produto-meta';
    codigo.textContent = `Código: ${produto.codigo_interno}`;
    td.appendChild(codigo);

    if (produto.descricao) {
      const descricao = document.createElement('div');
      descricao.className = 'produto-descricao';
      descricao.textContent = produto.descricao;
      td.appendChild(descricao);
    }

    const metaMobile = document.createElement('div');
    metaMobile.className = 'produto-meta-mobile';
    metaMobile.textContent = `${produto.categoria_nome} • ${produto.status === 'ativo' ? 'Ativo' : 'Inativo'}`;
    td.appendChild(metaMobile);

    return td;
  }

  function criarCelulaEstoque(produto) {
    const td = document.createElement('td');
    td.className = 'col-estoque';
    td.textContent = String(produto.quantidade);

    const info = informacaoEstoque(produto);
    if (info) {
      const etiqueta = document.createElement('div');
      etiqueta.className = `etiqueta ${info.classe}`;
      etiqueta.textContent = info.texto;
      td.appendChild(etiqueta);
    }

    return td;
  }

  function criarCelulaStatus(produto) {
    const td = document.createElement('td');
    td.className = 'col-status';

    const badge = document.createElement('span');
    badge.className = `badge-status ${produto.status}`;
    badge.textContent = produto.status === 'ativo' ? 'Ativo' : 'Inativo';
    td.appendChild(badge);

    return td;
  }

  function criarCelulaAcoes(produto) {
    const td = document.createElement('td');
    td.className = 'col-acoes';

    const container = document.createElement('div');
    container.className = 'linha-acoes';

    const botaoEditar = document.createElement('button');
    botaoEditar.type = 'button';
    botaoEditar.className = 'botao-icone';
    botaoEditar.setAttribute('aria-label', `Editar ${produto.nome}`);
    botaoEditar.textContent = '✎';
    botaoEditar.addEventListener('click', (evento) => abrirModalEdicao(produto, evento.currentTarget));

    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'botao-icone perigo';
    botaoExcluir.setAttribute('aria-label', `Excluir ${produto.nome}`);
    botaoExcluir.textContent = '🗑';
    botaoExcluir.addEventListener('click', () => confirmarExclusao(produto));

    container.appendChild(botaoEditar);
    container.appendChild(botaoExcluir);
    td.appendChild(container);

    return td;
  }

  function criarLinhaProduto(produto) {
    const tr = document.createElement('tr');
    tr.appendChild(criarCelulaImagem(produto));
    tr.appendChild(criarCelulaProduto(produto));

    const tdCategoria = document.createElement('td');
    tdCategoria.className = 'col-categoria';
    tdCategoria.textContent = produto.categoria_nome;
    tr.appendChild(tdCategoria);

    tr.appendChild(criarCelulaEstoque(produto));

    const tdMinimo = document.createElement('td');
    tdMinimo.className = 'col-minimo';
    tdMinimo.textContent = String(produto.estoque_minimo);
    tr.appendChild(tdMinimo);

    tr.appendChild(criarCelulaStatus(produto));
    tr.appendChild(criarCelulaAcoes(produto));

    return tr;
  }

  function renderizarProdutos(produtos) {
    corpoTabela.innerHTML = '';

    if (produtos.length === 0) {
      tabelaWrapper.hidden = true;
      estadoVazio.hidden = false;
    } else {
      tabelaWrapper.hidden = false;
      estadoVazio.hidden = true;
      produtos.forEach((produto) => corpoTabela.appendChild(criarLinhaProduto(produto)));
    }

    resumoResultados.textContent =
      produtos.length === 1 ? '1 produto encontrado' : `${produtos.length} produtos encontrados`;
  }

  async function carregarProdutos() {
    try {
      limparErro();
      const produtos = await listarProdutos(filtrosAtuais());
      renderizarProdutos(produtos);
    } catch (erro) {
      exibirErro(`Não foi possível carregar os produtos: ${erro.message}`);
      renderizarProdutos([]);
    }
  }

  async function carregarCategorias() {
    categorias = await listarCategorias();

    filtroCategoria.querySelectorAll('option:not(:first-child)').forEach((opcao) => opcao.remove());
    campoCategoriaModal.querySelectorAll('option:not(:first-child)').forEach((opcao) => opcao.remove());

    categorias.forEach((categoria) => {
      const opcaoFiltro = document.createElement('option');
      opcaoFiltro.value = categoria.nome;
      opcaoFiltro.textContent = categoria.nome;
      filtroCategoria.appendChild(opcaoFiltro);

      const opcaoModal = document.createElement('option');
      opcaoModal.value = categoria.id;
      opcaoModal.textContent = categoria.nome;
      campoCategoriaModal.appendChild(opcaoModal);
    });
  }

  function limparFiltros() {
    form.reset();
    carregarProdutos();
    campoBusca.focus();
  }

  function abrirModal(elementoQueAbriu) {
    elementoAbriuModal = elementoQueAbriu || document.activeElement;
    modalErro.hidden = true;
    modal.showModal();
    document.getElementById('produto-nome').focus();
  }

  function fecharModal() {
    modal.close();
  }

  function exigirLoginParaEscrita() {
    if (!obterToken()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function abrirModalNovo() {
    if (!exigirLoginParaEscrita()) return;
    formProduto.reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('produto-quantidade').value = '0';
    document.getElementById('produto-estoque-minimo').value = '0';
    modalTitulo.textContent = 'Novo produto';
    abrirModal(botaoNovoProduto);
  }

  function abrirModalEdicao(produto, botaoOrigem) {
    if (!exigirLoginParaEscrita()) return;
    formProduto.reset();
    document.getElementById('produto-id').value = produto.id;
    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-codigo').value = produto.codigo_interno;
    campoCategoriaModal.value = String(produto.categoria_id);
    document.getElementById('produto-descricao').value = produto.descricao || '';
    document.getElementById('produto-quantidade').value = produto.quantidade;
    document.getElementById('produto-estoque-minimo').value = produto.estoque_minimo;
    document.getElementById('produto-status').value = produto.status;
    document.getElementById('produto-imagem').value = produto.url_imagem || '';
    modalTitulo.textContent = `Editar ${produto.nome}`;
    abrirModal(botaoOrigem);
  }

  async function confirmarExclusao(produto) {
    if (!exigirLoginParaEscrita()) return;
    const confirmou = window.confirm(`Excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`);
    if (!confirmou) return;

    try {
      await excluirProduto(produto.id);
      await carregarProdutos();
    } catch (erro) {
      exibirErro(`Não foi possível excluir o produto: ${erro.message}`);
    }
  }

  async function onSubmitFormProduto(evento) {
    evento.preventDefault();
    modalErro.hidden = true;

    const id = document.getElementById('produto-id').value;
    const dados = {
      nome: document.getElementById('produto-nome').value.trim(),
      codigo_interno: document.getElementById('produto-codigo').value.trim(),
      categoria_id: Number(campoCategoriaModal.value) || null,
      descricao: document.getElementById('produto-descricao').value.trim(),
      quantidade: Number(document.getElementById('produto-quantidade').value) || 0,
      estoque_minimo: Number(document.getElementById('produto-estoque-minimo').value) || 0,
      status: document.getElementById('produto-status').value,
      url_imagem: document.getElementById('produto-imagem').value.trim(),
    };

    try {
      if (id) {
        await atualizarProduto(id, dados);
      } else {
        await criarProduto(dados);
      }
      fecharModal();
      await carregarProdutos();
    } catch (erro) {
      modalErro.textContent = erro.message;
      modalErro.hidden = false;
    }
  }

  form.addEventListener('submit', (evento) => evento.preventDefault());
  campoBusca.addEventListener('input', debounce(carregarProdutos, 300));
  [filtroCategoria, filtroEstoque, filtroStatus, filtroImagem].forEach((campo) => {
    campo.addEventListener('change', carregarProdutos);
  });
  botaoLimparFiltros.addEventListener('click', limparFiltros);
  botaoLimparFiltrosVazio.addEventListener('click', limparFiltros);
  botaoNovoProduto.addEventListener('click', () => abrirModalNovo());

  botaoFecharModal.addEventListener('click', fecharModal);
  botaoCancelarModal.addEventListener('click', fecharModal);
  formProduto.addEventListener('submit', onSubmitFormProduto);
  modal.addEventListener('close', () => {
    if (elementoAbriuModal) elementoAbriuModal.focus();
  });

  montarBarraNavegacao({ exigirLogin: false });

  (async function iniciar() {
    try {
      await carregarCategorias();
    } catch (erro) {
      exibirErro(`Não foi possível carregar as categorias: ${erro.message}`);
    }
    await carregarProdutos();
  })();
})();
