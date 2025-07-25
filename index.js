const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 3001;

// Substitua pelo seu token do Tiny
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/produtos', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const produtos = response.data.retorno.produtos || [];

    res.json({ produtos });
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos no Tiny' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}/produtos`);
});
app.get('/', (req, res) => {
  res.send('API Tiny funcionando!');
});
app.get('/anuncio', async (req, res) => {
  const idEcommerce = req.query.idEcommerce;

  if (!idEcommerce) {
    return res.status(400).json({ erro: 'Informe o idEcommerce como parâmetro ?idEcommerce=' });
  }

  try {
    // 1. Buscar todos os produtos
    const produtosResp = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const produtos = produtosResp.data.retorno.produtos || [];

    for (const item of produtos) {
      const idProduto = item.produto.id;

      // 2. Buscar os anúncios do produto
      const anunciosResp = await axios.post(
        `https://api.tiny.com.br/api2/produtos.anuncios.listar.php?token=${TINY_TOKEN}&formato=json`,
        new URLSearchParams({ id: idProduto }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const anuncios = anunciosResp.data.retorno.anuncios || [];

      // 3. Verificar se algum anúncio tem o idEcommerce buscado
      const anuncioEncontrado = anuncios.find(anuncio => anuncio.anuncio.idEcommerce === idEcommerce);

      if (anuncioEncontrado) {
        return res.json({
          produto: item.produto,
          anuncio: anuncioEncontrado.anuncio
        });
      }
    }

    res.status(404).json({ erro: `Nenhum anúncio encontrado com idEcommerce = ${idEcommerce}` });

  } catch (error) {
    console.error('Erro ao buscar anúncio por idEcommerce:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar anúncio' });
  }
});

