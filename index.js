const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/produtos', async (req, res) => {
  try {
    const nomeFiltro = req.query.nome?.toLowerCase() || '';
    const precoParam = parseFloat(req.query.preco);
    const precoInformado = isNaN(precoParam) ? null : precoParam;

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

    let produtosTotais = retornoPrimeira.produtos;
    const totalDePaginas = parseInt(retornoPrimeira.totalDePaginas) || 1;

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

    // 🔍 Limpar e filtrar os produtos
    let produtosFiltrados = produtosTotais
      .map(p => ({
        nome: p.produto.nome,
        preco: parseFloat(p.produto.preco),
        estoque: parseInt(p.produto.estoque) || 0
      }))
      .filter(p => !isNaN(p.preco) && p.estoque > 0);

    // 💵 Aplicar filtro por preço aproximado (tolerância de R$500)
    if (precoInformado !== null) {
      produtosFiltrados = produtosFiltrados.filter(p =>
        p.preco >= precoInformado - 500 && p.preco <= precoInformado + 500
      );
    }

    // 🔢 Retornar até 3 produtos ordenados por proximidade de preço
    if (precoInformado !== null) {
      produtosFiltrados.sort((a, b) =>
        Math.abs(a.preco - precoInformado) - Math.abs(b.preco - precoInformado)
      );
    }

    const top3 = produtosFiltrados.slice(0, 3);

    res.json(top3);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

