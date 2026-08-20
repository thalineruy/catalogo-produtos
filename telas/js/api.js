async function apiFetch(caminho, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  if (!resposta.ok) {
    throw new Error(`Erro na requisição: ${resposta.status}`);
  }

  return resposta.json();
}
