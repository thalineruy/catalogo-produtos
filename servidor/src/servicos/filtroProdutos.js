const MARCAS_DIACRITICAS = new RegExp(String.fromCharCode(0x5b) + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + String.fromCharCode(0x5d), 'g');

function normalizar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase();
}

function correspondeBusca(produto, termo) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;

  const alvo = normalizar(
    [produto.nome, produto.codigo_interno, produto.categoria_nome, produto.descricao, produto.status]
      .filter(Boolean)
      .join(' '),
  );

  return palavras.every((palavra) => alvo.includes(palavra));
}

function correspondeEstoque(produto, estoque) {
  switch (estoque) {
    case 'baixo':
      return produto.quantidade > 0 && produto.quantidade <= produto.estoque_minimo;
    case 'zerado':
      return produto.quantidade === 0;
    case 'acima':
      return produto.quantidade > 20;
    default:
      return true;
  }
}

function correspondeImagem(produto, imagem) {
  const temImagem = Boolean(produto.url_imagem && produto.url_imagem.trim());
  if (imagem === 'com') return temImagem;
  if (imagem === 'sem') return !temImagem;
  return true;
}

function aplicarFiltros(produtos, filtros = {}) {
  const { busca, categoria, estoque, status, imagem } = filtros;

  return produtos.filter((produto) => {
    if (busca && !correspondeBusca(produto, busca)) return false;
    if (categoria && produto.categoria_nome !== categoria) return false;
    if (estoque && !correspondeEstoque(produto, estoque)) return false;
    if (status && produto.status !== status) return false;
    if (imagem && !correspondeImagem(produto, imagem)) return false;
    return true;
  });
}

module.exports = { aplicarFiltros, normalizar };
