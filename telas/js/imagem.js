/* Ajuste da imagem do produto antes do envio.

   O redimensionamento acontece aqui, e não no servidor, por três motivos.
   Uma foto de celular tem alguns megabytes e subiria inteira, gastando os
   dados de quem cadastra no balcão. O servidor não precisa de biblioteca de
   imagem, que traria binário nativo e tempo de reconstrução. E, ao
   reprocessar a foto, os dados de localização que o celular grava junto se
   perdem — a coordenada de onde a foto foi tirada não vai para o servidor.

   O servidor confere assim mesmo o que chega: quem envia é o navegador do
   usuário, e nele não se confia. */

const LADO_MAXIMO = 800;
const QUALIDADE = 0.82;

// Nem toda foto precisa encolher: uma imagem já pequena reprocessada só
// perderia qualidade à toa.
function calcularDestino(largura, altura) {
  const maior = Math.max(largura, altura);
  if (maior <= LADO_MAXIMO) return { largura, altura };

  const proporcao = LADO_MAXIMO / maior;
  return {
    largura: Math.round(largura * proporcao),
    altura: Math.round(altura * proporcao),
  };
}

async function ajustarImagemDoProduto(arquivo) {
  // imageOrientation "from-image" respeita a rotação que o celular grava:
  // sem isso, foto tirada na vertical chega deitada.
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });

  try {
    const destino = calcularDestino(bitmap.width, bitmap.height);

    const tela = document.createElement('canvas');
    tela.width = destino.largura;
    tela.height = destino.altura;

    const contexto = tela.getContext('2d');
    // Fundo branco: JPEG não tem transparência, e sem isto o que era
    // transparente num PNG viraria preto.
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, destino.largura, destino.altura);
    contexto.drawImage(bitmap, 0, 0, destino.largura, destino.altura);

    const blob = await new Promise((resolver) => {
      tela.toBlob(resolver, 'image/jpeg', QUALIDADE);
    });

    if (!blob) throw new Error('Não foi possível processar esta imagem. Tente outro arquivo.');

    return {
      arquivo: new File([blob], 'produto.jpg', { type: 'image/jpeg' }),
      largura: destino.largura,
      altura: destino.altura,
      bytesOriginais: arquivo.size,
      bytesFinais: blob.size,
    };
  } finally {
    // Libera a memória do bitmap sem esperar o coletor de lixo. Uma foto de
    // 12 megapixels ocupa cerca de 48 MB descomprimida.
    bitmap.close();
  }
}

function formatarTamanho(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
