(() => {
  const usuarioLogado = montarBarraNavegacao({ exigirLogin: true });
  if (!usuarioLogado) return;

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
      'Sincronizando produtos (12 encontrados)...',
      'Sincronizando estoque...',
      'Sincronização concluída (demonstrativo — nenhum dado real foi trocado).',
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
  }

  function atualizarPreviaLogotipo(empresa) {
    const imagem = document.getElementById('logotipo-preview');
    const vazio = document.getElementById('logotipo-preview-vazio');
    if (empresa.url_logotipo) {
      imagem.src = empresa.url_logotipo;
      imagem.hidden = false;
      vazio.hidden = true;
      imagem.addEventListener('error', () => {
        imagem.hidden = true;
        vazio.hidden = false;
      });
    } else {
      imagem.hidden = true;
      vazio.hidden = false;
    }
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
    };

    try {
      empresaAtual = await atualizarEmpresa(dados);
      preencherFormEmpresa(empresaAtual);
      exibirAviso('Dados da empresa salvos com sucesso.');
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

  async function processarArquivoLogo(arquivo) {
    if (!arquivo) return;
    logotipoErro.hidden = true;
    exibirAviso('Enviando logotipo...');

    try {
      const empresaAtualizada = await enviarLogotipoEmpresa(arquivo);
      empresaAtual = empresaAtualizada;
      atualizarPreviaLogotipo(empresaAtualizada);
      exibirAviso('Logotipo atualizado com sucesso.');
      carregarLogoBarraSuperior();
    } catch (erro) {
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
      botaoEditar.textContent = '✎';
      botaoEditar.addEventListener('click', () => {
        categoriaEmEdicaoId = categoria.id;
        renderizarCategorias(ultimasCategorias);
        document.getElementById(`editar-categoria-${categoria.id}`).focus();
      });

      const botaoExcluir = document.createElement('button');
      botaoExcluir.type = 'button';
      botaoExcluir.className = 'botao-icone botao-icone-perigo';
      botaoExcluir.setAttribute('aria-label', `Excluir categoria ${categoria.nome}`);
      botaoExcluir.textContent = '🗑';
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

    const tdAcoes = document.createElement('td');
    const container = document.createElement('div');
    container.className = 'acoes-linha';

    const ehVoceMesmo = String(usuario.id) === String(usuarioLogado.id);

    const botaoNivel = document.createElement('button');
    botaoNivel.type = 'button';
    botaoNivel.className = 'botao botao-contorno';
    botaoNivel.textContent = `🔒 Tornar ${usuario.nivel === 'administrador' ? 'Operador' : 'Administrador'}`;
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

    const botaoReset = document.createElement('button');
    botaoReset.type = 'button';
    botaoReset.className = 'botao botao-contorno';
    botaoReset.textContent = '🔒 Resetar senha';
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

    container.appendChild(botaoNivel);
    container.appendChild(botaoReset);
    tdAcoes.appendChild(container);
    tr.appendChild(tdAcoes);

    return tr;
  }

  async function carregarUsuarios() {
    const usuarios = await listarUsuarios();
    corpoUsuarios.innerHTML = '';
    usuarios.forEach((usuario) => corpoUsuarios.appendChild(criarLinhaUsuario(usuario)));
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
      exibirAviso(`Usuário ${resultado.nome} criado. Senha temporária: ${resultado.senhaTemporaria} (informe ao usuário com segurança).`);
      formNovoUsuario.reset();
      await carregarUsuarios();
    } catch (erro) {
      usuariosErro.textContent = erro.message;
      usuariosErro.hidden = false;
    }
  });

  /* ---------- 6. Estatísticas Gerais ---------- */
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

  /* ---------- Inicialização ---------- */
  (async function iniciar() {
    try {
      await Promise.all([carregarEmpresa(), carregarCategorias(), carregarUsuarios(), carregarEstatisticas()]);
    } catch (erro) {
      empresaErro.textContent = `Não foi possível carregar os dados administrativos: ${erro.message}`;
      empresaErro.hidden = false;
    }
  })();
})();
