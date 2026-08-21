const CHAVE_TOKEN = 'catalogo_token';
const CHAVE_USUARIO = 'catalogo_usuario';
const CHAVE_COOKIES = 'catalogo_cookies_aceitos';
const CHAVE_DISPOSITIVO = 'catalogo_dispositivo_confiavel';
const CHAVE_TEMA = 'catalogo_tema';

/* ---------- Tema claro/escuro ----------
   Aplicado assim que o arquivo carrega, antes de a tela ser desenhada,
   para não piscar no tema errado ao trocar de página. */

function temaPreferidoDoSistema() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'escuro'
    : 'claro';
}

function temaAtual() {
  return localStorage.getItem(CHAVE_TEMA) || temaPreferidoDoSistema();
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);

  const botao = document.getElementById('botao-tema');
  if (!botao) return;

  const proximo = tema === 'escuro' ? 'claro' : 'escuro';
  const descricao = `Mudar para o tema ${proximo}`;
  botao.setAttribute('aria-label', descricao);
  botao.title = descricao;
}

aplicarTema(temaAtual());

function iniciarBotaoTema() {
  const botao = document.getElementById('botao-tema');
  if (!botao) return;

  aplicarTema(temaAtual());

  botao.addEventListener('click', () => {
    const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
    localStorage.setItem(CHAVE_TEMA, novo);
    aplicarTema(novo);
  });
}

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

function escaparXml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Monta o logotipo de reserva a partir da sigla cadastrada pela empresa.
// Continua sendo uma imagem (SVG), e não texto dentro de um quadrado no
// HTML, para que sirva igual em qualquer lugar onde o logotipo aparece.
function logotipoDaSigla(sigla) {
  const texto = escaparXml(String(sigla).trim().toUpperCase().slice(0, 3));
  const tamanhoFonte = texto.length >= 3 ? 34 : 46;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">' +
    '<rect width="120" height="120" fill="#ec3013"></rect>' +
    `<text x="60" y="60" fill="#ffffff" font-family="Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${tamanhoFonte}" font-weight="800" letter-spacing="1" text-anchor="middle" dominant-baseline="central">${texto}</text>` +
    '</svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Logotipo é sempre imagem: se a empresa tem um gravado, usa o endereço dela;
// senão usa a sigla cadastrada; sem sigla, cai no padrão do sistema.
function aplicarLogotipo(imagem, empresa) {
  if (!imagem) return;

  function usarReserva() {
    if (empresa && empresa.sigla) {
      imagem.src = logotipoDaSigla(empresa.sigla);
      imagem.alt = `Logotipo da ${empresa.nome}`;
    } else {
      imagem.src = LOGOTIPO_PADRAO;
      imagem.alt = 'Logotipo padrão do sistema';
    }
  }

  imagem.onerror = () => {
    imagem.onerror = null;
    usarReserva();
  };

  if (empresa && empresa.url_logotipo) {
    imagem.alt = `Logotipo da ${empresa.nome}`;
    imagem.src = empresa.url_logotipo;
  } else {
    usarReserva();
  }

  imagem.hidden = false;
}

// Iniciais para o quadrado da marca, quando a empresa não cadastrou sigla
function siglaDaEmpresa(empresa) {
  if (empresa && empresa.sigla) return empresa.sigla.toUpperCase();
  if (!empresa || !empresa.nome) return 'OV';
  return empresa.nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

// Marca no alto do menu lateral: quadrado com a sigla quando não há
// imagem enviada, ou o logotipo da empresa quando há. GET /empresa é
// pública, então isto funciona mesmo antes do login.
async function carregarLogoBarraSuperior() {
  const imagem = document.getElementById('logo-barra-superior');
  const sigla = document.getElementById('marca-sigla');
  const nome = document.getElementById('marca-nome');
  if (!imagem && !sigla) return;

  function mostrarSigla(empresa) {
    if (imagem) imagem.hidden = true;
    if (sigla) {
      sigla.textContent = siglaDaEmpresa(empresa);
      sigla.hidden = false;
    }
  }

  if (typeof buscarEmpresa !== 'function') {
    mostrarSigla(null);
    return;
  }

  try {
    const empresa = await buscarEmpresa();

    if (nome && empresa && empresa.nome) nome.textContent = empresa.nome;

    if (empresa && empresa.url_logotipo) {
      if (sigla) sigla.hidden = true;
      aplicarLogotipo(imagem, empresa);
    } else {
      mostrarSigla(empresa);
    }
  } catch (erro) {
    mostrarSigla(null);
  }
}

// Sino do topo: lista os produtos que precisam de reposição. Abre e
// fecha por clique, Escape ou clique fora.
function montarNotificacoes(produtos) {
  const botao = document.getElementById('botao-sino');
  const painel = document.getElementById('painel-notificacoes');
  const lista = document.getElementById('lista-notificacoes');
  const contador = document.getElementById('sino-contador');
  if (!botao || !painel || !lista) return;

  // Zerados primeiro: são os mais urgentes
  const pendentes = produtos
    .filter((p) => p.quantidade === 0 || p.quantidade <= p.estoque_minimo)
    .sort((a, b) => a.quantidade - b.quantidade);

  lista.innerHTML = '';

  if (pendentes.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'notificacao';
    const texto = document.createElement('div');
    texto.className = 'titulo';
    texto.textContent = 'Nenhum produto precisa de reposição.';
    vazio.appendChild(texto);
    lista.appendChild(vazio);
  } else {
    pendentes.forEach((produto) => {
      const item = document.createElement('div');
      item.className = 'notificacao';

      const marcador = document.createElement('span');
      marcador.className = 'marcador';
      marcador.setAttribute('aria-hidden', 'true');

      const corpo = document.createElement('div');
      const titulo = document.createElement('div');
      titulo.className = 'titulo';
      titulo.textContent =
        produto.quantidade === 0
          ? `${produto.nome} está zerado`
          : `${produto.nome} está com estoque baixo`;

      const detalhe = document.createElement('div');
      detalhe.className = 'detalhe';
      detalhe.textContent = `${produto.quantidade} em estoque · mínimo ${produto.estoque_minimo} · ${produto.categoria_nome}`;

      corpo.append(titulo, detalhe);
      item.append(marcador, corpo);
      lista.appendChild(item);
    });
  }

  if (contador) {
    contador.textContent = pendentes.length > 99 ? '99+' : String(pendentes.length);
    contador.hidden = pendentes.length === 0;
  }
  botao.setAttribute(
    'aria-label',
    pendentes.length === 1
      ? '1 produto precisa de reposição'
      : `${pendentes.length} produtos precisam de reposição`,
  );
  botao.hidden = false;

  function fechar() {
    painel.hidden = true;
    botao.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', fecharComEsc);
    document.removeEventListener('click', fecharClicandoFora);
    window.removeEventListener('scroll', fechar);
  }

  // Em tela estreita o painel é preso à janela (ver folha de estilo), então
  // precisa saber a que altura o sino está. Como ele não acompanha a
  // rolagem nesse modo, fecha quando a página rola.
  function posicionarSeFixo() {
    if (getComputedStyle(painel).position !== 'fixed') {
      painel.style.top = '';
      return false;
    }
    painel.style.top = `${Math.round(botao.getBoundingClientRect().bottom + 4)}px`;
    return true;
  }

  function fecharComEsc(evento) {
    if (evento.key === 'Escape') {
      fechar();
      botao.focus();
    }
  }

  function fecharClicandoFora(evento) {
    if (!painel.contains(evento.target) && !botao.contains(evento.target)) fechar();
  }

  botao.addEventListener('click', () => {
    if (painel.hidden) {
      painel.hidden = false;
      botao.setAttribute('aria-expanded', 'true');
      if (posicionarSeFixo()) window.addEventListener('scroll', fechar, { passive: true });
      document.addEventListener('keydown', fecharComEsc);
      // No próximo quadro, senão este mesmo clique fecharia o painel
      setTimeout(() => document.addEventListener('click', fecharClicandoFora), 0);
    } else {
      fechar();
    }
  });

  const botaoFechar = document.getElementById('botao-fechar-notificacoes');
  if (botaoFechar) botaoFechar.addEventListener('click', fechar);
}

// Alertas de estoque vivem no sino. O rodapé do menu ficou para os
// avisos do sistema, que são de outra natureza (conta e infraestrutura).
async function carregarAlertaEstoque() {
  const sino = document.getElementById('botao-sino');
  if (!sino || typeof listarAlertasDeEstoque !== 'function' || !obterToken()) return;

  try {
    // Rota própria, fora da paginação: o sino precisa de todos os produtos
    // que pedem reposição, não só dos que caem na primeira página.
    montarNotificacoes(await listarAlertasDeEstoque());
  } catch (erro) {
    // Sem estoque para mostrar, o sino simplesmente não aparece; a falha
    // de comunicação é anunciada pelos avisos do sistema.
  }
}

/* ---------- Avisos do sistema (rodapé do menu) ---------- */

const DIAS_PARA_TROCAR_SENHA = 60;
const DIAS_DE_ANTECEDENCIA = 10;

function desenharAvisos(avisos) {
  const area = document.getElementById('avisos-sistema');
  if (!area) return;

  area.innerHTML = '';

  if (avisos.length === 0) {
    const item = document.createElement('p');
    item.className = 'aviso-sistema';
    item.textContent = 'Nenhum aviso no momento.';
    area.appendChild(item);
    return;
  }

  avisos.forEach((aviso) => {
    const item = document.createElement('p');
    item.className = aviso.grave ? 'aviso-sistema grave' : 'aviso-sistema';

    const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icone.setAttribute('width', '15');
    icone.setAttribute('height', '15');
    icone.setAttribute('viewBox', '0 0 24 24');
    icone.setAttribute('fill', 'none');
    icone.setAttribute('stroke', 'currentColor');
    icone.setAttribute('stroke-width', '2');
    icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML = '<path d="m12 3 9 16H3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>';

    const texto = document.createElement('span');
    texto.textContent = aviso.texto;

    item.append(icone, texto);
    area.appendChild(item);
  });
}

function avisoDeSenha(contaSenhaAtualizadaEm) {
  if (!contaSenhaAtualizadaEm) return null;

  const dias = Math.floor((Date.now() - new Date(contaSenhaAtualizadaEm).getTime()) / 86400000);
  const faltam = DIAS_PARA_TROCAR_SENHA - dias;

  if (faltam <= 0) {
    return { texto: `Sua senha tem ${dias} dias. Recomendamos trocar.`, grave: true };
  }
  if (faltam <= DIAS_DE_ANTECEDENCIA) {
    return { texto: `Sua senha completa ${DIAS_PARA_TROCAR_SENHA} dias em ${faltam} dia(s).`, grave: false };
  }
  return null;
}

// Conexão e conta. Nada aqui bloqueia o uso do sistema: o objetivo é
// explicar para quem usa que o problema não está do lado dele.
async function carregarAvisosDoSistema() {
  const area = document.getElementById('avisos-sistema');
  if (!area || typeof conferirSaudeDoServidor !== 'function' || !obterToken()) return;

  const avisos = [];
  const saude = await conferirSaudeDoServidor();

  if (saude.servidor === 'fora') {
    avisos.push({ texto: 'Sem comunicação com o servidor. O problema não é no seu acesso.', grave: true });
  } else if (saude.banco === 'fora') {
    avisos.push({ texto: 'O servidor respondeu, mas está sem acesso ao banco de dados.', grave: true });
  }

  if (saude.servidor === 'ok' && saude.banco === 'ok' && typeof buscarMinhaConta === 'function') {
    try {
      const conta = await buscarMinhaConta();
      const senha = avisoDeSenha(conta.senha_atualizada_em);
      if (senha) avisos.push(senha);
    } catch (erro) {
      avisos.push({ texto: 'Não foi possível conferir a situação da sua senha.', grave: false });
    }
  }

  desenharAvisos(avisos);
}

// Marca da empresa na tela de entrada (login): logo + nome no topo do
// painel escuro, e o nome de novo na tarja no fim da ilustração. Só
// aparece se os dados da empresa carregarem — sem nome fixo aqui.
async function carregarMarcaEntrada() {
  const marca = document.getElementById('marca-entrada');
  const logo = document.getElementById('logo-entrada');
  const nomeMarca = document.getElementById('marca-entrada-nome');
  const tag = document.getElementById('tag-empresa');
  const nomeTag = document.getElementById('tag-empresa-nome');
  if (!marca || typeof buscarEmpresa !== 'function') return;

  try {
    const empresa = await buscarEmpresa();
    if (!empresa || !empresa.nome) return;

    aplicarLogotipo(logo, empresa);
    nomeMarca.textContent = empresa.nome;
    marca.hidden = false;

    if (tag && nomeTag) {
      nomeTag.textContent = empresa.nome;
      tag.hidden = false;
    }
  } catch (erro) {
    // Sem dados da empresa, a tela de entrada segue só com o nome do sistema.
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
  carregarAlertaEstoque();
  carregarAvisosDoSistema();
  iniciarBotaoTema();
  iniciarBarraCookies();

  const elementoUsuario = document.getElementById('usuario-logado');
  const elementoInicial = document.getElementById('usuario-inicial');
  const elementoNome = document.getElementById('usuario-nome');
  const elementoNivel = document.getElementById('usuario-nivel');
  const botaoSair = document.getElementById('botao-sair');
  const linkEntrar = document.getElementById('link-entrar');
  const linkAdministracao = document.getElementById('link-administracao');
  const cadeadoAdministracao = linkAdministracao
    ? linkAdministracao.querySelector('.cadeado-menu')
    : null;

  // Iniciais do nome, até duas, como no mockup
  function iniciaisDe(nome) {
    return nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  }

  if (usuario) {
    const ehAdministrador = usuario.nivel === 'administrador';
    if (elementoUsuario) elementoUsuario.hidden = false;
    if (elementoInicial) elementoInicial.textContent = iniciaisDe(usuario.nome);
    if (elementoNome) elementoNome.textContent = usuario.nome;
    if (elementoNivel) elementoNivel.textContent = ehAdministrador ? 'Administrador' : 'Operador';
    if (botaoSair) {
      botaoSair.hidden = false;
      botaoSair.addEventListener('click', () => {
        encerrarSessao();
        window.location.href = 'index.html';
      });
    }
    if (linkEntrar) linkEntrar.hidden = true;

    // A Administração continua na lista para todos, com um cadeado quando
    // o nível não permite — quem entrar sem ser administrador cai na
    // mensagem de área restrita da própria tela.
    if (cadeadoAdministracao) cadeadoAdministracao.hidden = ehAdministrador;
  } else {
    if (elementoUsuario) elementoUsuario.hidden = true;
    if (botaoSair) botaoSair.hidden = true;
    if (linkEntrar) linkEntrar.hidden = false;
    if (linkAdministracao) linkAdministracao.hidden = true;
  }

  return usuario;
}
