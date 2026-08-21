(() => {
  const usuario = montarBarraNavegacao({ exigirLogin: true });
  if (!usuario) return;

  const form = document.getElementById('form-relatorio');
  const checkboxesCampos = Array.from(document.querySelectorAll('input[name="campos"]'));
  const campoDataInicial = document.getElementById('relatorio-data-inicial');
  const campoDataFinal = document.getElementById('relatorio-data-final');
  const campoOperador = document.getElementById('relatorio-operador');
  const campoCategoria = document.getElementById('relatorio-categoria');
  const campoEstoqueMinimo = document.getElementById('relatorio-estoque-minimo');
  const erroFormulario = document.getElementById('relatorio-erro');

  const botaoImprimir = document.getElementById('botao-imprimir');
  const botaoExportarPdf = document.getElementById('botao-exportar-pdf');

  const avisoDesatualizado = document.getElementById('relatorio-desatualizado');
  const relatorioVazio = document.getElementById('relatorio-vazio');
  const resumoConfig = document.getElementById('relatorio-resumo-config');
  const documento = document.getElementById('documento-relatorio');

  const documentoLogo = document.getElementById('documento-logo');
  const documentoEmpresaNome = document.getElementById('documento-empresa-nome');
  const documentoEmpresaDetalhes = document.getElementById('documento-empresa-detalhes');
  const documentoEmissao = document.getElementById('documento-emissao');
  const documentoRecorte = document.getElementById('documento-recorte');
  const documentoResponsavel = document.getElementById('documento-responsavel');
  const documentoCabecalhoTabela = document.getElementById('documento-cabecalho-tabela');
  const documentoCorpoTabela = document.getElementById('documento-corpo-tabela');

  let empresa = null;
  let categoriasMapa = [];
  let usuariosMapa = [];
  let configGerada = null;

  function lerConfigAtual() {
    return {
      campos: checkboxesCampos.filter((c) => c.checked).map((c) => c.value),
      dataInicial: campoDataInicial.value,
      dataFinal: campoDataFinal.value,
      operador: campoOperador.value,
      categoria: campoCategoria.value,
      estoqueMinimo: campoEstoqueMinimo.checked,
    };
  }

  function configsIguais(a, b) {
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function nomeDoOperador(id) {
    const encontrado = usuariosMapa.find((u) => String(u.id) === String(id));
    return encontrado ? encontrado.nome : null;
  }

  function descreverRecorte(config) {
    const partes = [];
    if (config.dataInicial || config.dataFinal) {
      const de = config.dataInicial ? formatarDataBr(config.dataInicial) : 'o início';
      const ate = config.dataFinal ? formatarDataBr(config.dataFinal) : 'hoje';
      partes.push(`Período: de ${de} até ${ate}`);
    }
    if (config.operador) {
      partes.push(`Operador: ${nomeDoOperador(config.operador) || config.operador}`);
    }
    if (config.categoria) {
      partes.push(`Categoria: ${config.categoria}`);
    }
    if (config.estoqueMinimo) {
      partes.push('Somente produtos com estoque no mínimo ou abaixo');
    }
    return partes.length ? partes.join(' · ') : 'Todas as saídas registradas, sem filtros adicionais.';
  }

  function formatarDataBr(dataIso) {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function resumoConfigTexto(config) {
    if (config.campos.length === 0) {
      return 'Nenhum campo selecionado ainda.';
    }
    const rotulos = config.campos
      .map((chave) => {
        const checkbox = checkboxesCampos.find((c) => c.value === chave);
        return checkbox ? checkbox.closest('.campo-marcador').querySelector('label').textContent : chave;
      })
      .join(', ');
    return `Campos selecionados: ${rotulos}.`;
  }

  function atualizarResumoConfigVazio() {
    resumoConfig.textContent = resumoConfigTexto(lerConfigAtual());
  }

  function verificarDesatualizado() {
    if (!configGerada) {
      avisoDesatualizado.hidden = true;
      return;
    }
    const atual = lerConfigAtual();
    avisoDesatualizado.hidden = configsIguais(atual, configGerada);
  }

  async function carregarFiltros() {
    // Os operadores vêm de uma rota própria: antes eram deduzidos da lista
    // inteira de saídas, que agora chega paginada e não mostraria todos.
    const [categorias, operadores] = await Promise.all([
      listarCategorias(),
      listarOperadoresDeSaida(),
    ]);
    categoriasMapa = categorias;
    usuariosMapa = operadores;

    categorias.forEach((categoria) => {
      const opcao = document.createElement('option');
      opcao.value = categoria.nome;
      opcao.textContent = categoria.nome;
      campoCategoria.appendChild(opcao);
    });

    usuariosMapa.forEach((operador) => {
      const opcao = document.createElement('option');
      opcao.value = operador.id;
      opcao.textContent = operador.nome;
      campoOperador.appendChild(opcao);
    });
  }

  async function carregarEmpresa() {
    empresa = await buscarEmpresa();

    documentoEmpresaNome.textContent = empresa.nome;
    documentoEmpresaDetalhes.textContent = [
      `CNPJ: ${empresa.cnpj}`,
      empresa.endereco,
      empresa.telefone ? `Telefone: ${empresa.telefone}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    documentoResponsavel.textContent = empresa.responsavel || '—';

    aplicarLogotipo(documentoLogo, empresa);
  }

  function renderizarTabela(relatorio) {
    const linhaCabecalho = document.createElement('tr');
    relatorio.colunas.forEach((coluna) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = coluna.rotulo;
      linhaCabecalho.appendChild(th);
    });
    documentoCabecalhoTabela.innerHTML = '';
    documentoCabecalhoTabela.appendChild(linhaCabecalho);

    documentoCorpoTabela.innerHTML = '';
    relatorio.linhas.forEach((linha) => {
      const tr = document.createElement('tr');
      relatorio.colunas.forEach((coluna) => {
        const td = document.createElement('td');
        const valor = linha[coluna.chave];
        td.textContent = coluna.chave === 'dataSaida' && valor ? formatarDataHora(valor) : (valor ?? '');
        tr.appendChild(td);
      });
      documentoCorpoTabela.appendChild(tr);
    });
  }

  function formatarDataHora(dataIso) {
    return new Date(dataIso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function gerarRelatorio(evento) {
    evento.preventDefault();
    erroFormulario.hidden = true;

    const config = lerConfigAtual();

    if (config.campos.length === 0) {
      erroFormulario.textContent = 'Selecione ao menos um campo para o relatório.';
      erroFormulario.hidden = false;
      return;
    }

    try {
      const relatorio = await gerarRelatorioSaidas({
        campos: config.campos.join(','),
        dataInicial: config.dataInicial,
        dataFinal: config.dataFinal,
        operador: config.operador,
        categoria: config.categoria,
        estoqueMinimo: config.estoqueMinimo ? 'true' : '',
      });

      documentoEmissao.textContent = `Emitido em ${new Date().toLocaleString('pt-BR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })} por ${usuario.nome}`;
      documentoRecorte.textContent = descreverRecorte(config);

      document.getElementById('resumo-registros').textContent = relatorio.totais.registros;
      document.getElementById('resumo-unidades').textContent = relatorio.totais.unidadesSaidas;
      document.getElementById('resumo-categorias').textContent = relatorio.totais.categorias;
      document.getElementById('resumo-operadores').textContent = relatorio.totais.operadores;

      renderizarTabela(relatorio);

      relatorioVazio.hidden = true;
      documento.hidden = false;
      configGerada = config;
      avisoDesatualizado.hidden = true;
    } catch (erro) {
      erroFormulario.textContent = erro.message;
      erroFormulario.hidden = false;
    }
  }

  function acionarImpressao(mensagemInstrucao) {
    if (!configGerada) {
      erroFormulario.textContent = 'Gere o relatório antes de imprimir ou exportar.';
      erroFormulario.hidden = false;
      return;
    }
    erroFormulario.hidden = true;

    if (mensagemInstrucao) {
      window.alert(mensagemInstrucao);
    }
    window.print();
  }

  form.addEventListener('submit', gerarRelatorio);
  [...checkboxesCampos, campoDataInicial, campoDataFinal, campoOperador, campoCategoria, campoEstoqueMinimo].forEach(
    (campo) => {
      campo.addEventListener('change', () => {
        verificarDesatualizado();
        if (documento.hidden) atualizarResumoConfigVazio();
      });
    },
  );

  botaoImprimir.addEventListener('click', () => acionarImpressao(null));
  botaoExportarPdf.addEventListener('click', () =>
    acionarImpressao('Na janela de impressão, escolha "Salvar como PDF" (ou "Microsoft Print to PDF") como destino.'),
  );

  (async function iniciar() {
    atualizarResumoConfigVazio();
    try {
      await Promise.all([carregarFiltros(), carregarEmpresa()]);
    } catch (erro) {
      erroFormulario.textContent = `Não foi possível carregar os dados iniciais: ${erro.message}`;
      erroFormulario.hidden = false;
    }
  })();
})();
