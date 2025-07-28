const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

// Endpoint raiz
app.get('/', (req, res) => {
  res.send('API Tiny funcionando!');
});

// Endpoint para buscar produtos com resposta limpa
app.get('/produtos', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const produtos = response.data?.retorno?.produtos || [];

    const produtosFormatados = produtos.map(({ produto }) => ({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      preco_promocional: produto.preco_promocional,
      estoque: produto.saldo || 0
    }));

    res.json(produtosFormatados);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos no Tiny' });
  }
});

// Endpoint para buscar anúncio por idEcommerce
app.get('/anuncio', async (req, res) => {
  const idEcommerce = req.query.idEcommerce;

  if (!idEcommerce) {
    return res.status(400).json({ erro: 'Informe o idEcommerce como parâmetro ?idEcommerce=' });
  }

  try {
    const produtosResp = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const produtos = produtosResp.data?.retorno?.produtos || [];

    for (const { produto } of produtos) {
      const idProduto = produto.id;

      const anunciosResp = await axios.post(
        `https://api.tiny.com.br/api2/produtos.anuncios.listar.php?token=${TINY_TOKEN}&formato=json`,
        new URLSearchParams({ id: idProduto }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const anuncios = anunciosResp.data?.retorno?.anuncios || [];

      const anuncioEncontrado = anuncios.find(
        anuncio => anuncio.anuncio.idEcommerce === idEcommerce
      );

      if (anuncioEncontrado) {
        return res.json({
          produto: {
            nome: produto.nome,
            preco: produto.preco,
            preco_promocional: produto.preco_promocional,
            estoque: produto.saldo || 0
          },
          anuncio: anuncioEncontrado.anuncio
        });
      }
    }

    res.status(404).json({ erro: `Nenhum anúncio encontrado com idEcommerce = ${idEcommerce}` });

  } catch (error) {
    console.error('Erro ao buscar anúncio:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar anúncio' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}`);
});
