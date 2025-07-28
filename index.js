<<<<<<< HEAD
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2'; // substitua se necessário

app.get('/', (req, res) => {
  res.send('API Tiny funcionando!');
});

// ✅ Rota limpa para retornar somente produtos
app.get('/produtos', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const produtosTiny = response.data.retorno.produtos || [];

    // Filtrando apenas os dados úteis dos produtos
    const produtosLimpos = produtosTiny.map(p => ({
      id: p.produto.id,
      codigo: p.produto.codigo,
      nome: p.produto.nome,
      preco: p.produto.preco,
      preco_promocional: p.produto.preco_promocional,
      marca: p.produto.marca,
      tipo: p.produto.tipo,
      situacao: p.produto.situacao,
      unidade: p.produto.unidade,
      ncm: p.produto.ncm,
      gtin: p.produto.gtin,
      estoque: p.produto.estoque
    }));

    res.json(produtosLimpos);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}/produtos`);
});
=======
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/produtos', async (req, res) => {
  try {
    const produtosResp = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json`
    );

    const listaProdutos = produtosResp.data.retorno.produtos || [];

    const produtosFormatados = listaProdutos.map(item => {
      const produto = item.produto;
      return {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco || produto.precoVenda || null,
        estoque: produto.estoqueAtual || 0,
        sku: produto.codigo
      };
    });

    res.json({ produtos: produtosFormatados });
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos no Tiny' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}/produtos`);
});
>>>>>>> a7ca1dbc3b1edd9b3f14e8953077909260cd4f73
