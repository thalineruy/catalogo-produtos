const { lerDimensao } = require('./dimensaoImagem');

const BUCKET = 'logotipos';
const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024;
const LADO_MINIMO = 240;

const TIPOS_ACEITOS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};

function validarArquivoLogotipo(arquivo) {
  if (!arquivo) {
    return 'nenhum arquivo enviado';
  }
  if (!TIPOS_ACEITOS[arquivo.mimetype]) {
    return 'formato não permitido: envie um arquivo PNG, JPG ou SVG';
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return 'arquivo maior que 2 MB';
  }

  // SVG é vetorial e escala sem perder qualidade, então não tem lado mínimo
  const dimensao = lerDimensao(arquivo);
  if (dimensao && (dimensao.largura < LADO_MINIMO || dimensao.altura < LADO_MINIMO)) {
    return `imagem muito pequena (${dimensao.largura}×${dimensao.altura}): o mínimo é ${LADO_MINIMO}×${LADO_MINIMO}`;
  }

  return null;
}

async function enviarLogotipo(arquivo) {
  const extensao = TIPOS_ACEITOS[arquivo.mimetype];
  const nomeArquivo = `logotipo-${Date.now()}.${extensao}`;
  const urlEnvio = `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${nomeArquivo}`;

  const resposta = await fetch(urlEnvio, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
      apikey: process.env.SUPABASE_KEY,
      'Content-Type': arquivo.mimetype,
      'x-upsert': 'true',
    },
    body: arquivo.buffer,
  });

  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => '');
    throw new Error(`falha ao enviar o logotipo para o armazenamento (${resposta.status}): ${texto}`);
  }

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nomeArquivo}`;
}

module.exports = {
  validarArquivoLogotipo,
  enviarLogotipo,
  TIPOS_ACEITOS,
  TAMANHO_MAXIMO_BYTES,
  LADO_MINIMO,
  BUCKET,
};
