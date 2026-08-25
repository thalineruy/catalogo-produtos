(() => {
  const usuarioLogado = montarBarraNavegacao({ exigirLogin: true });
  if (!usuarioLogado) return;

  const ICONE_EDITAR =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z"/><path d="M14 6l4 4"/></svg>';
  const ICONE_EXCLUIR =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  const ICONE_CADEADO =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  const areaRestrita = document.getElementById('area-restrita');
  const conteudoAdmin = document.getElementById('conteudo-administracao');

  if (usuarioLogado.nivel !== 'administrador') {
    areaRestrita.hidden = false;
    conteudoAdmin.hidden = true;
    return;
  }

  areaRestrita.hidden = true;
  conteudoAdmin.hidden = false;

  /* ---------- 1. Interruptor ERP (demonstrativo) ---------- */
  (function iniciarErp() {
    const botao = document.getElementById('interruptor-erp');
    const estadoTexto = document.getElementById('erp-estado-texto');
    const caixaSimulacao = document.getElementById('erp-simulacao');
    const logSimulado = document.getElementById('erp-log-simulado');

    const PASSOS_SIMULACAO = [
      'Conectando à API do ERP com token de autenticação...',
      'Recebendo cadastro de produtos...',
      'Recebendo movimentações de estoque...',
      'Conferindo divergências entre ERP e catálogo...',
      'Sincronização concluída — 1.284 registros (números de exemplo).',
      'Demonstrativo: nenhum dado real foi trocado com sistema nenhum.',
    ];

    let ativo = false;
    let temporizadores = [];

    function limparTemporizadores() {
      temporizadores.forEach((id) => clearTimeout(id));
      temporizadores = [];
    }

    function rodarSimulacao() {
      logSimulado.innerHTML = '';
      PASSOS_SIMULACAO.forEach((texto, indice) => {
        const id = setTimeout(() => {
          const linha = document.createElement('p');
          linha.textContent = texto;
          logSimulado.appendChild(linha);
        }, indice * 700);
        temporizadores.push(id);
      });
    }

    botao.addEventListener('click', () => {
      ativo = !ativo;
      botao.setAttribute('aria-pressed', String(ativo));
      estadoTexto.textContent = ativo ? 'Ativado' : 'Desativado';
      caixaSimulacao.hidden = !ativo;

      limparTemporizadores();
      if (ativo) {
        rodarSimulacao();
      } else {
        logSimulado.innerHTML = '';
      }
    });
  })();

  /* ---------- 2. Dados da Empresa ---------- */
  const formEmpresa = document.getElementById('form-empresa');
  const empresaErro = document.getElementById('empresa-erro');
  let empresaAtual = null;

  function preencherFormEmpresa(empresa) {
    document.getElementById('empresa-nome').value = empresa.nome || '';
    document.getElementById('empresa-cnpj').value = empresa.cnpj || '';
    document.getElementById('empresa-telefone').value = empresa.telefone || '';
    document.getElementById('empresa-email').value = empresa.email || '';
    document.getElementById('empresa-endereco').value = empresa.endereco || '';
    document.getElementById('empresa-responsavel').value = empresa.responsavel || '';
    document.getElementById('empresa-sigla').value = empresa.sigla || '';
  }

  function atualizarPreviaLogotipo(empresa) {
    aplicarLogotipo(document.getElementById('logotipo-preview'), empresa);
  }

  async function carregarEmpresa() {
    empresaAtual = await buscarEmpresa();
    preencherFormEmpresa(empresaAtual);
    atualizarPreviaLogotipo(empresaAtual);
  }

  formEmpresa.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    empresaErro.hidden = true;

    const dados = {
      nome: document.getElementById('empresa-nome').value.trim(),
      cnpj: document.getElementById('empresa-cnpj').value.trim(),
      telefone: document.getElementById('empresa-telefone').value.trim(),
      email: document.getElementById('empresa-email').value.trim(),
      endereco: document.getElementById('empresa-endereco').value.trim(),
      responsavel: document.getElementById('empresa-responsavel').value.trim(),
      sigla: document.getElementById('empresa-sigla').value.trim(),
    };

    try {
      empresaAtual = await atualizarEmpresa(dados);
      preencherFormEmpresa(empresaAtual);
      atualizarPreviaLogotipo(empresaAtual);
      exibirAviso('Dados da empresa salvos com sucesso.');
    } catch (erro) {
      empresaErro.textContent = erro.message;
      empresaErro.hidden = false;
    }
  });

  // O botão "Aplicar" da sigla salva junto com os demais dados da empresa,
  // usando o que já está no formulário, para não gravar pela metade.
  document.getElementById('botao-aplicar-sigla').addEventListener('click', async () => {
    empresaErro.hidden = true;

    const dados = {
      nome: document.getElementById('empresa-nome').value.trim(),
      cnpj: document.getElementById('empresa-cnpj').value.trim(),
      telefone: document.getElementById('empresa-telefone').value.trim(),
      email: document.getElementById('empresa-email').value.trim(),
      endereco: document.getElementById('empresa-endereco').value.trim(),
      responsavel: document.getElementById('empresa-responsavel').value.trim(),
      sigla: document.getElementById('empresa-sigla').value.trim(),
    };

    try {
      empresaAtual = await atualizarEmpresa(dados);
      preencherFormEmpresa(empresaAtual);
      atualizarPreviaLogotipo(empresaAtual);
      carregarLogoBarraSuperior();
      exibirAviso('Sigla aplicada. Ela aparece como logotipo enquanto não houver uma imagem enviada.');
    } catch (erro) {
      empresaErro.textContent = erro.message;
      empresaErro.hidden = false;
    }
  });

  document.getElementById('botao-descartar-empresa').addEventListener('click', () => {
    if (empresaAtual) preencherFormEmpresa(empresaAtual);
    empresaErro.hidden = true;
    exibirAviso('Alterações descartadas.');
  });

  /* ---------- 3. Logotipo ---------- */
  const areaArrastar = document.getElementById('area-arrastar-logo');
  const botaoSelecionarLogo = document.getElementById('botao-selecionar-logo');
  const campoLogo = document.getElementById('campo-logo');
  const logotipoErro = document.getElementById('logotipo-erro');

  const logotipoEstado = document.getElementById('logotipo-estado');

  // Fica ao lado da área enquanto envia, e não só no aviso que some sozinho:
  // o logotipo não passa por ajuste no navegador, então a espera é mais
  // perceptível que a da foto do produto.
  function mostrarEstadoDoLogotipo(texto) {
    if (!logotipoEstado) return;
    logotipoEstado.textContent = '';
    if (!texto) {
      logotipoEstado.hidden = true;
      return;
    }
    const girando = document.createElement('span');
    girando.className = 'girando';
    girando.setAttribute('aria-hidden', 'true');
    logotipoEstado.append(girando, document.createTextNode(texto));
    logotipoEstado.hidden = false;
  }

  async function processarArquivoLogo(arquivo) {
    if (!arquivo) return;
    logotipoErro.hidden = true;
    mostrarEstadoDoLogotipo('Enviando logotipo...');

    try {
      const empresaAtualizada = await enviarLogotipoEmpresa(arquivo);
      empresaAtual = empresaAtualizada;
      atualizarPreviaLogotipo(empresaAtualizada);
      mostrarEstadoDoLogotipo('');
      exibirAviso('Logotipo atualizado com sucesso.');
      carregarLogoBarraSuperior();
    } catch (erro) {
      mostrarEstadoDoLogotipo('');
      logotipoErro.textContent = erro.message;
      logotipoErro.hidden = false;
    }
  }

  botaoSelecionarLogo.addEventListener('click', () => campoLogo.click());
  areaArrastar.addEventListener('click', (evento) => {
    if (evento.target === botaoSelecionarLogo) return;
    campoLogo.click();
  });
  areaArrastar.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      campoLogo.click();
    }
  });

  campoLogo.addEventListener('change', () => {
    processarArquivoLogo(campoLogo.files[0]);
    campoLogo.value = '';
  });

  ['dragover', 'dragenter'].forEach((evento) => {
    areaArrastar.addEventListener(evento, (e) => {
      e.preventDefault();
      areaArrastar.classList.add('arrastando');
    });
  });
  ['dragleave', 'dragend'].forEach((evento) => {
    areaArrastar.addEventListener(evento, () => areaArrastar.classList.remove('arrastando'));
  });
  areaArrastar.addEventListener('drop', (evento) => {
    evento.preventDefault();
    areaArrastar.classList.remove('arrastando');
    const arquivo = evento.dataTransfer.files && evento.dataTransfer.files[0];
    processarArquivoLogo(arquivo);
  });

  /* ---------- 4. Gerenciar Categorias ---------- */
  const formNovaCategoria = document.getElementById('form-nova-categoria');
  const corpoCategorias = document.getElementById('corpo-categorias');
  const categoriasErro = document.getElementById('categorias-erro');
  let categoriaEmEdicaoId = null;

  function criarLinhaCategoria(categoria) {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    if (categoriaEmEdicaoId === categoria.id) {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = categoria.nome;
      input.id = `editar-categoria-${categoria.id}`;
      input.setAttribute('aria-label', `Novo nome da categoria ${categoria.nome}`);
      tdNome.appendChild(input);
    } else {
      tdNome.textContent = categoria.nome;
    }
    tr.appendChild(tdNome);

    const tdTotal = document.createElement('td');
    tdTotal.className = 'direita';
    tdTotal.textContent = String(categoria.total_produtos);
    tr.appendChild(tdTotal);

    const tdAcoes = document.createElement('td');
    const container = document.createElement('div');
    container.className = 'acoes-linha';

    if (categoriaEmEdicaoId === categoria.id) {
      const botaoSalvar = document.createElement('button');
      botaoSalvar.type = 'button';
      botaoSalvar.className = 'botao botao-contorno';
      botaoSalvar.textContent = 'Salvar';
      botaoSalvar.addEventListener('click', async () => {
        const novoNome = document.getElementById(`editar-categoria-${categoria.id}`).value.trim();
        if (!novoNome) return;
        try {
          await atualizarCategoria(categoria.id, novoNome);
          categoriaEmEdicaoId = null;
          exibirAviso(`Categoria renomeada para "${novoNome}".`);
          await carregarCategorias();
        } catch (erro) {
          categoriasErro.textContent = erro.message;
          categoriasErro.hidden = false;
        }
      });

      const botaoCancelar = document.createElement('button');
      botaoCancelar.type = 'button';
      botaoCancelar.className = 'botao botao-contorno';
      botaoCancelar.textContent = 'Cancelar';
      botaoCancelar.addEventListener('click', () => {
        categoriaEmEdicaoId = null;
        renderizarCategorias(ultimasCategorias);
      });

      container.appendChild(botaoSalvar);
      container.appendChild(botaoCancelar);
    } else {
      const botaoEditar = document.createElement('button');
      botaoEditar.type = 'button';
      botaoEditar.className = 'botao-icone';
      botaoEditar.setAttribute('aria-label', `Editar categoria ${categoria.nome}`);
      botaoEditar.innerHTML = ICONE_EDITAR;
      botaoEditar.addEventListener('click', () => {
        categoriaEmEdicaoId = categoria.id;
        renderizarCategorias(ultimasCategorias);
        document.getElementById(`editar-categoria-${categoria.id}`).focus();
      });

      const botaoExcluir = document.createElement('button');
      botaoExcluir.type = 'button';
      botaoExcluir.className = 'botao-icone botao-icone-perigo';
      botaoExcluir.setAttribute('aria-label', `Excluir categoria ${categoria.nome}`);
      botaoExcluir.innerHTML = ICONE_EXCLUIR;
      botaoExcluir.addEventListener('click', async () => {
        const confirmou = window.confirm(`Excluir a categoria "${categoria.nome}"?`);
        if (!confirmou) return;
        categoriasErro.hidden = true;
        try {
          await excluirCategoria(categoria.id);
          exibirAviso(`Categoria "${categoria.nome}" excluída.`);
          await carregarCategorias();
        } catch (erro) {
          categoriasErro.textContent = erro.message;
          categoriasErro.hidden = false;
        }
      });

      container.appendChild(botaoEditar);
      container.appendChild(botaoExcluir);
    }

    tdAcoes.appendChild(container);
    tr.appendChild(tdAcoes);

    return tr;
  }

  let ultimasCategorias = [];

  function renderizarCategorias(categorias) {
    corpoCategorias.innerHTML = '';
    categorias.forEach((categoria) => corpoCategorias.appendChild(criarLinhaCategoria(categoria)));
  }

  async function carregarCategorias() {
    ultimasCategorias = await listarCategorias();
    renderizarCategorias(ultimasCategorias);
  }

  formNovaCategoria.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    categoriasErro.hidden = true;
    const campoNome = document.getElementById('nova-categoria-nome');
    const nome = campoNome.value.trim();
    if (!nome) return;

    try {
      await criarCategoria(nome);
      exibirAviso(`Categoria "${nome}" criada.`);
      campoNome.value = '';
      await carregarCategorias();
    } catch (erro) {
      categoriasErro.textContent = erro.message;
      categoriasErro.hidden = false;
    }
  });

  /* ---------- 5. Gerenciar Usuários ---------- */
  const formNovoUsuario = document.getElementById('form-novo-usuario');
  const corpoUsuarios = document.getElementById('corpo-usuarios');
  const usuariosErro = document.getElementById('usuarios-erro');

  function criarLinhaUsuario(usuario) {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = usuario.nome;
    tr.appendChild(tdNome);

    const tdEmail = document.createElement('td');
    tdEmail.textContent = usuario.email;
    tr.appendChild(tdEmail);

    const tdNivel = document.createElement('td');
    tdNivel.textContent = usuario.nivel === 'administrador' ? 'Administrador' : 'Operador';
    tr.appendChild(tdNivel);

    const tdUltimoAcesso = document.createElement('td');
    tdUltimoAcesso.className = 'oculta-estreito';
    tdUltimoAcesso.textContent = usuario.ultimo_acesso
      ? new Date(usuario.ultimo_acesso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : 'Nunca acessou';
    tr.appendChild(tdUltimoAcesso);

    const tdTotp = document.createElement('td');
    tdTotp.className = 'oculta-estreito';
    const etiquetaTotp = document.createElement('span');
    etiquetaTotp.className = usuario.totp_ativo ? 'etiqueta' : 'etiqueta etiqueta-alerta';
    etiquetaTotp.textContent = usuario.totp_ativo ? 'Ativa' : 'Pendente';
    tdTotp.appendChild(etiquetaTotp);
    tr.appendChild(tdTotp);

    const tdAcoes = document.createElement('td');
    const container = document.createElement('div');
    container.className = 'acoes-linha';

    const ehVoceMesmo = String(usuario.id) === String(usuarioLogado.id);

    const botaoNivel = document.createElement('button');
    botaoNivel.type = 'button';
    botaoNivel.className = 'botao botao-contorno';
    botaoNivel.innerHTML = `${ICONE_CADEADO} Tornar ${usuario.nivel === 'administrador' ? 'Operador' : 'Administrador'}`;
    botaoNivel.setAttribute(
      'aria-label',
      `Alterar nível de ${usuario.nome} para ${usuario.nivel === 'administrador' ? 'Operador' : 'Administrador'}`,
    );
    if (ehVoceMesmo) {
      botaoNivel.disabled = true;
      botaoNivel.title = 'Você não pode alterar o nível da própria conta.';
    }
    botaoNivel.addEventListener('click', async () => {
      const novoNivel = usuario.nivel === 'administrador' ? 'operador' : 'administrador';
      const confirmou = window.confirm(`Alterar o nível de ${usuario.nome} para ${novoNivel}?`);
      if (!confirmou) return;
      usuariosErro.hidden = true;
      try {
        await alterarNivelUsuario(usuario.id, novoNivel);
        exibirAviso(`Nível de ${usuario.nome} alterado para ${novoNivel}.`);
        await carregarUsuarios();
      } catch (erro) {
        usuariosErro.textContent = erro.message;
        usuariosErro.hidden = false;
      }
    });

    // Caminho normal para quem perdeu a senha: a pessoa recebe um link e
    // escolhe a nova. O "Resetar senha" ao lado é o plano B, para quem
    // está sem acesso à própria caixa de entrada.
    const botaoConvite = document.createElement('button');
    botaoConvite.type = 'button';
    botaoConvite.className = 'botao botao-contorno';
    botaoConvite.innerHTML = `${ICONE_CADEADO} Reenviar link`;
    botaoConvite.setAttribute('aria-label', `Reenviar o link de acesso para ${usuario.nome}`);
    botaoConvite.addEventListener('click', async () => {
      const confirmou = window.confirm(
        `Enviar um novo link de acesso para ${usuario.email}? O link anterior deixa de valer.`,
      );
      if (!confirmou) return;
      usuariosErro.hidden = true;
      botaoConvite.disabled = true;
      try {
        const resultado = await reenviarConviteUsuario(usuario.id);
        exibirAviso(descreverConvite(usuario.nome, resultado.convite));
      } catch (erro) {
        usuariosErro.textContent = erro.message;
        usuariosErro.hidden = false;
      } finally {
        botaoConvite.disabled = false;
      }
    });

    const botaoReset = document.createElement('button');
    botaoReset.type = 'button';
    botaoReset.className = 'botao botao-contorno';
    botaoReset.innerHTML = `${ICONE_CADEADO} Resetar senha`;
    botaoReset.setAttribute('aria-label', `Gerar senha temporária para ${usuario.nome}`);
    botaoReset.addEventListener('click', async () => {
      const confirmou = window.confirm(`Gerar uma senha temporária para ${usuario.nome}?`);
      if (!confirmou) return;
      usuariosErro.hidden = true;
      try {
        const resultado = await resetarSenhaUsuario(usuario.id);
        exibirAviso(`Senha temporária de ${usuario.nome}: ${resultado.senhaTemporaria} (informe ao usuário com segurança).`);
      } catch (erro) {
        usuariosErro.textContent = erro.message;
        usuariosErro.hidden = false;
      }
    });

    const botaoRedefinirTotp = document.createElement('button');
    botaoRedefinirTotp.type = 'button';
    botaoRedefinirTotp.className = 'botao botao-contorno';
    botaoRedefinirTotp.innerHTML = `${ICONE_CADEADO} Redefinir 2FA`;
    botaoRedefinirTotp.setAttribute('aria-label', `Apagar o vínculo de verificação em duas etapas de ${usuario.nome}`);
    if (!usuario.totp_ativo) {
      botaoRedefinirTotp.disabled = true;
      botaoRedefinirTotp.title = 'Este usuário ainda não concluiu a configuração da verificação em duas etapas.';
    }
    botaoRedefinirTotp.addEventListener('click', async () => {
      const confirmou = window.confirm(
        `Apagar o vínculo de verificação em duas etapas de ${usuario.nome}? No próximo acesso, um novo código para o aplicativo será exibido.`,
      );
      if (!confirmou) return;
      usuariosErro.hidden = true;
      try {
        await removerTotpUsuario(usuario.id);
        exibirAviso(`Verificação em duas etapas de ${usuario.nome} redefinida.`);
        await carregarUsuarios();
      } catch (erro) {
        usuariosErro.textContent = erro.message;
        usuariosErro.hidden = false;
      }
    });

    container.appendChild(botaoNivel);
    container.appendChild(botaoConvite);
    container.appendChild(botaoReset);
    container.appendChild(botaoRedefinirTotp);
    tdAcoes.appendChild(container);
    tr.appendChild(tdAcoes);

    return tr;
  }

  async function carregarUsuarios() {
    const usuarios = await listarUsuarios();
    corpoUsuarios.innerHTML = '';
    usuarios.forEach((usuario) => corpoUsuarios.appendChild(criarLinhaUsuario(usuario)));
  }

  // O link só vem preenchido quando o e-mail não saiu. No caminho normal
  // ninguém além da pessoa vê o link — é esse o ponto de usar convite em
  // vez de senha temporária.
  const conviteArea = document.getElementById('convite-link-area');
  const conviteMotivo = document.getElementById('convite-link-motivo');
  const conviteValor = document.getElementById('convite-link-valor');
  const botaoCopiarConvite = document.getElementById('botao-copiar-convite');
  const botaoFecharConvite = document.getElementById('botao-fechar-convite');

  function fecharAreaDoConvite() {
    conviteArea.hidden = true;
    conviteValor.value = '';
  }

  botaoFecharConvite.addEventListener('click', fecharAreaDoConvite);

  botaoCopiarConvite.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(conviteValor.value);
      botaoCopiarConvite.textContent = 'Copiado';
    } catch (erro) {
      // Navegador sem permissão de área de transferência: seleciona o texto
      // para o Ctrl+C funcionar.
      conviteValor.select();
      botaoCopiarConvite.textContent = 'Use Ctrl+C';
    }
    setTimeout(() => { botaoCopiarConvite.textContent = 'Copiar link'; }, 2500);
  });

  // Devolve o texto curto para o aviso. Quando há link, ele vai para a área
  // fixa acima da tabela, que fica até o administrador fechar — um aviso que
  // some em 10 segundos não dá tempo de copiar um endereço longo.
  function descreverConvite(nome, convite) {
    fecharAreaDoConvite();

    if (!convite) return `${nome}: nada a enviar.`;
    if (convite.emailEnviado) {
      return `Link de acesso enviado para ${nome}. Vale por ${convite.validoPorHoras} horas.`;
    }

    // As duas falhas dizem coisas diferentes: faltar configurar o serviço
    // não é o mesmo que o serviço ter recusado a mensagem.
    const causa = convite.emailSimulado
      ? 'O envio de e-mail ainda não está configurado no servidor.'
      : `O e-mail não saiu: ${convite.motivo || 'o serviço de envio recusou a mensagem.'}`;

    if (convite.link) {
      conviteMotivo.textContent = `${causa} Repasse este link a ${nome}. Vale por ${convite.validoPorHoras} horas e serve uma vez só.`;
      conviteValor.value = convite.link;
      conviteArea.hidden = false;
      conviteArea.scrollIntoView({ block: 'nearest' });
      return `O e-mail não saiu. O link de ${nome} está logo acima da tabela, para copiar.`;
    }
    return `${causa} Tente reenviar o link.`;
  }

  formNovoUsuario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    usuariosErro.hidden = true;

    const dados = {
      nome: document.getElementById('novo-usuario-nome').value.trim(),
      email: document.getElementById('novo-usuario-email').value.trim(),
      nivel: document.getElementById('novo-usuario-nivel').value,
    };

    try {
      const resultado = await criarUsuario(dados);
      exibirAviso(descreverConvite(resultado.nome, resultado.convite));
      formNovoUsuario.reset();
      await carregarUsuarios();
    } catch (erro) {
      usuariosErro.textContent = erro.message;
      usuariosErro.hidden = false;
    }
  });

  /* ---------- 6. Solicitações de Acesso ---------- */

  const solicitacoesTabela = document.getElementById('solicitacoes-tabela');
  const corpoSolicitacoes = document.getElementById('corpo-solicitacoes');
  const solicitacoesVazio = document.getElementById('solicitacoes-vazio');
  const solicitacoesErro = document.getElementById('solicitacoes-erro');
  const solicitacoesContador = document.getElementById('solicitacoes-contador');

  const paginacaoSolicitacoes = criarPaginacao('paginacao-solicitacoes', () => carregarSolicitacoes());

  // Dois dos três motivos não se resolvem trocando a senha: quem perdeu o
  // aplicativo precisa que a verificação em duas etapas seja redefinida.
  // Sem dizer isso na tela, é fácil o administrador fazer a coisa errada.
  const ACAO_POR_MOTIVO = {
    'Esqueci a senha': 'Reenviar link de acesso',
    'Perdi o acesso ao Google Authenticator': 'Redefinir 2FA',
    'Troquei de celular': 'Redefinir 2FA',
  };

  function formatarQuando(dataIso) {
    return new Date(dataIso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function criarLinhaSolicitacao(solicitacao) {
    const pendente = !solicitacao.atendido_em;
    const tr = document.createElement('tr');

    const tdQuando = document.createElement('td');
    tdQuando.textContent = formatarQuando(solicitacao.criado_em);
    tr.appendChild(tdQuando);

    const tdEmail = document.createElement('td');
    tdEmail.textContent = solicitacao.email;
    tr.appendChild(tdEmail);

    const acaoSugerida = ACAO_POR_MOTIVO[solicitacao.motivo] || 'Conferir com a pessoa';

    const tdMotivo = document.createElement('td');
    tdMotivo.textContent = solicitacao.motivo;
    // A coluna "O que fazer" some em tela estreita, e é justamente ela que
    // evita trocar a senha de quem, na verdade, perdeu o aplicativo. Então
    // a orientação reaparece aqui embaixo do motivo quando a coluna sai.
    const acaoEstreita = document.createElement('div');
    acaoEstreita.className = 'apagado so-estreito';
    acaoEstreita.textContent = acaoSugerida;
    tdMotivo.appendChild(acaoEstreita);
    tr.appendChild(tdMotivo);

    const tdAcao = document.createElement('td');
    tdAcao.className = 'oculta-estreito';
    tdAcao.textContent = acaoSugerida;
    tr.appendChild(tdAcao);

    const tdSituacao = document.createElement('td');
    const etiqueta = document.createElement('span');
    etiqueta.className = pendente ? 'etiqueta etiqueta-alerta' : 'etiqueta';
    etiqueta.textContent = pendente ? 'Pendente' : 'Atendido';
    tdSituacao.appendChild(etiqueta);
    if (!pendente && solicitacao.atendido_por_nome) {
      const quem = document.createElement('div');
      quem.className = 'apagado';
      quem.textContent = `por ${solicitacao.atendido_por_nome}`;
      tdSituacao.appendChild(quem);
    }
    tr.appendChild(tdSituacao);

    const tdAcoes = document.createElement('td');
    const container = document.createElement('div');
    container.className = 'acoes-linha';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao botao-contorno';
    botao.textContent = 'Marcar atendido';
    botao.setAttribute('aria-label', `Marcar como atendido o pedido de ${solicitacao.email}`);
    if (!pendente) {
      botao.disabled = true;
      botao.title = 'Este pedido já foi atendido.';
    }
    botao.addEventListener('click', async () => {
      solicitacoesErro.hidden = true;
      botao.disabled = true;
      try {
        await marcarSolicitacaoAtendida(solicitacao.id);
        exibirAviso(`Pedido de ${solicitacao.email} marcado como atendido.`);
        await carregarSolicitacoes();
        atualizarSinoAgora();
      } catch (erro) {
        solicitacoesErro.textContent = erro.message;
        solicitacoesErro.hidden = false;
        botao.disabled = false;
      }
    });

    container.appendChild(botao);
    tdAcoes.appendChild(container);
    tr.appendChild(tdAcoes);

    return tr;
  }

  function renderizarSolicitacoes(resposta) {
    corpoSolicitacoes.innerHTML = '';

    if (resposta.itens.length === 0) {
      solicitacoesTabela.hidden = true;
      solicitacoesVazio.hidden = false;
    } else {
      solicitacoesTabela.hidden = false;
      solicitacoesVazio.hidden = true;
      resposta.itens.forEach((item) => corpoSolicitacoes.appendChild(criarLinhaSolicitacao(item)));
    }

    const pendentes = resposta.itens.filter((item) => !item.atendido_em).length;
    solicitacoesContador.textContent = pendentes === 1 ? '1 pendente' : `${pendentes} pendentes`;
    solicitacoesContador.hidden = pendentes === 0;

    paginacaoSolicitacoes.desenhar(resposta);
  }

  async function carregarSolicitacoes() {
    try {
      solicitacoesErro.hidden = true;
      renderizarSolicitacoes(await listarSolicitacoesAcesso({ pagina: paginacaoSolicitacoes.pagina }));
    } catch (erro) {
      solicitacoesErro.textContent = `Não foi possível carregar os pedidos de acesso: ${erro.message}`;
      solicitacoesErro.hidden = false;
      renderizarSolicitacoes({ itens: [], total: 0, pagina: 1, porPagina: 25, totalPaginas: 1 });
    }
  }

  /* ---------- 7. Estatísticas Gerais ---------- */
  const CARTOES_ESTATISTICAS = [
    { chave: 'totalProdutos', rotulo: 'Produtos cadastrados' },
    { chave: 'totalProdutosAtivos', rotulo: 'Produtos ativos' },
    { chave: 'totalSaidas', rotulo: 'Saídas registradas' },
    { chave: 'unidadesSaidas', rotulo: 'Unidades saídas' },
    { chave: 'produtosEstoqueBaixo', rotulo: 'Estoque baixo' },
    { chave: 'produtosZerados', rotulo: 'Produtos zerados' },
    { chave: 'unidadesEmEstoque', rotulo: 'Unidades em estoque' },
    { chave: 'numeroCategorias', rotulo: 'Categorias' },
  ];

  function renderizarCartoesEstatisticas(estatisticas) {
    const grade = document.getElementById('grade-estatisticas');
    grade.innerHTML = '';
    CARTOES_ESTATISTICAS.forEach(({ chave, rotulo }) => {
      const cartao = document.createElement('div');

      const numero = document.createElement('span');
      numero.className = 'valor';
      numero.textContent = estatisticas[chave];

      const rotuloEl = document.createElement('span');
      rotuloEl.className = 'rotulo';
      rotuloEl.textContent = rotulo;

      cartao.appendChild(numero);
      cartao.appendChild(rotuloEl);
      grade.appendChild(cartao);
    });
  }

  function renderizarTabelaSaidasMes(saidasPorMes) {
    const corpo = document.getElementById('corpo-tabela-saidas-mes');
    corpo.innerHTML = '';
    saidasPorMes.forEach((item) => {
      const tr = document.createElement('tr');
      [
        { valor: item.rotulo, direita: false },
        { valor: item.registros, direita: true },
        { valor: item.unidades, direita: true },
      ].forEach(({ valor, direita }) => {
        const td = document.createElement('td');
        if (direita) td.className = 'direita';
        td.textContent = valor;
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });
  }

  function renderizarTabelaEstoqueCategoria(estoquePorCategoria) {
    const corpo = document.getElementById('corpo-tabela-estoque-categoria');
    corpo.innerHTML = '';
    estoquePorCategoria.forEach((item) => {
      const tr = document.createElement('tr');
      [
        { valor: item.categoria, direita: false },
        { valor: item.unidades, direita: true },
      ].forEach(({ valor, direita }) => {
        const td = document.createElement('td');
        if (direita) td.className = 'direita';
        td.textContent = valor;
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });
  }

  function renderizarGraficos(estatisticas) {
    if (typeof Chart === 'undefined') return;

    const corDestaque = '#ec3013';
    const corTexto = '#201e1d';

    // eslint-disable-next-line no-new
    new Chart(document.getElementById('grafico-saidas-mes'), {
      type: 'bar',
      data: {
        labels: estatisticas.saidasPorMes.map((m) => m.rotulo),
        datasets: [
          {
            label: 'Unidades saídas',
            data: estatisticas.saidasPorMes.map((m) => m.unidades),
            backgroundColor: corDestaque,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: corTexto } },
          y: { beginAtZero: true, ticks: { color: corTexto } },
        },
      },
    });

    // eslint-disable-next-line no-new
    new Chart(document.getElementById('grafico-estoque-categoria'), {
      type: 'bar',
      data: {
        labels: estatisticas.estoquePorCategoria.map((c) => c.categoria),
        datasets: [
          {
            label: 'Unidades em estoque',
            data: estatisticas.estoquePorCategoria.map((c) => c.unidades),
            backgroundColor: corTexto,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: corTexto } },
          y: { ticks: { color: corTexto } },
        },
      },
    });
  }

  async function carregarEstatisticas() {
    const estatisticas = await buscarEstatisticas();
    renderizarCartoesEstatisticas(estatisticas);
    renderizarTabelaSaidasMes(estatisticas.saidasPorMes);
    renderizarTabelaEstoqueCategoria(estatisticas.estoquePorCategoria);
    renderizarGraficos(estatisticas);
  }

  /* ---------- Exportar relatório (janela demonstrativa) ---------- */
  (function iniciarJanelaPdf() {
    const fundo = document.getElementById('fundo-modal-pdf');
    const botaoAbrir = document.getElementById('botao-exportar-relatorio');
    const botaoFechar = document.getElementById('botao-fechar-pdf');
    const botaoCancelar = document.getElementById('botao-cancelar-pdf');
    const botaoConfirmar = document.getElementById('botao-confirmar-pdf');
    const campoNome = document.getElementById('pdf-nome-arquivo');

    function fecharComEsc(evento) {
      if (evento.key === 'Escape') fechar();
    }

    function abrir() {
      fundo.hidden = false;
      document.addEventListener('keydown', fecharComEsc);
      campoNome.focus();
    }

    function fechar() {
      fundo.hidden = true;
      document.removeEventListener('keydown', fecharComEsc);
      botaoAbrir.focus();
    }

    botaoAbrir.addEventListener('click', abrir);
    botaoFechar.addEventListener('click', fechar);
    botaoCancelar.addEventListener('click', fechar);
    botaoConfirmar.addEventListener('click', () => {
      fechar();
      exibirAviso('Demonstração: nenhum arquivo foi gravado. Para gerar um PDF de verdade, use "Exportar PDF" na tela de Relatórios.');
    });
  })();

  /* ---------- Inicialização ---------- */
  (async function iniciar() {
    try {
      await Promise.all([
        carregarEmpresa(),
        carregarCategorias(),
        carregarUsuarios(),
        carregarSolicitacoes(),
        carregarEstatisticas(),
      ]);
    } catch (erro) {
      empresaErro.textContent = `Não foi possível carregar os dados administrativos: ${erro.message}`;
      empresaErro.hidden = false;
    }
  })();
})();
