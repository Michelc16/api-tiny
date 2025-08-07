const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configurações
const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';
const UMBLER_AUTH_TOKEN = 'DEDF807BB2E61F834FE09F20F8080F248D722B433C7534C3AEB88E16801E9B5F'; 

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * Endpoint específico para webhook da Umbler Talk
 * POST /umbler-webhook
 */
app.post('/umbler-webhook', async (req, res) => {
  // Validação do token de autorização
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${UMBLER_AUTH_TOKEN}`) {
    return res.status(401).json({
      success: false,
      error: "Não autorizado",
      message: "Token de autenticação inválido"
    });
  }

  try {
    // Validação do payload
    if (!req.body || !req.body.message) {
      return res.status(400).json({
        success: false,
        error: "Requisição inválida",
        message: "O campo 'message' é obrigatório",
        example: {
          message: "Notebook até R$ 3000",
          context: {
            organizationId: "org_123",
            userId: "user_456"
          }
        }
      });
    }

    const { message, context = {} } = req.body;
    
    // Processamento da mensagem
    const produtos = await buscarProdutos(message);
    
    // Formatação da resposta
    const resposta = formatarResposta(produtos, message);

    // Headers importantes
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Resposta padrão Umbler
    return res.status(200).json({
      success: true,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      response: resposta.textoChat,
      data: {
        products: resposta.produtos,
        metadata: {
          organizationId: context.organizationId,
          query: message
        }
      },
      actions: [
        {
          type: "button",
          text: "Selecionar",
          value: "select"
        },
        {
          type: "button",
          text: "Falar com atendente",
          value: "human"
        }
      ]
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({
      success: false,
      error: "internal_server_error",
      message: "Ocorreu um erro ao processar sua solicitação",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Função para buscar produtos na API Tiny
async function buscarProdutos(query) {
  try {
    // Extrai parâmetros da mensagem
    const termo = query.split('até')[0].trim() || '';
    const precoMatch = query.match(/R\$\s*([\d,.]+)/);
    const precoMax = precoMatch ? parseFloat(precoMatch[1].replace(',', '.')) : null;

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
        if (!precoMax) return true;
        const preco = parseFloat(p.preco);
        return preco <= precoMax * 1.1; // 10% de margem
      })
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        nome: p.nome,
        preco: parseFloat(p.preco).toFixed(2),
        estoque: p.estoque || 0,
        disponivel: (p.estoque || 0) > 0
      }));
  } catch (error) {
    console.error('Erro na API Tiny:', error);
    throw new Error('Falha ao buscar produtos');
  }
}

// Formata a resposta para o chat
function formatarResposta(produtos, query) {
  if (produtos.length === 0) {
    return {
      textoChat: `Não encontrei resultados para "${query}". Deseja tentar com outros termos?`,
      produtos: []
    };
  }

  return {
    textoChat: `Encontrei ${produtos.length} resultado(s) para "${query}":\n\n` +
      produtos.map((p, i) => 
        `${i+1}. *${p.nome}* - R$ ${p.preco}\n` +
        `   ${p.disponivel ? '✅ Disponível' : '❌ Indisponível'}` +
        (p.estoque ? ` (${p.estoque} un)` : '')
      ).join('\n\n'),
    produtos: produtos
  };
}

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'API Tiny - Umbler Webhook',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Webhook Umbler: http://localhost:${PORT}/umbler-webhook`);
});