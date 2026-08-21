async function apiFetch(caminho, opcoes = {}) {
  const token = typeof obterToken === 'function' ? obterToken() : null;
  const cabecalhos = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: cabecalhos,
  });

  if (resposta.status === 204) {
    return null;
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem = (dados && dados.erro) || `Erro na requisição: ${resposta.status}`;
    throw new Error(mensagem);
  }

  return dados;
}

function construirQuery(filtros) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

async function login(email, senha) {
  return apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
}

async function listarCategorias() {
  return apiFetch('/categorias');
}

async function criarCategoria(nome) {
  return apiFetch('/categorias', { method: 'POST', body: JSON.stringify({ nome }) });
}

async function listarProdutos(filtros = {}) {
  return apiFetch(`/produtos${construirQuery(filtros)}`);
}

async function criarProduto(dados) {
  return apiFetch('/produtos', { method: 'POST', body: JSON.stringify(dados) });
}

async function atualizarProduto(id, dados) {
  return apiFetch(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

async function excluirProduto(id) {
  return apiFetch(`/produtos/${id}`, { method: 'DELETE' });
}

async function registrarSaida(dados) {
  return apiFetch('/saidas', { method: 'POST', body: JSON.stringify(dados) });
}

async function listarSaidas(filtros = {}) {
  return apiFetch(`/saidas${construirQuery(filtros)}`);
}

async function listarLogs(filtros = {}) {
  return apiFetch(`/logs${construirQuery(filtros)}`);
}

async function listarUsuarios() {
  return apiFetch('/usuarios');
}
