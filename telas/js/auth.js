const CHAVE_TOKEN = 'catalogo_token';
const CHAVE_USUARIO = 'catalogo_usuario';
const CHAVE_COOKIES = 'catalogo_cookies_aceitos';
const CHAVE_DISPOSITIVO = 'catalogo_dispositivo_confiavel';

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

// Token de "dispositivo confiável" (30 dias), guardado por fora da sessão:
// sobrevive ao logout, para que o próximo login neste navegador possa
// pular a verificação em duas etapas.
function obterTokenDispositivo() {
  return localStorage.getItem(CHAVE_DISPOSITIVO);
}

function salvarTokenDispositivo(token) {
  localStorage.setItem(CHAVE_DISPOSITIVO, token);
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
    window.location.href = 'index.html';
    return null;
  }
  return usuario;
}

const LOGOTIPO_PADRAO = 'logo-padrao.svg';

// Logotipo é sempre imagem: se a empresa tem um gravado, usa o endereço dela;
// senão, ou se ele falhar ao carregar, cai para o padrão do sistema.
function aplicarLogotipo(imagem, empresa) {
  if (!imagem) return;

  function usarPadrao() {
    imagem.src = LOGOTIPO_PADRAO;
    imagem.alt = 'Logotipo padrão do sistema';
  }

  imagem.onerror = () => {
    imagem.onerror = null;
    usarPadrao();
  };

  if (empresa && empresa.url_logotipo) {
    imagem.alt = `Logotipo da ${empresa.nome}`;
    imagem.src = empresa.url_logotipo;
  } else {
    usarPadrao();
  }

  imagem.hidden = false;
}

async function carregarLogoBarraSuperior() {
  const elemento = document.getElementById('logo-barra-superior');
  if (!elemento) return;

  if (!obterToken() || typeof buscarEmpresa !== 'function') {
    aplicarLogotipo(elemento, null);
    return;
  }

  try {
    const empresa = await buscarEmpresa();
    aplicarLogotipo(elemento, empresa);
  } catch (erro) {
    aplicarLogotipo(elemento, null);
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

  if (localStorage.getItem(CHAVE_COOKIES)) {
    barra.hidden = true;
  } else {
    barra.hidden = false;
  }

  function dispensar(escolha) {
    localStorage.setItem(CHAVE_COOKIES, escolha);
    barra.hidden = true;
  }

  const botaoAceitar = document.getElementById('botao-aceitar-cookies');
  if (botaoAceitar) botaoAceitar.addEventListener('click', () => dispensar('todos'));

  const botaoRecusar = document.getElementById('botao-recusar-cookies');
  if (botaoRecusar) botaoRecusar.addEventListener('click', () => dispensar('necessarios'));

  const botaoPolitica = document.getElementById('botao-politica-privacidade');
  if (botaoPolitica) botaoPolitica.addEventListener('click', abrirPoliticaPrivacidade);
}

/* ---------- Política de Privacidade ----------
   Conteúdo copiado do mockup aprovado. Os trechos que identificam a
   empresa (nome, CNPJ, endereço, responsável, contato) são preenchidos
   com os dados reais cadastrados em Administração, nunca fixos aqui —
   o resto do texto é genérico e não depende de qual empresa usa o sistema. */
const POLITICA_SECOES = [
  {
    numero: '01',
    titulo: 'Quem é o controlador dos dados',
    texto: (empresa) =>
      `${empresa.nome}, CNPJ ${empresa.cnpj}, com sede em ${empresa.endereco || 'endereço não informado'}, é a responsável pelas decisões sobre o tratamento dos dados registrados neste sistema.`,
  },
  {
    numero: '02',
    titulo: 'Quem é o encarregado',
    texto: (empresa) =>
      `A responsável pelo contato com titulares e com a autoridade de proteção de dados é ${empresa.responsavel || 'o responsável cadastrado'}, pelo e-mail ${empresa.email || '—'} ou pelo telefone ${empresa.telefone || '—'}. O prazo de resposta é de até quinze dias.`,
  },
  {
    numero: '03',
    titulo: 'Quais dados são tratados',
    texto: () =>
      'Dados de identificação profissional: nome, e-mail corporativo, nível de acesso e senha armazenada de forma criptografada. Dados de uso: data, hora, endereço IP, ação realizada e produto envolvido. Dados de catálogo: nome, código interno, categoria, descrição, imagem e quantidade em estoque de cada produto.',
  },
  {
    numero: '04',
    titulo: 'Para que os dados são usados',
    texto: () =>
      'Identificar quem realizou cada operação de estoque, restringir alterações a pessoas autorizadas, emitir relatórios internos de movimentação e apurar divergências entre o registrado e o existente na loja. O sistema não trata dados de clientes nem informações financeiras.',
  },
  {
    numero: '05',
    titulo: 'Base legal do tratamento',
    texto: () =>
      'O tratamento se apoia no cumprimento de obrigação legal e regulatória e no legítimo interesse da empresa em manter o controle dos seus bens, conforme o artigo 7º da Lei Geral de Proteção de Dados. O registro de operações não depende de consentimento, porque decorre da relação de trabalho.',
  },
  {
    numero: '06',
    titulo: 'Cookies utilizados',
    texto: () =>
      'Um cookie de sessão mantém o acesso ativo depois da verificação em duas etapas e expira ao sair. Um cookie de preferências guarda o tema escolhido e os filtros usados na última consulta. Nenhum cookie de publicidade, medição de audiência ou perfil comportamental é utilizado, e nenhum dado é enviado a terceiros para essas finalidades.',
  },
  {
    numero: '07',
    titulo: 'Verificação em duas etapas',
    texto: () =>
      'O código de seis dígitos é gerado no aplicativo Google Authenticator, dentro do celular do usuário, e não é armazenado pelo sistema. Guardamos apenas a chave secreta que permite validar o código, a data do último acesso confirmado e, caso a opção seja marcada, a identificação do computador considerado confiável por trinta dias.',
  },
  {
    numero: '08',
    titulo: 'Com quem os dados são compartilhados',
    texto: () =>
      'Os dados ficam nos serviços de hospedagem e banco contratados pela empresa, que atuam como operadores e não podem usá-los para finalidade própria. Nenhum dado é vendido. Em caso de integração futura com um sistema ERP, o compartilhamento se limitará a produtos, quantidades e movimentações.',
  },
  {
    numero: '09',
    titulo: 'Por quanto tempo são guardados',
    texto: () =>
      'O histórico de operações é mantido por 24 meses, prazo necessário para auditoria interna. Dados de usuários desativados são removidos em até 90 dias após o desligamento, preservando-se apenas o nome vinculado às operações já registradas.',
  },
  {
    numero: '10',
    titulo: 'Segurança da informação',
    texto: () =>
      'O acesso exige senha e verificação em duas etapas. As senhas são armazenadas com função de hash e não podem ser lidas por administradores. A comunicação entre o navegador e o servidor é criptografada, e cada operação é registrada com autor, data e hora.',
  },
  {
    numero: '11',
    titulo: 'Direitos do titular',
    texto: () =>
      'O titular pode pedir confirmação do tratamento, acesso aos seus dados, correção de informações incorretas, anonimização, portabilidade e informação sobre com quem os dados foram compartilhados. A exclusão de dados pessoais não apaga o histórico de operações, que a empresa precisa manter por controle interno e obrigação legal.',
  },
  {
    numero: '12',
    titulo: 'Incidentes de segurança',
    texto: () =>
      'Se ocorrer acesso indevido ou perda de dados capaz de gerar risco aos titulares, a empresa comunicará os afetados e a Autoridade Nacional de Proteção de Dados, informando quais dados foram atingidos e quais medidas foram tomadas.',
  },
  {
    numero: '13',
    titulo: 'Alterações desta política',
    texto: () =>
      'Mudanças relevantes serão comunicadas aos usuários dentro do próprio sistema, com trinta dias de antecedência quando afetarem finalidades ou prazos. O histórico de versões fica disponível com o encarregado.',
  },
];

function fecharPoliticaPrivacidade() {
  const fundo = document.getElementById('fundo-modal-politica');
  if (fundo) fundo.remove();
  document.removeEventListener('keydown', fecharPoliticaComEsc);
}

function fecharPoliticaComEsc(evento) {
  if (evento.key === 'Escape') fecharPoliticaPrivacidade();
}

async function abrirPoliticaPrivacidade() {
  let empresa;
  try {
    empresa = await buscarEmpresa();
  } catch (erro) {
    empresa = { nome: 'a empresa responsável pelo sistema', cnpj: '—', endereco: '', telefone: '—', email: '—', responsavel: '—' };
  }

  const fundo = document.createElement('div');
  fundo.className = 'fundo-modal';
  fundo.id = 'fundo-modal-politica';

  const modal = document.createElement('div');
  modal.className = 'modal modal-politica';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Política de Privacidade');

  const cabeca = document.createElement('div');
  cabeca.className = 'modal-cabeca';

  const cabecaTextos = document.createElement('div');
  const rotulo = document.createElement('p');
  rotulo.className = 'rotulo-destaque';
  rotulo.textContent = `${empresa.nome} · documento interno`;
  const titulo = document.createElement('h3');
  titulo.textContent = 'Política de Privacidade';
  const versao = document.createElement('p');
  versao.className = 'apagado';
  versao.textContent = 'Versão 1.0 · vigente desde 18 de agosto de 2026';
  cabecaTextos.append(rotulo, titulo, versao);

  const botaoFechar = document.createElement('button');
  botaoFechar.type = 'button';
  botaoFechar.className = 'botao-icone';
  botaoFechar.setAttribute('aria-label', 'Fechar política de privacidade');
  botaoFechar.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  botaoFechar.addEventListener('click', fecharPoliticaPrivacidade);

  cabeca.append(cabecaTextos, botaoFechar);

  const corpo = document.createElement('div');
  corpo.className = 'modal-politica-corpo';

  const intro = document.createElement('p');
  intro.className = 'apagado';
  intro.textContent = `Este documento explica quais dados o sistema Catálogo de Produtos guarda, por que guarda e por quanto tempo. Ele se aplica aos funcionários da ${empresa.nome} que usam o sistema.`;
  corpo.appendChild(intro);

  POLITICA_SECOES.forEach((secao) => {
    const bloco = document.createElement('div');
    bloco.className = 'politica-secao';

    const secaoCabeca = document.createElement('div');
    secaoCabeca.className = 'politica-secao-cabeca';
    const numero = document.createElement('span');
    numero.className = 'politica-secao-numero';
    numero.textContent = secao.numero;
    const h4 = document.createElement('h4');
    h4.textContent = secao.titulo;
    secaoCabeca.append(numero, h4);

    const paragrafo = document.createElement('p');
    paragrafo.textContent = secao.texto(empresa);

    bloco.append(secaoCabeca, paragrafo);
    corpo.appendChild(bloco);
  });

  const rodape = document.createElement('p');
  rodape.className = 'politica-rodape';
  rodape.textContent = `Dúvidas sobre seus dados: ${empresa.email || '—'} · responsável ${empresa.responsavel || '—'} · ${empresa.telefone || '—'}.`;
  corpo.appendChild(rodape);

  const pe = document.createElement('div');
  pe.className = 'modal-pe';
  const botaoAceitarPolitica = document.createElement('button');
  botaoAceitarPolitica.type = 'button';
  botaoAceitarPolitica.className = 'botao botao-principal';
  botaoAceitarPolitica.textContent = 'Entendi e aceito';
  botaoAceitarPolitica.addEventListener('click', () => {
    localStorage.setItem(CHAVE_COOKIES, 'todos');
    const barra = document.getElementById('barra-cookies');
    if (barra) barra.hidden = true;
    fecharPoliticaPrivacidade();
  });
  const botaoFecharPe = document.createElement('button');
  botaoFecharPe.type = 'button';
  botaoFecharPe.className = 'botao botao-contorno';
  botaoFecharPe.textContent = 'Fechar';
  botaoFecharPe.addEventListener('click', fecharPoliticaPrivacidade);
  pe.append(botaoAceitarPolitica, botaoFecharPe);

  modal.append(cabeca, corpo, pe);
  fundo.appendChild(modal);
  document.body.appendChild(fundo);
  document.addEventListener('keydown', fecharPoliticaComEsc);
  botaoFechar.focus();
}

function montarBarraNavegacao({ exigirLogin = false } = {}) {
  const usuario = obterUsuario();

  if (exigirLogin && (!obterToken() || !usuario)) {
    window.location.href = 'index.html';
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
        window.location.href = 'index.html';
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
