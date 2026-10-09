// A sessão vale 8 horas, então desativar uma conta só faz sentido se o
// corte valer para quem já está com o sistema aberto. Quem garante isso é
// o middleware, conferindo a situação a cada chamada.

jest.mock('../src/repositorios/produtosRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const usuariosRepositorio = require('../src/repositorios/usuariosRepositorio');
const produtosRepositorio = require('../src/repositorios/produtosRepositorio');
const { gerarToken } = require('./ajudantes/token');

const token = `Bearer ${gerarToken({ id: 7, nivel: 'operador' })}`;

describe('acesso de conta desativada', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('recusa a chamada quando a conta foi desativada depois do login', async () => {
    usuariosRepositorio.situacaoDaConta.mockResolvedValue({ ativo: false });

    const resposta = await request(app).get('/produtos/alertas-estoque').set('Authorization', token);

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toMatch(/desativada/i);
    expect(produtosRepositorio.listarAlertasDeEstoque).not.toHaveBeenCalled();
  });

  it('recusa a chamada quando a conta foi excluída com o token ainda válido', async () => {
    usuariosRepositorio.situacaoDaConta.mockResolvedValue(null);

    const resposta = await request(app).get('/produtos/alertas-estoque').set('Authorization', token);

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toMatch(/não existe/i);
  });

  it('deixa passar quando a conta continua ativa', async () => {
    usuariosRepositorio.situacaoDaConta.mockResolvedValue({ ativo: true });
    produtosRepositorio.listarAlertasDeEstoque.mockResolvedValue([]);

    const resposta = await request(app).get('/produtos/alertas-estoque').set('Authorization', token);

    expect(resposta.status).toBe(200);
  });
});
