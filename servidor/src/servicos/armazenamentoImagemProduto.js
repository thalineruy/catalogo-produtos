// Imagens de produto no Supabase Storage.
//
// O redimensionamento acontece no navegador, antes do envio: uma foto de
// celular tem alguns megabytes e chegaria inteira ao servidor, gastando
// dados de quem cadastra e espaço no armazenamento. Aqui o servidor confere
// o que chegou, porque quem envia é o navegador do usuário e não se confia
// nele.
const { lerDimensao } = require('./dimensaoImagem');

const BUCKET = 'produtos';

// Folga sobre o que o navegador produz: 800×800 em JPEG fica perto de
// 120 KB. Um arquivo bem acima disso indica que o redimensionamento não
// aconteceu, e nesse caso é melhor recusar do que guardar.
const TAMANHO_MAXIMO_BYTES = 1 * 1024 * 1024;

// Abaixo disto a foto fica borrada na tela de edição do produto.
const LADO_MINIMO = 120;

const TIPOS_ACEITOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function validarImagemProduto(arquivo) {
  if (!arquivo) {
    return 'nenhum arquivo enviado';
  }
  if (!TIPOS_ACEITOS[arquivo.mimetype]) {
    return 'formato não permitido: envie um arquivo JPG, PNG ou WEBP';
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return 'arquivo maior que 1 MB, mesmo depois do ajuste automático';
  }

  const dimensao = lerDimensao(arquivo);
  if (dimensao && (dimensao.largura < LADO_MINIMO || dimensao.altura < LADO_MINIMO)) {
    return `imagem muito pequena (${dimensao.largura}×${dimensao.altura}): o mínimo é ${LADO_MINIMO}×${LADO_MINIMO}`;
  }

  return null;
}

function urlPublica(nomeArquivo) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nomeArquivo}`;
}

// Devolve o nome do objeto quando a URL aponta para o nosso bucket, e null
// para qualquer outra coisa. É o que impede o sistema de tentar apagar uma
// imagem hospedada por terceiros, quando alguém colou um endereço externo
// no lugar de enviar arquivo.
function nomeDoArquivoNaUrl(url) {
  if (!url || !process.env.SUPABASE_URL) return null;
  const prefixo = urlPublica('');
  if (!String(url).startsWith(prefixo)) return null;
  const nome = String(url).slice(prefixo.length);
  // Nada de subcaminho: o que gravamos é sempre um nome simples.
  return /^[A-Za-z0-9._-]+$/.test(nome) ? nome : null;
}

// O administrador não deveria precisar abrir os registros do servidor para
// descobrir que faltou criar o bucket.
function motivoDoArmazenamento(status, detalhe) {
  const texto = String(detalhe || '');

  if (status === 404 || /not found|bucket/i.test(texto)) {
    return `o espaço de armazenamento "${BUCKET}" não foi encontrado. Crie o bucket com esse nome, público, no painel do Supabase, em Storage.`;
  }
  if (status === 400 || status === 401 || status === 403) {
    return 'o armazenamento recusou o envio. Confira a variável SUPABASE_KEY no servidor.';
  }
  return `o armazenamento respondeu ${status}. Veja os registros do servidor.`;
}

async function enviarImagemProduto(arquivo) {
  const extensao = TIPOS_ACEITOS[arquivo.mimetype];
  const aleatorio = Math.random().toString(36).slice(2, 8);
  const nomeArquivo = `produto-${Date.now()}-${aleatorio}.${extensao}`;

  const resposta = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${nomeArquivo}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        apikey: process.env.SUPABASE_KEY,
        'Content-Type': arquivo.mimetype,
        'x-upsert': 'true',
      },
      body: arquivo.buffer,
    },
  );

  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => '');
    console.error(`falha ao enviar imagem (${resposta.status})`, texto.slice(0, 300));

    const erro = new Error(motivoDoArmazenamento(resposta.status, texto));
    erro.deArmazenamento = true;
    throw erro;
  }

  return urlPublica(nomeArquivo);
}

// Não lança: apagar a imagem antiga é limpeza, e falhar nisso não pode
// desfazer a troca que o usuário acabou de fazer. O pior caso é um arquivo
// órfão ocupando espaço.
async function removerImagemProduto(url) {
  const nomeArquivo = nomeDoArquivoNaUrl(url);
  if (!nomeArquivo) return false;

  try {
    const resposta = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${nomeArquivo}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
          apikey: process.env.SUPABASE_KEY,
        },
      },
    );
    if (!resposta.ok) {
      console.error(`falha ao apagar a imagem antiga (${resposta.status}) ${nomeArquivo}`);
      return false;
    }
    return true;
  } catch (erro) {
    console.error('erro de rede ao apagar a imagem antiga', erro.message);
    return false;
  }
}

module.exports = {
  validarImagemProduto,
  enviarImagemProduto,
  removerImagemProduto,
  nomeDoArquivoNaUrl,
  TIPOS_ACEITOS,
  TAMANHO_MAXIMO_BYTES,
  LADO_MINIMO,
  BUCKET,
};
