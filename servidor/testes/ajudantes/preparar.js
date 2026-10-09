// Preparação comum a todos os testes.
//
// Desde que existe a desativação de conta, toda chamada autenticada
// consulta o banco para saber se a conta continua ativa. Nos testes não
// há banco, então o repositório de usuários entra sempre dublado e
// responde "conta ativa" por padrão.
//
// Cada teste que precisar do contrário — conta desativada ou excluída —
// é só sobrescrever essa resposta.

jest.mock('../../src/repositorios/usuariosRepositorio');

const usuariosRepositorio = require('../../src/repositorios/usuariosRepositorio');

beforeEach(() => {
  usuariosRepositorio.situacaoDaConta.mockResolvedValue({ ativo: true });
});
