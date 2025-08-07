const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configurações
const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * Endpoint específico para webhook da Umbler Talk
 * POST /umbler-webhook
 */
app.post('/umbler-webhook', async (req, res) => {
  try {
    // 1. Validação básica do payload
    if (!req.body || !req.body.message) {
      return res.status(400).json({
        success: false,
        error: "Payload inválido. O campo 'message' é obrigatório.",
        example: {
          message: "Notebook até R$ 3000",
          context: {
            organizationId: "seu-id",
            userId: "123"
          }
        }
      });
    }

    const { message, context = {} } = req.body;
    
    // 2. Extrai parâmetros da mensagem
    const { nome, preco } = extractParams(message);
    const nomeFiltro = nome?.toLowerCase() || '';
    const precoDesejado = parseFloat(preco) || null;

    // 3. Busca produtos na API Tiny
    const produtos = await buscarProdutosTiny(nomeFiltro, precoDesejado);

    // 4. Formata resposta para o chat
    const respostaFormatada = formatarResposta(produtos, {
      orcamento: precoDesejado,
      termoBusca: nomeFiltro
    });

    // 5. Retorno padronizado para Umbler
    res.status(200).json({
      success: true,
      response: respostaFormatada.textoChat,
      data: {
        produtos: respostaFormatada.dadosProdutos,
        metadata: {
          termoBusca: nomeFiltro,
          orcamento: precoDesejado,
          timestamp: new Date().toISOString()
        }
      },
      actions: [
        {
          type: "button",
          text: "Ver detalhes",
          value: "detalhes"
        },
        {
          type: "button",
          text: "Falar com atendente",
          value: "atendente"
        }
      ]
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    
    // Resposta de erro padronizada
    res.status(500).json({
      success: false,
      error: "Ocorreu um erro ao processar sua solicitação",
      userMessage: "Desculpe, estou com dificuldades técnicas. Por favor, tente novamente mais tarde.",
      technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Função para buscar produtos na API Tiny
async function buscarProdutosTiny(nome, precoMaximo) {
  try {
    const response = await axios.post(
      'https://api.tiny.com.br/api2/produtos.pesquisa.php',
      new URLSearchParams({
        token: TINY_TOKEN,
        formato: 'json',
        pesquisa: nome,
        pagina: '1',
        limite: '100'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const retorno = response.data.retorno;
    
    if (!retorno.produtos) return [];

    return retorno.produtos
      .map(p => p.produto)
      .filter(p => {
        const nomeProduto = p.nome?.toLowerCase() || '';
        const nomeCond = nomeProduto.includes(nome);
        
        if (!precoMaximo) return nomeCond;
        
        const precoProduto = parseFloat(p.preco);
        const margem = precoMaximo * 0.15;
        return nomeCond && 
               (precoProduto >= (precoMaximo - margem) && 
                precoProduto <= (precoMaximo + margem));
      })
      .sort((a, b) => {
        const diffA = Math.abs(parseFloat(a.preco) - precoMaximo);
        const diffB = Math.abs(parseFloat(b.preco) - precoMaximo);
        return diffA - diffB;
      })
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

// Função para extrair parâmetros da mensagem
function extractParams(message) {
  // Extrai valores como "Notebook até R$ 3000"
  const precoMatch = message.match(/R\$\s*(\d+[\.,]?\d*)/);
  const preco = precoMatch ? parseFloat(precoMatch[1].replace(',', '.')) : null;
  
  const termoMatch = message.match(/^(.*?)(?=\s*(até|por)\s*R\$|$)/);
  const termo = termoMatch ? termoMatch[0].trim() : null;

  return {
    nome: termo,
    preco: preco
  };
}

// Função para formatar a resposta
function formatarResposta(produtos, { orcamento, termoBusca }) {
  if (produtos.length === 0) {
    return {
      textoChat: `Não encontrei produtos ${termoBusca ? `"${termoBusca}"` : ''} ${orcamento ? `até R$ ${orcamento.toFixed(2)}` : ''}. Deseja tentar com outros parâmetros?`,
      dadosProdutos: []
    };
  }

  const textoChat = 
    `Encontrei ${produtos.length} ${produtos.length === 1 ? 'opção' : 'opções'} ` +
    `${termoBusca ? `para "${termoBusca}"` : ''} ` +
    `${orcamento ? `até R$ ${orcamento.toFixed(2)}` : ''}:\n\n` +
    produtos.map((p, i) => 
      `${i + 1}. *${p.nome}* - R$ ${p.preco}\n` +
      `   ${p.disponivel ? `✅ Disponível (${p.estoque} un)` : '❌ Indisponível'}\n` +
      `   ${p.url_imagem ? `[Ver imagem](${p.url_imagem})` : ''}`
    ).join('\n\n') +
    `\n\nDeseja mais informações sobre algum produto?`;

  return {
    textoChat: textoChat,
    dadosProdutos: produtos
  };
}

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'API Tiny - Webhook Umbler',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Webhook Umbler: http://localhost:${PORT}/umbler-webhook`);
});