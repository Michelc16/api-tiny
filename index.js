import express from 'express';
import axios from 'axios';

const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

// Endpoint para buscar produtos no Tiny ERP
app.get('/produtos', async (req, res) => {
  try {
    const nomeFiltro = req.query.nome?.toLowerCase() || '';
    const precoDesejado = parseFloat(req.query.preco);

    // Requisição para o Tiny
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
    if (!retorno.produtos) {
      return res.json({ produto: [] });
    }

    // Filtragem e processamento dos produtos
    const produtosFiltrados = retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const nomeCond = nome.includes(nomeFiltro);

        if (!precoDesejado || isNaN(precoDesejado)) return nomeCond;

        const preco = parseFloat(p.preco);
        const margem = precoDesejado * 0.15; // margem de 15%
        const precoCond = preco >= (precoDesejado - margem) && preco <= (precoDesejado + margem);

        return nomeCond && precoCond;
      })
      .sort((a, b) => {
        if (!precoDesejado || isNaN(precoDesejado)) return 0;
        const diffA = Math.abs(parseFloat(a.preco) - precoDesejado);
        const diffB = Math.abs(parseFloat(b.preco) - precoDesejado);
        return diffA - diffB;
      })
      .slice(0, 3) // retorna no máximo 3
      .map(p => ({
        nome: p.nome,
        preco: parseFloat(p.preco),
        estoque: p.estoque
      }));

    res.json({ produto: produtosFiltrados });
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

// Endpoint raiz (teste rápido)
app.get('/', (req, res) => {
  res.send('🟢 API Tiny está online e funcional!');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}/produtos`);
});
