const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/produtos', async (req, res) => {
  try {
    const nomeFiltro = req.query.nome?.toLowerCase() || '';
    const precoDesejado = parseFloat(req.query.preco);

    const primeiraResp = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php`,
      new URLSearchParams({
        token: TINY_TOKEN,
        formato: 'json',
        pagina: '1',
        limite: '100',
        pesquisa: nomeFiltro
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const retornoPrimeira = primeiraResp.data.retorno;
    if (!retornoPrimeira.produtos) return res.json([]);

    const totalDePaginas = parseInt(retornoPrimeira.totalDePaginas) || 1;
    let produtosTotais = retornoPrimeira.produtos;

    if (totalDePaginas > 1) {
      const promessas = [];

      for (let pagina = 2; pagina <= totalDePaginas; pagina++) {
        const params = new URLSearchParams({
          token: TINY_TOKEN,
          formato: 'json',
          pagina: pagina.toString(),
          limite: '100',
          pesquisa: nomeFiltro
        }).toString();

        promessas.push(
          axios.post(
            `https://api.tiny.com.br/api2/produtos.pesquisa.php`,
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          )
        );
      }

      const respostas = await Promise.all(promessas);
      for (const resp of respostas) {
        const prods = resp.data.retorno.produtos || [];
        produtosTotais = produtosTotais.concat(prods);
      }
    }

    const produtosLimpos = produtosTotais.map(p => ({
      nome: p.produto.nome,
      preco: parseFloat(p.produto.preco),
      estoque: parseInt(p.produto.estoque) || 0
    })).filter(p => !isNaN(p.preco) && p.estoque > 0);

    // Se o preço foi informado, ordenar por "distância" do preço desejado
    const produtosOrdenados = !isNaN(precoDesejado)
      ? produtosLimpos.sort((a, b) =>
          Math.abs(a.preco - precoDesejado) - Math.abs(b.preco - precoDesejado)
        )
      : produtosLimpos.sort((a, b) => a.preco - b.preco);

    const top3 = produtosOrdenados.slice(0, 3);

    res.json(top3);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

app.get('/', (req, res) => {
  res.send('API Tiny está online 🚀');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}/produtos`);
});
