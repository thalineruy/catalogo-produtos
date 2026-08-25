const { pool } = require('../db');

const SELECT_BASE = `
  SELECT p.id, p.nome, p.codigo_interno, p.categoria_id, c.nome AS categoria_nome,
         p.descricao, p.quantidade, p.estoque_minimo, p.status, p.url_imagem, p.criado_em
  FROM produtos p
  JOIN categorias c ON c.id = p.categoria_id
`;

// Filtra em SQL, e não na memória: antes o servidor trazia a tabela
// inteira a cada consulta e descartava quase tudo em seguida.
const CAMPOS_DE_BUSCA =
  "concat_ws(' ', p.nome, p.codigo_interno, c.nome, p.descricao, p.status)";

// Semelhanca minima para a busca tolerante aceitar uma palavra. Calibrado
// contra o catalogo: erros de digitacao reais ficam em 0,50 ou acima, e
// palavras de outro assunto nao passam de 0,29.
const SEMELHANCA_MINIMA = 0.4;

// tolerante = true troca o casamento por trecho pelo casamento por
// semelhanca, que encontra "Armacao" a partir de "armasao". Usado so
// quando a busca exata nao devolve nada, para quem digita certo nunca
// receber resultado aproximado no meio dos certos.
async function listar({
  busca, categoria, estoque, status, imagem, porPagina, deslocamento, tolerante = false,
} = {}) {
  const condicoes = [];
  const params = [];

  // Cada palavra precisa aparecer em algum dos campos, ignorando acentos:
  // "arma preta" encontra "Armação Acetato Preta".
  const palavras = (busca || '').trim().split(/\s+/).filter(Boolean);
  palavras.forEach((palavra) => {
    if (tolerante) {
      params.push(palavra, SEMELHANCA_MINIMA);
      condicoes.push(
        `word_similarity(unaccent($${params.length - 1}), unaccent(${CAMPOS_DE_BUSCA}))
         >= $${params.length}`,
      );
    } else {
      params.push(`%${palavra}%`);
      condicoes.push(`unaccent(${CAMPOS_DE_BUSCA}) ILIKE unaccent($${params.length})`);
    }
  });

  if (categoria) {
    params.push(categoria);
    condicoes.push(`c.nome = $${params.length}`);
  }
  if (status) {
    params.push(status);
    condicoes.push(`p.status = $${params.length}`);
  }

  if (estoque === 'baixo') {
    condicoes.push('p.quantidade > 0 AND p.quantidade <= p.estoque_minimo');
  } else if (estoque === 'zerado') {
    condicoes.push('p.quantidade = 0');
  } else if (estoque === 'acima') {
    condicoes.push('p.quantidade > 20');
  }

  if (imagem === 'com') {
    condicoes.push("p.url_imagem IS NOT NULL AND btrim(p.url_imagem) <> ''");
  } else if (imagem === 'sem') {
    condicoes.push("(p.url_imagem IS NULL OR btrim(p.url_imagem) = '')");
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  let limite = '';
  if (porPagina) {
    params.push(porPagina, deslocamento);
    limite = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT p.id, p.nome, p.codigo_interno, p.categoria_id, c.nome AS categoria_nome,
            p.descricao, p.quantidade, p.estoque_minimo, p.status, p.url_imagem, p.criado_em,
            COUNT(*) OVER() AS total_geral
     FROM produtos p
     JOIN categorias c ON c.id = p.categoria_id
     ${where}
     ORDER BY p.nome
     ${limite}`,
    params,
  );
  return rows;
}

// Lista enxuta para o seletor de produtos da tela de saída. Fica fora da
// paginação porque um <select> precisa de todas as opções; em troca traz
// só as colunas que o seletor usa.
async function listarParaSelecao() {
  const { rows } = await pool.query(
    `SELECT p.id, p.nome, p.codigo_interno, p.quantidade
     FROM produtos p
     WHERE p.status = 'ativo'
     ORDER BY p.nome`,
  );
  return rows;
}

// Produtos que precisam de reposição, para o sino de avisos. Fica fora da
// paginação de propósito: o sino precisa da conta certa, não de uma página.
// O teto de 100 evita uma lista gigante se o estoque estiver todo furado.
async function listarAlertasDeEstoque() {
  const { rows } = await pool.query(
    `${SELECT_BASE}
     WHERE p.quantidade = 0 OR p.quantidade <= p.estoque_minimo
     ORDER BY p.quantidade, p.nome
     LIMIT 100`,
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(`${SELECT_BASE} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function buscarPorCodigo(codigoInterno, ignorarId = null) {
  const params = [codigoInterno];
  let sql = 'SELECT id FROM produtos WHERE codigo_interno = $1';
  if (ignorarId) {
    sql += ' AND id <> $2';
    params.push(ignorarId);
  }
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function criar(dados) {
  const { nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem } = dados;
  const { rows } = await pool.query(
    `INSERT INTO produtos (nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      nome,
      codigo_interno,
      categoria_id,
      descricao || null,
      quantidade ?? 0,
      estoque_minimo ?? 0,
      status || 'ativo',
      url_imagem || null,
    ],
  );
  return buscarPorId(rows[0].id);
}

async function atualizar(id, dados) {
  const { nome, codigo_interno, categoria_id, descricao, quantidade, estoque_minimo, status, url_imagem } = dados;
  await pool.query(
    `UPDATE produtos
     SET nome = $1, codigo_interno = $2, categoria_id = $3, descricao = $4,
         quantidade = $5, estoque_minimo = $6, status = $7, url_imagem = $8
     WHERE id = $9`,
    [
      nome,
      codigo_interno,
      categoria_id,
      descricao || null,
      quantidade ?? 0,
      estoque_minimo ?? 0,
      status || 'ativo',
      url_imagem || null,
      id,
    ],
  );
  return buscarPorId(id);
}

async function excluir(id) {
  await pool.query('DELETE FROM produtos WHERE id = $1', [id]);
}

module.exports = {
  listar,
  listarParaSelecao,
  listarAlertasDeEstoque,
  buscarPorId,
  buscarPorCodigo,
  criar,
  atualizar,
  excluir,
};
