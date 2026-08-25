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
// O sino conta duas coisas de naturezas diferentes: produtos que pedem
// reposição e pedidos de acesso esperando atendimento. Cada uma é
// carregada por sua própria função, então a contagem fica aqui fora para
// que a última a terminar não apague o número da outra.
const contagemSino = { estoque: 0, pedidos: 0 };

function atualizarContadorSino() {
  const botao = document.getElementById('botao-sino');
  const contador = document.getElementById('sino-contador');
  if (!botao || !contador) return;

  const total = contagemSino.estoque + contagemSino.pedidos;
  contador.textContent = total > 99 ? '99+' : String(total);
  contador.hidden = total === 0;

  const partes = [];
  if (contagemSino.estoque > 0) {
    partes.push(
      contagemSino.estoque === 1
        ? '1 produto precisa de reposição'
        : `${contagemSino.estoque} produtos precisam de reposição`,
    );
  }
  if (contagemSino.pedidos > 0) {
    partes.push(
      contagemSino.pedidos === 1
        ? '1 pedido de acesso esperando'
        : `${contagemSino.pedidos} pedidos de acesso esperando`,
    );
  }
  botao.setAttribute('aria-label', partes.length ? `Notificações: ${partes.join(' e ')}` : 'Notificações');
}

function montarNotificacoes(produtos) {
  const botao = document.getElementById('botao-sino');
  const painel = document.getElementById('painel-notificacoes');
  const lista = document.getElementById('lista-notificacoes');
  const contador = document.getElementById('sino-contador');
  if (!botao || !painel || !lista) return;

  // produtos === null quer dizer que a consulta de estoque falhou. O sino
  // aparece assim mesmo, porque no celular ele é o único lugar onde os
  // avisos do sistema — inclusive o de "sem comunicação" — são exibidos.
  const falhou = produtos === null;

  // Zerados primeiro: são os mais urgentes
  const pendentes = falhou
    ? []
    : produtos
        .filter((p) => p.quantidade === 0 || p.quantidade <= p.estoque_minimo)
        .sort((a, b) => a.quantidade - b.quantidade);

  lista.innerHTML = '';

  if (pendentes.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'notificacao';
    const texto = document.createElement('div');
    texto.className = 'titulo';
    texto.textContent = falhou
      ? 'Não foi possível carregar os alertas de estoque.'
      : 'Nenhum produto precisa de reposição.';
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

  contagemSino.estoque = pendentes.length;
  atualizarContadorSino();
  botao.hidden = false;

  // Os eventos são ligados uma vez só. Esta função é chamada de novo a cada
  // atualização automática, e sem a guarda cada chamada acrescentaria outro
  // ouvinte de clique: o painel abriria e fecharia no mesmo toque.
  if (botao.dataset.eventosLigados) return;
  botao.dataset.eventosLigados = 'sim';

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
    return true;
  } catch (erro) {
    // O sino continua aparecendo mesmo sem os dados de estoque: ele
    // carrega os avisos do sistema, que no celular não têm outro lugar.
    montarNotificacoes(null);
    return false;
  }
}

/* ---------- Atualização automática do sino ---------- */

// Três minutos: alerta de estoque não muda de segundo em segundo, e pedido
// de acesso é raro. Intervalo curto só gastaria requisição à toa.
const INTERVALO_SINO_MS = 3 * 60 * 1000;

// Depois de três falhas seguidas o sino para de tentar. Se o servidor caiu
// ou a sessão expirou, insistir a cada três minutos não resolve nada e ainda
// consome a cota do plano gratuito. Uma volta de foco retoma as tentativas.
const FALHAS_ATE_DESISTIR = 3;

const relogioSino = { temporizador: null, emAndamento: false, falhas: 0, usuario: null };

async function atualizarSinoAgora() {
  const painel = document.getElementById('painel-notificacoes');

  // Não mexe na lista com o painel aberto: os itens mudariam debaixo do
  // cursor no meio da leitura.
  if (painel && !painel.hidden) return;
  if (relogioSino.emAndamento || !obterToken()) return;

  relogioSino.emAndamento = true;
  try {
    // As duas funções tratam o próprio erro e devolvem se conseguiram, em
    // vez de lançar: o sino é informação de fundo e não deve interromper o
    // que a pessoa está fazendo.
    const [estoque, pedidos] = await Promise.all([
      carregarAlertaEstoque(),
      carregarPedidosDeAcesso(relogioSino.usuario),
    ]);
    // pedidos é undefined para operador, que nem consulta essa rota.
    const falhou = estoque === false || pedidos === false;
    relogioSino.falhas = falhou ? relogioSino.falhas + 1 : 0;
  } finally {
    relogioSino.emAndamento = false;
  }
}

function pararRelogioDoSino() {
  clearTimeout(relogioSino.temporizador);
  relogioSino.temporizador = null;
}

function agendarProximaAtualizacao() {
  pararRelogioDoSino();

  // Aba escondida não agenda nada: sem isto, uma aba esquecida aberta a noite
  // inteira consultaria o servidor centenas de vezes sem ninguém olhando.
  if (document.visibilityState !== 'visible') return;
  if (relogioSino.falhas >= FALHAS_ATE_DESISTIR) return;

  relogioSino.temporizador = setTimeout(async () => {
    await atualizarSinoAgora();
    agendarProximaAtualizacao();
  }, INTERVALO_SINO_MS);
}

// Encadeia com setTimeout, e não com setInterval: se o servidor demorar para
// responder — no plano gratuito a primeira chamada pode levar um minuto —, as
// requisições não se acumulam.
function iniciarRelogioDoSino(usuario) {
  relogioSino.usuario = usuario;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      pararRelogioDoSino();
      return;
    }
    // Voltar para a aba é o momento em que a pessoa vai olhar o sino, então
    // vale atualizar na hora, não no próximo intervalo.
    relogioSino.falhas = 0;
    atualizarSinoAgora().then(agendarProximaAtualizacao);
  });

  agendarProximaAtualizacao();
}

/* ---------- Pedidos de acesso, no sino ---------- */

// Só administrador enxerga: a rota devolve 403 para operador, e o bloco
// simplesmente não aparece. Diferente dos avisos do sistema, este bloco
// vale em qualquer largura — não existe cópia dele no rodapé do menu.
async function carregarPedidosDeAcesso(usuario) {
  const area = document.getElementById('pedidos-acesso-sino');
  if (!area || !usuario || usuario.nivel !== 'administrador') return;
  if (typeof contarSolicitacoesPendentes !== 'function' || !obterToken()) return;

  try {
    const { total } = await contarSolicitacoesPendentes();
    contagemSino.pedidos = total;
    desenharPedidosDeAcesso(area, total);
    atualizarContadorSino();
    return true;
  } catch (erro) {
    // Sem a contagem o sino segue mostrando só o estoque.
    return false;
  }
}

function desenharPedidosDeAcesso(area, total) {
  area.innerHTML = '';
  if (total === 0) return;

  const titulo = document.createElement('p');
  titulo.className = 'rotulo notificacoes-sistema-titulo';
  titulo.textContent = 'Pedidos de acesso';
  area.appendChild(titulo);

  const link = document.createElement('a');
  link.className = 'pedido-acesso-link';
  link.href = 'administracao.html#titulo-solicitacoes';
  link.textContent =
    total === 1
      ? '1 pedido esperando atendimento'
      : `${total} pedidos esperando atendimento`;
  area.appendChild(link);
}

/* ---------- Avisos do sistema (rodapé do menu) ---------- */

const DIAS_PARA_TROCAR_SENHA = 60;
const DIAS_DE_ANTECEDENCIA = 10;

function desenharAvisos(avisos) {
  // Dois destinos: o rodapé do menu lateral e o painel do sino. O rodapé
  // some abaixo de 901px, então no celular o sino é o único lugar onde
  // estes avisos aparecem.
  desenharAvisosEm(document.getElementById('avisos-sistema'), avisos, false);
  desenharAvisosEm(document.getElementById('avisos-sistema-sino'), avisos, true);
}

function desenharAvisosEm(area, avisos, comTitulo) {
  if (!area) return;

  area.innerHTML = '';

  if (avisos.length === 0) {
    // No sino, "nenhum aviso" não precisa ocupar espaço: o painel já tem
    // a lista de estoque logo abaixo.
    if (comTitulo) return;
    const item = document.createElement('p');
    item.className = 'aviso-sistema';
    item.textContent = 'Nenhum aviso no momento.';
    area.appendChild(item);
    return;
  }

  if (comTitulo) {
    const titulo = document.createElement('p');
    titulo.className = 'rotulo notificacoes-sistema-titulo';
    titulo.textContent = 'Avisos do sistema';
    area.appendChild(titulo);
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

/* ---------- Menu da conta, no crachá do topo ----------
   O rodapé do menu lateral some abaixo de 901px (ver folha de estilo), e
   com ele iam embora o "Sair da conta" e o "Trocar minha senha" — no
   celular não sobrava nenhuma forma de encerrar a sessão. Este menu
   existe em qualquer largura, para não haver dois comportamentos. */
function iniciarMenuUsuario() {
  const botao = document.getElementById('botao-usuario');
  const menu = document.getElementById('menu-usuario');
  if (!botao || !menu || botao.dataset.pronto) return;
  botao.dataset.pronto = 'sim';

  function fechar() {
    menu.hidden = true;
    botao.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', fecharComEsc);
    document.removeEventListener('click', fecharClicandoFora);
  }

  function fecharComEsc(evento) {
    if (evento.key === 'Escape') {
      fechar();
      botao.focus();
    }
  }

  function fecharClicandoFora(evento) {
    if (!menu.contains(evento.target) && !botao.contains(evento.target)) fechar();
  }

  botao.addEventListener('click', () => {
    if (!menu.hidden) {
      fechar();
      return;
    }
    menu.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', fecharComEsc);
    // No próximo quadro, senão este mesmo clique fecharia o menu
    setTimeout(() => document.addEventListener('click', fecharClicandoFora), 0);
    const primeiro = menu.querySelector('.menu-usuario-item');
    if (primeiro) primeiro.focus();
  });
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
  carregarPedidosDeAcesso(usuario);
  if (usuario) iniciarRelogioDoSino(usuario);
  iniciarBotaoTema();
  iniciarBarraCookies();

  const elementoUsuario = document.getElementById('usuario-logado');
  const elementoInicial = document.getElementById('usuario-inicial');
  const elementoNome = document.getElementById('usuario-nome');
  const elementoNivel = document.getElementById('usuario-nivel');
  const menuNome = document.getElementById('menu-usuario-nome');
  const menuNivel = document.getElementById('menu-usuario-nivel');
  // Dois caminhos para sair: o do rodape do menu lateral, que some em
  // tela estreita, e o do menu do crachá, que existe em qualquer largura.
  const botoesSair = [
    document.getElementById('botao-sair'),
    document.getElementById('botao-sair-menu'),
  ].filter(Boolean);
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
    if (menuNome) menuNome.textContent = usuario.nome;
    if (menuNivel) menuNivel.textContent = ehAdministrador ? 'Administrador' : 'Operador';
    botoesSair.forEach((botao) => {
      botao.hidden = false;
      botao.addEventListener('click', () => {
        encerrarSessao();
        window.location.href = 'index.html';
      });
    });
    iniciarMenuUsuario();
    if (linkEntrar) linkEntrar.hidden = true;

    // A Administração continua na lista para todos, com um cadeado quando
    // o nível não permite — quem entrar sem ser administrador cai na
    // mensagem de área restrita da própria tela.
    if (cadeadoAdministracao) cadeadoAdministracao.hidden = ehAdministrador;
  } else {
    if (elementoUsuario) elementoUsuario.hidden = true;
    botoesSair.forEach((botao) => { botao.hidden = true; });
    if (linkEntrar) linkEntrar.hidden = false;
    if (linkAdministracao) linkAdministracao.hidden = true;
  }

  return usuario;
}
