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

async function login(email, senha, dispositivoToken) {
  return apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, senha, dispositivoToken }) });
}

async function verificarCodigoLogin(tokenPendente, codigo, confiarDispositivo) {
  return apiFetch('/login/verificar-codigo', {
    method: 'POST',
    body: JSON.stringify({ tokenPendente, codigo, confiarDispositivo }),
  });
}

async function removerTotpUsuario(id) {
  return apiFetch(`/usuarios/${id}/totp`, { method: 'DELETE' });
}

async function listarCategorias() {
  return apiFetch('/categorias');
}

async function criarCategoria(nome) {
  return apiFetch('/categorias', { method: 'POST', body: JSON.stringify({ nome }) });
}

async function atualizarCategoria(id, nome) {
  return apiFetch(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify({ nome }) });
}

async function excluirCategoria(id) {
  return apiFetch(`/categorias/${id}`, { method: 'DELETE' });
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

async function gerarRelatorioSaidas(filtros = {}) {
  return apiFetch(`/relatorios/saidas${construirQuery(filtros)}`);
}

async function buscarEmpresa() {
  return apiFetch('/empresa');
}

async function atualizarEmpresa(dados) {
  return apiFetch('/empresa', { method: 'PUT', body: JSON.stringify(dados) });
}

async function enviarLogotipoEmpresa(arquivo) {
  const dadosFormulario = new FormData();
  dadosFormulario.append('logotipo', arquivo);

  const token = obterToken();
  const resposta = await fetch(`${API_URL}/empresa/logotipo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: dadosFormulario,
  });

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new Error((dados && dados.erro) || `Erro na requisição: ${resposta.status}`);
  }

  return dados;
}

async function criarUsuario(dados) {
  return apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(dados) });
}

async function alterarNivelUsuario(id, nivel) {
  return apiFetch(`/usuarios/${id}/nivel`, { method: 'PUT', body: JSON.stringify({ nivel }) });
}

async function resetarSenhaUsuario(id) {
  return apiFetch(`/usuarios/${id}/reset-senha`, { method: 'POST' });
}

async function buscarEstatisticas() {
  return apiFetch('/estatisticas');
}

async function solicitarRecuperacaoSenha(email, motivo) {
  return apiFetch('/recuperacao-senha', { method: 'POST', body: JSON.stringify({ email, motivo }) });
}
