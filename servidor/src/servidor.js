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

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Confere o banco de verdade: antes esta rota respondia "ok" mesmo com o
// banco inacessível, que é justamente quando ela precisa avisar.
app.get('/saude', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', banco: 'ok' });
  } catch (erro) {
    console.error('falha ao consultar o banco em /saude', erro);
    res.status(503).json({ status: 'degradado', banco: 'fora' });
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
