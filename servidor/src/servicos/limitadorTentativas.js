// Limite de tentativas por IP, guardado em memória.
//
// Em memória e não no banco porque o objetivo é conter abuso de uma
// rota pública, não auditar: perder a contagem quando o servidor
// reinicia é aceitável. No Render o processo é único, então uma contagem
// por processo cobre o caso real.
function criarLimitador({ limite, janelaMs }) {
  const tentativas = new Map();

  function limpar(agora) {
    for (const [chave, marcas] of tentativas) {
      const vivas = marcas.filter((m) => agora - m < janelaMs);
      if (vivas.length === 0) tentativas.delete(chave);
      else tentativas.set(chave, vivas);
    }
  }

  // Devolve { permitido, restantes, esperarSegundos }.
  function registrar(chave) {
    const agora = Date.now();
    limpar(agora);

    const marcas = (tentativas.get(chave) || []).filter((m) => agora - m < janelaMs);

    if (marcas.length >= limite) {
      const maisAntiga = Math.min(...marcas);
      return {
        permitido: false,
        restantes: 0,
        esperarSegundos: Math.ceil((janelaMs - (agora - maisAntiga)) / 1000),
      };
    }

    marcas.push(agora);
    tentativas.set(chave, marcas);
    return { permitido: true, restantes: limite - marcas.length, esperarSegundos: 0 };
  }

  function zerar() {
    tentativas.clear();
  }

  return { registrar, zerar };
}

module.exports = { criarLimitador };
