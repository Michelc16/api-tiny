const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

// Função para buscar anúncios de um produto
async function buscarAnunciosDoProduto(idProduto) {
  try {
    const response = await axios.post(
      `https://api.tiny.com.br/api2/produtos.anuncios.listar.php?token=${TINY_TOKEN}&formato=json`,
      new URLSearchParams({ id: idProduto }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.retorno.anuncios || [];
  } catch (error) {
    console.error(`Erro ao buscar anúncios para o produto ${idProduto}:`, error.message);
    return [];
  }
}

app.get('/produtos', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const produtosBrutos = response.data.retorno.produtos || [];

    const produtosComAnuncios = await Promise.all(
      produtosBrutos.map(async ({ produto }) => {
        const anuncios = await buscarAnunciosDoProduto(produto.id);

        return {
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          preco_promocional: produto.preco_promocional,
          estoque: produto.saldo_estoque,
          unidade: produto.unidade,
          situacao: produto.situacao,
          anuncios: anuncios.map(a => ({
            idEcommerce: a.anuncio.idEcommerce,
            plataforma: a.anuncio.plataforma,
            preco_anuncio: a.anuncio.preco,
            link: a.anuncio.url_produto || null
          }))
        };
      })
    );

    // Opcional: filtrar apenas produtos ativos e com estoque
    const filtrados = produtosComAnuncios.filter(p => p.situacao === 'A');

    res.json({ produtos: filtrados });
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos no Tiny' });
  }
});

app.get('/', (req, res) => {
  res.send('API Tiny funcionando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}`);
});
