const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/produtos', async (req, res) => {
  try {
    const nomeFiltro = req.query.nome?.toLowerCase() || '';
    const precoDesejado = parseFloat(req.query.preco);

    // 1. Requisição para o Tiny buscando produtos
    const primeiraResp = await axios.post(
      'https://api.tiny.com.br/api2/produtos.pesquisa.php',
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

    // 2. Processa os produtos e aplica filtros
    const produtosFiltrados = retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const nomeCond = nome.includes(nomeFiltro);

        if (!precoDesejado || isNaN(precoDesejado)) return nomeCond;

        const preco = parseFloat(p.preco);
        const margem = precoDesejado * 0.15; // 15% de margem
        const precoCond = preco >= (precoDesejado - margem) && preco <= (precoDesejado + margem);

        return nomeCond && precoCond;
      })
      .sort((a, b) => {
        // Ordena pelo preço mais próximo do desejado
        const diffA = Math.abs(parseFloat(a.preco) - precoDesejado);
        const diffB = Math.abs(parseFloat(b.preco) - precoDesejado);
        return diffA - diffB;
      })
      .slice(0, 3) // limita a 3 resultados

      .map(p => ({
        nome: p.nome,
        preco: parseFloat(p.preco),
        estoque: p.estoque
      }));

    res.json(produtosFiltrados);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

// Endpoint raiz
app.get('/', (req, res) => {
  res.send('🟢 API Tiny está online e funcional!');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}/produtos`);
});
