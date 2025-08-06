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

    const retorno = primeiraResp.data.retorno;
    if (!retorno.produtos) return res.json([]);

    const produtosFiltrados = retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const nomeCond = nome.includes(nomeFiltro);

        if (!precoDesejado || isNaN(precoDesejado)) return nomeCond;

        const preco = parseFloat(p.preco);
        const margem = precoDesejado * 0.15;
        const precoCond = preco >= (precoDesejado - margem) && preco <= (precoDesejado + margem);

        return nomeCond && precoCond;
      })
      .slice(0, 3) // limita a 3 produtos

      .map(p => ({
        nome: p.nome,
        preco: p.preco,
        estoque: p.estoque
      }));

    res.json(produtosFiltrados);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

app.get('/', (req, res) => {
  res.send('API Tiny está online 🚀');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}/produtos`);
});
