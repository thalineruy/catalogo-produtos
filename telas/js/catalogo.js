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
  const tabelaWrapper = document.querySelector('.rolagem-tabela');
  const corpoTabela = document.getElementById('corpo-tabela-produtos');
  const estadoVazio = document.getElementById('estado-vazio');

  const fundoModal = document.getElementById('fundo-modal-produto');
  const formProduto = document.getElementById('form-produto');
  const modalTitulo = document.getElementById('modal-produto-titulo');
  const modalErro = document.getElementById('modal-erro');
  const botaoFecharModal = document.getElementById('botao-fechar-modal');
  const botaoCancelarModal = document.getElementById('botao-cancelar-modal');
  const campoCategoriaModal = document.getElementById('produto-categoria');

  const botaoExportarCsv = document.getElementById('botao-exportar-csv');

  let categorias = [];
  let elementoAbriuModal = null;
  let produtosNaTela = [];

  const ICONE_IMAGEM =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="3" y="4" width="18" height="16"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-5 4 4 3-3 4 4"/></svg>';
  const ICONE_EDITAR =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z"/><path d="M14 6l4 4"/></svg>';
  const ICONE_EXCLUIR =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

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
      return { texto: 'Sem estoque' };
    }
    if (produto.quantidade <= produto.estoque_minimo) {
      return { texto: 'Estoque baixo' };
    }
    return null;
  }

  function criarCelulaImagem(produto) {
    const td = document.createElement('td');

    if (produto.url_imagem) {
      const img = document.createElement('img');
      img.src = produto.url_imagem;
      img.alt = '';
      img.className = 'miniatura';
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
    span.className = 'miniatura-vazia';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = ICONE_IMAGEM;
    return span;
  }

  function criarCelulaProduto(produto) {
    const td = document.createElement('td');

    const nome = document.createElement('div');
    nome.textContent = produto.nome;
    td.appendChild(nome);

    const codigo = document.createElement('div');
    codigo.className = 'apagado';
    codigo.textContent = `Código: ${produto.codigo_interno}`;
    td.appendChild(codigo);

    if (produto.descricao) {
      const descricao = document.createElement('div');
      descricao.className = 'apagado';
      descricao.textContent = produto.descricao;
      td.appendChild(descricao);
    }

    return td;
  }

  function criarCelulaEstoque(produto) {
    const td = document.createElement('td');
    td.textContent = String(produto.quantidade);

    const info = informacaoEstoque(produto);
    if (info) {
      const etiqueta = document.createElement('div');
      etiqueta.className = 'quantidade-alerta';
      etiqueta.textContent = info.texto;
      td.appendChild(etiqueta);
    }

    return td;
  }

  function criarCelulaStatus(produto) {
    const td = document.createElement('td');
    td.className = 'oculta-estreito';

    const badge = document.createElement('span');
    badge.className = 'etiqueta';
    badge.textContent = produto.status === 'ativo' ? 'Ativo' : 'Inativo';
    td.appendChild(badge);

    return td;
  }

  function criarCelulaAcoes(produto) {
    const td = document.createElement('td');

    const container = document.createElement('div');
    container.className = 'acoes-linha';

    const botaoEditar = document.createElement('button');
    botaoEditar.type = 'button';
    botaoEditar.className = 'botao-icone';
    botaoEditar.setAttribute('aria-label', `Editar ${produto.nome}`);
    botaoEditar.innerHTML = ICONE_EDITAR;
    botaoEditar.addEventListener('click', (evento) => abrirModalEdicao(produto, evento.currentTarget));

    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'botao-icone botao-icone-perigo';
    botaoExcluir.setAttribute('aria-label', `Excluir ${produto.nome}`);
    botaoExcluir.innerHTML = ICONE_EXCLUIR;
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
    tdCategoria.className = 'oculta-estreito';
    tdCategoria.textContent = produto.categoria_nome;
    tr.appendChild(tdCategoria);

    tr.appendChild(criarCelulaEstoque(produto));

    const tdMinimo = document.createElement('td');
    tdMinimo.className = 'oculta-estreito';
    tdMinimo.textContent = String(produto.estoque_minimo);
    tr.appendChild(tdMinimo);

    tr.appendChild(criarCelulaStatus(produto));
    tr.appendChild(criarCelulaAcoes(produto));

    return tr;
  }

  function renderizarProdutos(produtos) {
    produtosNaTela = produtos;
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

  /* ---------- Exportar CSV ---------- */

  // Separador ";" e BOM no início: é o que o Excel em português espera
  // para abrir o arquivo já com as colunas separadas e os acentos certos.
  function escaparCampoCsv(valor) {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    return `"${texto.replace(/"/g, '""')}"`;
  }

  function montarCsv(produtos) {
    const colunas = [
      ['Nome', (p) => p.nome],
      ['Código interno', (p) => p.codigo_interno],
      ['Categoria', (p) => p.categoria_nome],
      ['Descrição', (p) => p.descricao || ''],
      ['Quantidade em estoque', (p) => p.quantidade],
      ['Estoque mínimo', (p) => p.estoque_minimo],
      ['Status', (p) => (p.status === 'ativo' ? 'Ativo' : 'Inativo')],
      ['Tem imagem', (p) => (p.url_imagem ? 'Sim' : 'Não')],
    ];

    const linhas = [colunas.map(([titulo]) => escaparCampoCsv(titulo)).join(';')];
    produtos.forEach((produto) => {
      linhas.push(colunas.map(([, ler]) => escaparCampoCsv(ler(produto))).join(';'));
    });

    return `\uFEFF${linhas.join('\r\n')}\r\n`;
  }

  function nomeArquivoCsv() {
    const agora = new Date();
    const doisDigitos = (n) => String(n).padStart(2, '0');
    return `catalogo-produtos-${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}.csv`;
  }

  function exportarCsv() {
    if (produtosNaTela.length === 0) {
      exibirAviso('Não há produtos na lista para exportar. Ajuste os filtros e tente de novo.');
      return;
    }

    const blob = new Blob([montarCsv(produtosNaTela)], { type: 'text/csv;charset=utf-8;' });
    const endereco = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = endereco;
    link.download = nomeArquivoCsv();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(endereco);

    exibirAviso(
      produtosNaTela.length === 1
        ? '1 produto exportado para CSV.'
        : `${produtosNaTela.length} produtos exportados para CSV.`,
    );
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

  function fecharComEsc(evento) {
    if (evento.key === 'Escape') fecharModal();
  }

  function abrirModal(elementoQueAbriu) {
    elementoAbriuModal = elementoQueAbriu || document.activeElement;
    modalErro.hidden = true;
    fundoModal.hidden = false;
    document.addEventListener('keydown', fecharComEsc);
    document.getElementById('produto-nome').focus();
  }

  function fecharModal() {
    fundoModal.hidden = true;
    document.removeEventListener('keydown', fecharComEsc);
    if (elementoAbriuModal) elementoAbriuModal.focus();
  }

  function exigirLoginParaEscrita() {
    if (!obterToken()) {
      window.location.href = 'index.html';
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
      exibirAviso(`Produto "${produto.nome}" excluído.`);
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
        exibirAviso(`Produto "${dados.nome}" atualizado.`);
      } else {
        await criarProduto(dados);
        exibirAviso(`Produto "${dados.nome}" criado.`);
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
  botaoExportarCsv.addEventListener('click', exportarCsv);

  botaoFecharModal.addEventListener('click', fecharModal);
  botaoCancelarModal.addEventListener('click', fecharModal);
  formProduto.addEventListener('submit', onSubmitFormProduto);

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
