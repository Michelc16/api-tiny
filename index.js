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
