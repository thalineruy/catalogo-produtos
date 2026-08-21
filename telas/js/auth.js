const CHAVE_TOKEN = 'catalogo_token';
const CHAVE_USUARIO = 'catalogo_usuario';
const CHAVE_COOKIES = 'catalogo_cookies_aceitos';

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

let temporizadorAviso = null;

function exibirAviso(mensagem) {
  const toast = document.getElementById('toast-aviso');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    toast.hidden = true;
  }, 10000);
}

function iniciarBarraCookies() {
  const barra = document.getElementById('barra-cookies');
  if (!barra) return;

  if (localStorage.getItem(CHAVE_COOKIES) === 'sim') {
    barra.hidden = true;
    return;
  }

  barra.hidden = false;
  const botao = document.getElementById('botao-aceitar-cookies');
  if (botao) {
    botao.addEventListener('click', () => {
      localStorage.setItem(CHAVE_COOKIES, 'sim');
      barra.hidden = true;
    });
  }
}

function montarBarraNavegacao({ exigirLogin = false } = {}) {
  const usuario = obterUsuario();

  if (exigirLogin && (!obterToken() || !usuario)) {
    window.location.href = 'login.html';
    return null;
  }

  carregarLogoBarraSuperior();
  iniciarBarraCookies();

  const elementoUsuario = document.getElementById('usuario-logado');
  const elementoInicial = document.getElementById('usuario-inicial');
  const elementoNome = document.getElementById('usuario-nome');
  const elementoNivel = document.getElementById('usuario-nivel');
  const botaoSair = document.getElementById('botao-sair');
  const linkEntrar = document.getElementById('link-entrar');
  const linkAdministracao = document.getElementById('link-administracao');

  if (usuario) {
    const nivelTexto = usuario.nivel === 'administrador' ? 'Administrador' : 'Operador';
    if (elementoUsuario) elementoUsuario.hidden = false;
    if (elementoInicial) elementoInicial.textContent = usuario.nome.trim().charAt(0).toUpperCase();
    if (elementoNome) elementoNome.textContent = usuario.nome;
    if (elementoNivel) elementoNivel.textContent = nivelTexto;
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
