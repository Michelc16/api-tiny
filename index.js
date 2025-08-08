import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// =======================
// CONFIGURAÇÃO
// =======================
const TOKEN_TINY = "f4289e0518d5c8c6a4efb59320abf02fa491bda2"; // 🔹 Seu token Tiny
const MARGEM_PRECO = 15; // 🔹 Margem percentual acima do orçamento permitida

// =======================
// Função auxiliar para requisições ao Tiny
// =======================
async function tinyRequest(endpoint, params = {}) {
  const url = new URL(`https://api.tiny.com.br/api2/${endpoint}`);
  url.searchParams.set("token", TOKEN_TINY);
  url.searchParams.set("formato", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  return await response.json();
}

// =======================
// Busca por nome no Tiny
// =======================
async function buscarPorNome(nome, precoMaximo) {
  const data = await tinyRequest("produtos.pesquisa.php", { pesquisa: nome });

  if (!data.retorno || !data.retorno.produtos) return [];

  const precoLimite = precoMaximo * (1 + MARGEM_PRECO / 100);

  return data.retorno.produtos
    .map(p => ({
      nome: p.produto.nome,
      preco: parseFloat(p.produto.preco || 0).toFixed(2)
    }))
    .filter(p => parseFloat(p.preco) <= precoLimite);
}

// =======================
// Busca por anúncios no Tiny
// =======================
async function buscarAnuncios(nome, precoMaximo) {
  const data = await tinyRequest("produtos.anuncios.listar.php");

  if (!data.retorno || !data.retorno.anuncios) return [];

  const precoLimite = precoMaximo * (1 + MARGEM_PRECO / 100);

  return data.retorno.anuncios
    .map(a => ({
      nome: a.anuncio.titulo,
      preco: parseFloat(a.anuncio.preco || 0).toFixed(2)
    }))
    .filter(a => a.nome.toLowerCase().includes(nome.toLowerCase()))
    .filter(a => parseFloat(a.preco) <= precoLimite);
}

// =======================
// Busca inteligente
// =======================
async function buscarProdutosInteligente(nome, precoMaximo) {
  // 1️⃣ Tenta busca por nome
  let resultados = await buscarPorNome(nome, precoMaximo);
  if (resultados.length > 0) return resultados;

  // 2️⃣ Tenta anúncios
  resultados = await buscarAnuncios(nome, precoMaximo);
  if (resultados.length > 0) return resultados;

  // 3️⃣ Busca parcial (primeira palavra)
  const primeiraPalavra = nome.split(" ")[0];
  resultados = await buscarPorNome(primeiraPalavra, precoMaximo);
  return resultados;
}

// =======================
// Rota Webhook Umbler
// =======================
app.post("/umbler-webhook", async (req, res) => {
  try {
    const { nomeProduto, precoMaximo } = req.body;

    if (!nomeProduto || !precoMaximo) {
      return res.status(400).json({ success: false, error: "Parâmetros inválidos" });
    }

    const produtos = await buscarProdutosInteligente(nomeProduto, precoMaximo);

    let mensagem;
    if (produtos.length === 0) {
      mensagem = `❌ Não encontrei produtos com o nome "${nomeProduto}" dentro do orçamento de R$ ${precoMaximo.toFixed(2)}.`;
    } else {
      mensagem = `📌 Com base no seu uso e orçamento de até R$ ${precoMaximo.toFixed(2)}, encontrei:\n` +
        produtos.slice(0, 3).map(p => `- ${p.nome} – R$ ${p.preco}`).join("\n");
    }

    // Retorno para a Umbler salvar no contexto
    res.json({
      success: true,
      produto: produtos.slice(0, 3), // array salvo em contexto.produto
      mensagem: mensagem // texto salvo em contexto.mensagem
    });

  } catch (error) {
    console.error("Erro no webhook:", error);
    res.status(500).json({ success: false, error: "Erro ao buscar produtos" });
  }
});

// =======================
// Servidor
// =======================
app.listen(3001, () => {
  console.log("🚀 Servidor rodando na porta 3001");
});
