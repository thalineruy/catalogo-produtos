require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');

const produtosRotas = require('./rotas/produtos');
const categoriasRotas = require('./rotas/categorias');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/saude', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/produtos', produtosRotas);
app.use('/categorias', categoriasRotas);

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
