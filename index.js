const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configurações
const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';
const UMBLER_SECRET = 'meu-api-token-atual-2025-08-07-2093-08-25--DEDF807BB2E61F834FE09F20F8080F248D722B433C7534C3AEB88E16801E9B5F'; // Chave para validar webhooks

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * Middleware de autenticação para webhooks
 */
const authenticateWebhook = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || authHeader !== `Bearer ${UMBLER_SECRET}`) {
    return res.status(403).json({
      success: false,
      error: "Unauthorized",
      message: "Token de autenticação inválido"
    });
  }
  next();
};

/**
 * Endpoint GET para teste manual
 * (Acesso via navegador ou curl)
 */
app.get('/umbler-webhook', (req, res) => {
  res.status(200).json({
    status: 'active',
    instructions: 'Este endpoint requer POST. Exemplo de uso:',
    example: {
      method: 'POST',
      url: '/umbler-webhook',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UMBLER_SECRET}`
      },
      body: {
        message: "Notebook até R$ 3000",
        context: {
          organizationId: "org_123",
          userId: "user_456"
        }
      }
    }
  });
});

/**
 * Endpoint principal para webhook da Umbler
 * POST /umbler-webhook
 */
app.post('/umbler-webhook', authenticateWebhook, async (req, res) => {
  try {
    // 1. Validação do payload
    if (!req.body || !req.body.message) {
      return res.status(400).json({
        success: false,
        error: "invalid_request",
        message: "O campo 'message' é obrigatório"
      });
    }

    const { message, context = {} } = req.body;
    
    // 2. Processamento da mensagem
    const termoBusca = message.split('até')[0].trim();
    const precoMatch = message.match(/R\$\s*([\d.,]+)/);
    const precoMax = precoMatch ? parseFloat(precoMatch[1].replace(',', '.')) : null;

    // 3. Busca produtos na API Tiny (exemplo implementado)
    const produtos = await buscarProdutosTiny(termoBusca, precoMax);

    // 4. Formata resposta para o chat
    const respostaChat = formatarRespostaChat(produtos, termoBusca, precoMax);

    // 5. Retorno padronizado
    res.status(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      .json({
        success: true,
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        response: respostaChat,
        data: {
          products: produtos,
          metadata: {
            organizationId: context.organizationId,
            searchTerm: termoBusca,
            maxPrice: precoMax
          }
        },
        actions: [
          {
            type: "button",
            text: "🛒 Selecionar",
            value: "select_product"
          },
          {
            type: "button",
            text: "💬 Falar com atendente",
            value: "human_help"
          }
        ]
      });

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "Ocorreu um erro ao processar sua solicitação",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Função para buscar produtos na API Tiny
 */
async function buscarProdutosTiny(termo, precoMaximo) {
  try {
    const response = await axios.post(
      'https://api.tiny.com.br/api2/produtos.pesquisa.php',
      new URLSearchParams({
        token: TINY_TOKEN,
        formato: 'json',
        pesquisa: termo,
        pagina: '1',
        limite: '10'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const retorno = response.data.retorno;
    
    if (!retorno.produtos) return [];

    return retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        if (!precoMaximo) return true;
        const preco = parseFloat(p.preco);
        return preco <= precoMaximo * 1.15; // 15% de margem
      })
      .sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        preco: parseFloat(p.preco).toFixed(2),
        estoque: p.estoque || 0,
        disponivel: (p.estoque || 0) > 0,
        url_imagem: p.imagem_thumbnail || null
      }));
  } catch (error) {
    console.error('Erro na API Tiny:', error);
    throw new Error('Falha ao consultar produtos');
  }
}

/**
 * Formata a resposta para o chat
 */
function formatarRespostaChat(produtos, termoBusca, precoMaximo) {
  if (produtos.length === 0) {
    return `Não encontrei produtos ${termoBusca ? `"${termoBusca}"` : ''} ` +
           `${precoMaximo ? `até R$ ${precoMaximo.toFixed(2)}` : ''}. ` +
           `Deseja tentar com outros parâmetros?`;
  }

  return `🔍 Encontrei ${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'} ` +
         `${termoBusca ? `para "${termoBusca}"` : ''} ` +
         `${precoMaximo ? `até R$ ${precoMaximo.toFixed(2)}` : ''}:\n\n` +
         produtos.map((p, i) => 
           `${i + 1}. *${p.nome}* - R$ ${p.preco}\n` +
           `   ${p.disponivel ? '✅ Disponível' : '❌ Indisponível'}` +
           `${p.estoque ? ` (${p.estoque} em estoque)` : ''}` +
           `${p.url_imagem ? `\n   📸 [Ver imagem](${p.url_imagem})` : ''}`
         ).join('\n\n') +
         `\n\nEscolha uma opção ou ajuste sua busca.`;
}

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'API Tiny - Webhook Umbler',
    version: '1.0.0',
    endpoints: {
      webhook: '/umbler-webhook',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Endpoint de saúde simplificado
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Webhook Umbler: http://localhost:${PORT}/umbler-webhook`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
});