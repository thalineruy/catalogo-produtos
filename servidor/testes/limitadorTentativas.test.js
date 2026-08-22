const { criarLimitador } = require('../src/servicos/limitadorTentativas');

describe('limitador de tentativas', () => {
  it('permite até o limite e barra a seguinte', () => {
    const limitador = criarLimitador({ limite: 3, janelaMs: 60000 });

    expect(limitador.registrar('1.1.1.1').permitido).toBe(true);
    expect(limitador.registrar('1.1.1.1').permitido).toBe(true);
    expect(limitador.registrar('1.1.1.1').permitido).toBe(true);

    const barrada = limitador.registrar('1.1.1.1');
    expect(barrada.permitido).toBe(false);
    expect(barrada.esperarSegundos).toBeGreaterThan(0);
  });

  it('conta cada endereço separadamente', () => {
    const limitador = criarLimitador({ limite: 1, janelaMs: 60000 });

    expect(limitador.registrar('1.1.1.1').permitido).toBe(true);
    expect(limitador.registrar('1.1.1.1').permitido).toBe(false);
    // Um endereço estourar não pode barrar o vizinho
    expect(limitador.registrar('2.2.2.2').permitido).toBe(true);
  });

  it('libera de novo quando a janela passa', () => {
    jest.useFakeTimers();
    try {
      const limitador = criarLimitador({ limite: 2, janelaMs: 1000 });

      limitador.registrar('1.1.1.1');
      limitador.registrar('1.1.1.1');
      expect(limitador.registrar('1.1.1.1').permitido).toBe(false);

      jest.advanceTimersByTime(1100);
      expect(limitador.registrar('1.1.1.1').permitido).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('informa quantas tentativas ainda restam', () => {
    const limitador = criarLimitador({ limite: 3, janelaMs: 60000 });
    expect(limitador.registrar('1.1.1.1').restantes).toBe(2);
    expect(limitador.registrar('1.1.1.1').restantes).toBe(1);
    expect(limitador.registrar('1.1.1.1').restantes).toBe(0);
  });
});
