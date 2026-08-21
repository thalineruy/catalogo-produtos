const CHAVE_TOKEN = 'catalogo_token';
const CHAVE_USUARIO = 'catalogo_usuario';

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

function obterUsuario() {
  const bruto = localStorage.getItem(CHAVE_USUARIO);
  return bruto ? JSON.parse(bruto) : null;
}

function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

function encerrarSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}

function exigirSessao() {
  const usuario = obterUsuario();
  if (!obterToken() || !usuario) {
    window.location.href = 'login.html';
    return null;
  }
  return usuario;
}

async function carregarLogoBarraSuperior() {
  const elemento = document.getElementById('logo-barra-superior');
  if (!elemento || !obterToken() || typeof buscarEmpresa !== 'function') return;

  try {
    const empresa = await buscarEmpresa();
    if (empresa && empresa.url_logotipo) {
      elemento.addEventListener('error', () => {
        elemento.hidden = true;
      });
      elemento.src = empresa.url_logotipo;
      elemento.hidden = false;
    }
  } catch (erro) {
    elemento.hidden = true;
  }
}

function montarBarraNavegacao({ exigirLogin = false } = {}) {
  const usuario = obterUsuario();

  if (exigirLogin && (!obterToken() || !usuario)) {
    window.location.href = 'login.html';
    return null;
  }

  carregarLogoBarraSuperior();

  const elementoUsuario = document.getElementById('usuario-logado');
  const botaoSair = document.getElementById('botao-sair');
  const linkEntrar = document.getElementById('link-entrar');
  const linkAdministracao = document.getElementById('link-administracao');

  if (usuario) {
    if (elementoUsuario) {
      const nivel = usuario.nivel === 'administrador' ? 'Administrador' : 'Operador';
      elementoUsuario.textContent = `${usuario.nome} (${nivel})`;
      elementoUsuario.hidden = false;
    }
    if (botaoSair) {
      botaoSair.hidden = false;
      botaoSair.addEventListener('click', () => {
        encerrarSessao();
        window.location.href = 'login.html';
      });
    }
    if (linkEntrar) linkEntrar.hidden = true;
    if (linkAdministracao) linkAdministracao.hidden = usuario.nivel !== 'administrador';
  } else {
    if (elementoUsuario) elementoUsuario.hidden = true;
    if (botaoSair) botaoSair.hidden = true;
    if (linkEntrar) linkEntrar.hidden = false;
    if (linkAdministracao) linkAdministracao.hidden = true;
  }

  return usuario;
}
