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

// As três listagens abaixo devolvem { itens, total, pagina, porPagina,
// totalPaginas } — não um vetor solto, porque o servidor entrega uma
// página de cada vez.
async function listarSaidas(filtros = {}) {
  return apiFetch(`/saidas${construirQuery(filtros)}`);
}

async function listarLogs(filtros = {}) {
  return apiFetch(`/logs${construirQuery(filtros)}`);
}

// Listas completas, fora da paginação, para os casos em que uma página
// não serve: o seletor de produtos, o sino de avisos e o filtro de
// operadores dos relatórios.
async function listarProdutosParaSelecao() {
  return apiFetch('/produtos/para-selecao');
}

async function listarAlertasDeEstoque() {
  return apiFetch('/produtos/alertas-estoque');
}

async function listarOperadoresDeSaida() {
  return apiFetch('/saidas/operadores');
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

// Não passa pelo apiFetch: o corpo é FormData, e definir Content-Type à mão
// impediria o navegador de escrever a fronteira entre as partes.
async function enviarImagemProduto(arquivo) {
  const dados = new FormData();
  dados.append('imagem', arquivo);

  const token = obterToken();
  const resposta = await fetch(`${API_URL}/produtos/imagem`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: dados,
  });

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error((corpo && corpo.erro) || `Erro na requisição: ${resposta.status}`);
  }
  return corpo;
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

// Reenvia o link de ativação. Caminho normal para quem esqueceu a senha e
// tem acesso ao próprio e-mail; o reset acima é o plano B, para quem está
// sem acesso à caixa de entrada.
async function reenviarConviteUsuario(id) {
  return apiFetch(`/usuarios/${id}/convite`, { method: 'POST' });
}

/* ---------- Convite de acesso (rotas públicas, sem token) ---------- */

async function validarConvite(token) {
  return apiFetch('/convites/validar', { method: 'POST', body: JSON.stringify({ token }) });
}

async function definirSenhaPorConvite(token, senha) {
  return apiFetch('/convites/definir-senha', {
    method: 'POST',
    body: JSON.stringify({ token, senha }),
  });
}

/* ---------- Fila de pedidos de acesso ---------- */

async function listarSolicitacoesAcesso(filtros = {}) {
  return apiFetch(`/solicitacoes-acesso${construirQuery(filtros)}`);
}

async function contarSolicitacoesPendentes() {
  return apiFetch('/solicitacoes-acesso/pendentes');
}

async function marcarSolicitacaoAtendida(id) {
  return apiFetch(`/solicitacoes-acesso/${id}/atendida`, { method: 'PUT' });
}

async function buscarEstatisticas() {
  return apiFetch('/estatisticas');
}

async function solicitarRecuperacaoSenha(email, motivo) {
  return apiFetch('/recuperacao-senha', { method: 'POST', body: JSON.stringify({ email, motivo }) });
}

async function buscarMinhaConta() {
  return apiFetch('/usuarios/eu');
}

async function trocarMinhaSenha(senhaAtual, novaSenha) {
  return apiFetch('/usuarios/eu/senha', {
    method: 'PUT',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}

// Não passa pelo apiFetch: aqui a falha é a informação que interessa,
// então o erro é devolvido em vez de lançado.
async function conferirSaudeDoServidor() {
  try {
    const resposta = await fetch(`${API_URL}/saude`);
    const dados = await resposta.json().catch(() => null);
    if (resposta.ok) return { servidor: 'ok', banco: (dados && dados.banco) || 'ok' };
    return { servidor: 'ok', banco: (dados && dados.banco) || 'fora' };
  } catch (erro) {
    return { servidor: 'fora', banco: 'desconhecido' };
  }
}
