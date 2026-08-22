require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');

const { pool } = require('./db');

const produtosRotas = require('./rotas/produtos');
const categoriasRotas = require('./rotas/categorias');
const saidasRotas = require('./rotas/saidas');
const logsRotas = require('./rotas/logs');
const authRotas = require('./rotas/auth');
const usuariosRotas = require('./rotas/usuarios');
const relatoriosRotas = require('./rotas/relatorios');
const empresaRotas = require('./rotas/empresa');
const estatisticasRotas = require('./rotas/estatisticas');
const recuperacaoSenhaRotas = require('./rotas/recuperacaoSenha');
const convitesRotas = require('./rotas/convites');
const solicitacoesRotas = require('./rotas/solicitacoes');
const { servicoEscolhido: servicoDeEmail } = require('./servicos/email');

const app = express();

// No Render a aplicação fica atrás de um proxy. Sem isto, req.ip seria
// sempre o endereço do proxy e o limite por IP das rotas públicas
// trancaria todo mundo junto, como se fosse uma pessoa só. O 1 é o
// número de saltos confiáveis: confiar em todos permitiria forjar o
// endereço pelo cabeçalho X-Forwarded-For.
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Confere o banco de verdade: antes esta rota respondia "ok" mesmo com o
// banco inacessível, que é justamente quando ela precisa avisar.
app.get('/saude', async (req, res) => {
  // Qual serviço de e-mail está ativo. Não expõe chave nenhuma, só o nome
  // do serviço — sem isto, descobrir se uma variável nova chegou ao
  // servidor virava adivinhação entre "o Render ainda não reconstruiu" e
  // "a variável está com o nome errado".
  const email = servicoDeEmail() || 'nao configurado';

  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok', email });
  } catch (erro) {
    console.error('falha ao consultar o banco em /saude', erro);
    res.status(503).json({ status: 'degradado', banco: 'fora', email });
  }
});

app.use('/produtos', produtosRotas);
app.use('/categorias', categoriasRotas);
app.use('/saidas', saidasRotas);
app.use('/logs', logsRotas);
app.use('/login', authRotas);
app.use('/usuarios', usuariosRotas);
app.use('/relatorios', relatoriosRotas);
app.use('/empresa', empresaRotas);
app.use('/estatisticas', estatisticasRotas);
app.use('/recuperacao-senha', recuperacaoSenhaRotas);
app.use('/convites', convitesRotas);
app.use('/solicitacoes-acesso', solicitacoesRotas);

app.use((req, res) => {
  res.status(404).json({ erro: 'rota não encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
