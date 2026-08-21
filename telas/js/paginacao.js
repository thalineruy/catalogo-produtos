/* Controle de páginas usado no Catálogo, na Saída e nos Logs.
   Recebe o elemento onde desenhar e a função que recarrega a lista. */
function criarPaginacao(idElemento, aoTrocarPagina) {
  const area = document.getElementById(idElemento);
  let pagina = 1;

  function irPara(novaPagina) {
    pagina = novaPagina;
    aoTrocarPagina(pagina);
  }

  function botao(texto, destino, atual = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = atual ? 'pagina-botao atual' : 'pagina-botao';
    b.textContent = texto;
    if (atual) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => irPara(destino));
    return b;
  }

  // Mostra no máximo cinco números em volta da página atual, para a barra
  // não crescer sem parar quando houver muitas páginas.
  function numerosVisiveis(totalPaginas) {
    const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
    const fim = Math.min(totalPaginas, inicio + 4);
    const numeros = [];
    for (let n = inicio; n <= fim; n += 1) numeros.push(n);
    return numeros;
  }

  return {
    get pagina() {
      return pagina;
    },

    // Toda troca de filtro volta para a primeira página: senão a pessoa
    // poderia ficar numa página que não existe mais no novo resultado.
    reiniciar() {
      pagina = 1;
    },

    desenhar({ total, totalPaginas, porPagina }) {
      if (!area) return;
      area.innerHTML = '';

      if (total === 0) {
        area.hidden = true;
        return;
      }
      area.hidden = false;

      const primeiro = (pagina - 1) * porPagina + 1;
      const ultimo = Math.min(pagina * porPagina, total);

      const resumo = document.createElement('span');
      resumo.className = 'pagina-resumo';
      resumo.textContent = `${primeiro}–${ultimo} de ${total}`;
      area.appendChild(resumo);

      if (totalPaginas <= 1) return;

      const controles = document.createElement('div');
      controles.className = 'pagina-controles';

      const anterior = botao('Anterior', pagina - 1);
      anterior.disabled = pagina <= 1;
      controles.appendChild(anterior);

      numerosVisiveis(totalPaginas).forEach((n) => {
        controles.appendChild(botao(String(n), n, n === pagina));
      });

      const proxima = botao('Próxima', pagina + 1);
      proxima.disabled = pagina >= totalPaginas;
      controles.appendChild(proxima);

      area.appendChild(controles);
    },
  };
}
