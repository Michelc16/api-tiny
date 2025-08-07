const express = require('express');
const axios = require('axios');
<<<<<<< HEAD
const cors = require('cors'); // Não esqueça de instalar: npm install cors
const app = express();

// Configurações básicas
const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint Raiz (Health Check)
app.get('/', (req, res) => {
  res.send('🟢 API Tiny está online e funcional!');
});

// Endpoint de Produtos
=======
const cors = require('cors'); // Adicione esta linha
const app = express();

// Middlewares
app.use(cors()); // Habilita CORS
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

>>>>>>> 3fd6222f64733ab189317cb0c992d0552ef722f1
app.get('/produtos', async (req, res) => {
  try {
    const nomeFiltro = req.query.nome?.toLowerCase() || '';
    const precoDesejado = !isNaN(req.query.preco) ? parseFloat(req.query.preco) : null;

    const response = await axios.post(
      'https://api.tiny.com.br/api2/produtos.pesquisa.php',
      new URLSearchParams({
        token: TINY_TOKEN,
        formato: 'json',
        pesquisa: nomeFiltro,
        pagina: '1',
        limite: '100'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const retorno = response.data.retorno;
    if (!retorno.produtos) {
      return res.json({ success: true, data: [], message: "Nenhum produto encontrado" });
    }

    const produtosFiltrados = retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const nomeCond = nome.includes(nomeFiltro);
        if (!precoDesejado) return nomeCond;

        const preco = parseFloat(p.preco);
        const margem = precoDesejado * 0.15;
        return nomeCond && (preco >= (precoDesejado - margem) && preco <= (precoDesejado + margem));
      })
      .sort((a, b) => Math.abs(parseFloat(a.preco) - precoDesejado) - Math.abs(parseFloat(b.preco) - precoDesejado))
      .slice(0, 3)
      .map(p => ({
        nome: p.nome,
        preco: parseFloat(p.preco),
        estoque: p.estoque
      }));

    res.json({ 
      success: true,
      data: produtosFiltrados,
      message: "Produtos filtrados com sucesso"
    });

  } catch (error) {
    console.error('Erro completo:', error);
    res.status(500).json({ 
      success: false,
      error: "Erro ao buscar produtos",
      details: error.message
    });
  }
});

<<<<<<< HEAD
// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔍 Endpoint de produtos: http://localhost:${PORT}/produtos`);
});
=======
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
>>>>>>> 3fd6222f64733ab189317cb0c992d0552ef722f1
