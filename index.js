const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/', (req, res) => {
  res.send('API Tiny funcionando!');
});

app.get('/produtos', async (req, res) => {
  try {
    let produtosTotais = [];
    let pagina = 1;
    let totalDePaginas = 1;

    do {
      const response = await axios.post(
        `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${TINY_TOKEN}&formato=json&pagina=${pagina}&limite=100`
      );

      const retorno = response.data.retorno;

      if (!retorno.produtos) break;

      produtosTotais = produtosTotais.concat(retorno.produtos);

      totalDePaginas = parseInt(retorno.totalDePaginas) || 1;
      pagina++;
    } while (pagina <= totalDePaginas);

    // Mapear apenas os campos desejados
    const produtosLimpos = produtosTotais.map(p => ({
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
