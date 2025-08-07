const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Adicione esta linha
const app = express();

// Configurações básicas
const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

// Middlewares
app.use(cors()); // Habilita CORS para todas as rotas
app.use(express.json()); // Permite parsing de JSON

// Endpoint Raiz (Health Check)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: '🟢 API Tiny está operacional',
    version: '1.0.0'
  });
});

// Endpoint de Produtos (Otimizado para Umbler Talk)
app.get('/produtos', async (req, res) => {
  try {
    const { nome, preco } = req.query;
    const nomeFiltro = nome?.toLowerCase() || '';
    const precoDesejado = parseFloat(preco) || null;

    // Requisição para a API Tiny
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
    
    if (!retorno.produtos || retorno.produtos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum produto encontrado com os critérios informados',
        data: []
      });
    }

    // Processamento dos produtos
    const produtosFiltrados = retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        const nomeProduto = p.nome?.toLowerCase() || '';
        const nomeCond = nomeProduto.includes(nomeFiltro);
        
        if (!precoDesejado) return nomeCond;
        
        const precoProduto = parseFloat(p.preco);
        const margem = precoDesejado * 0.15;
        return nomeCond && 
               (precoProduto >= (precoDesejado - margem) && 
                precoProduto <= (precoDesejado + margem));
      })
      .sort((a, b) => {
        const diffA = Math.abs(parseFloat(a.preco) - precoDesejado);
        const diffB = Math.abs(parseFloat(b.preco) - precoDesejado);
        return diffA - diffB;
      })
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        preco: parseFloat(p.preco).toFixed(2),
        estoque: p.estoque,
        url_imagem: p.imagem_thumbnail || null
      }));

    // Formata resposta para Umbler Talk
    const respostaUmbler = produtosFiltrados.length > 0 
      ? `Encontrei ${produtosFiltrados.length} produto(s) para você:`
      : 'Não encontrei produtos com esses critérios.';

    res.status(200).json({
      success: true,
      message: respostaUmbler,
      data: produtosFiltrados,
      formatted_response: produtosFiltrados.map(p => 
        `- ${p.nome}: R$ ${p.preco} (Estoque: ${p.estoque})`
      ).join('\n')
    });

  } catch (error) {
    console.error('Erro na API:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar sua requisição',
      details: process.env.NODE_ENV === 'development' 
        ? error.message 
        : undefined
    });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔍 Endpoint de produtos: http://localhost:${PORT}/produtos`);
  console.log(`🔄 Health Check: http://localhost:${PORT}/`);
});