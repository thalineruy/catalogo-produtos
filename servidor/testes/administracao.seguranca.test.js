jest.mock('../src/repositorios/empresaRepositorio');
jest.mock('../src/repositorios/usuariosRepositorio');
jest.mock('../src/repositorios/categoriasRepositorio');
jest.mock('../src/repositorios/estatisticasRepositorio');
jest.mock('../src/repositorios/logsRepositorio');

const request = require('supertest');
const app = require('../src/servidor');
const { gerarToken } = require('./ajudantes/token');

const tokenOperador = `Bearer ${gerarToken({ id: 9, nivel: 'operador' })}`;

const ROTAS_ADMINISTRATIVAS = [
  { metodo: 'put', caminho: '/empresa' },
  { metodo: 'post', caminho: '/empresa/logotipo' },
  { metodo: 'get', caminho: '/usuarios' },
  { metodo: 'post', caminho: '/usuarios' },
  { metodo: 'put', caminho: '/usuarios/1/nivel' },
  { metodo: 'post', caminho: '/usuarios/1/reset-senha' },
  { metodo: 'delete', caminho: '/usuarios/1' },
  { metodo: 'post', caminho: '/categorias' },
  { metodo: 'put', caminho: '/categorias/1' },
  { metodo: 'delete', caminho: '/categorias/1' },
  { metodo: 'get', caminho: '/estatisticas' },
];

describe('rotas de administração exigem nível administrador', () => {
  it.each(ROTAS_ADMINISTRATIVAS)('$metodo $caminho responde 403 para operador', async ({ metodo, caminho }) => {
    const resposta = await request(app)[metodo](caminho).set('Authorization', tokenOperador).send({});
    expect(resposta.status).toBe(403);
  });
});
