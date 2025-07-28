const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;
const TINY_TOKEN = 'f4289e0518d5c8c6a4efb59320abf02fa491bda2';

app.get('/produtos', async (req, res) => {
  try {
    // 1. Buscar a primeira página para obter total de páginas
    const primeiraResp = await axios.post(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php`,
      new URLSearchParams({
        token: TINY_TOKEN,
        formato: 'json',
        pagina: '1',
        limite: '100',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const retornoPrimeira = primeiraResp.data.retorno;
    if (!retornoPrimeira.produtos) return res.json([]);

    const totalDePaginas = parseInt(retornoPrimeira.totalDePaginas) || 1;
    let produtosTotais = retornoPrimeira.produtos;

    if (totalDePaginas > 1) {
      // 2. Criar array de promises para as demais páginas
      const promessas = [];

      for (let pagina = 2; pagina <= totalDePaginas; pagina++) {
        const params = new URLSearchParams({
          token: TINY_TOKEN,
          formato: 'json',
          pagina: pagina.toString(),
          limite: '100',
        }).toString();

        promessas.push(
          axios.post(
            `https://api.tiny.com.br/api2/produtos.pesquisa.php`,
            params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          )
        );
      }

      // 3. Executar todas as chamadas paralelamente
      const respostas = await Promise.all(promessas);

      // 4. Juntar os produtos das páginas restantes
      for (const resp of respostas) {
        const prods = resp.data.retorno.produtos || [];
        produtosTotais = produtosTotais.concat(prods);
      }
    }

    // 5. Mapear para retorno limpo
    const produtosLimpos = produtosTotais.map(p => ({
      id: p.produto.id,
      codigo: p.produto.codigo,
      nome: p.produto.nome,
      preco: p.produto.preco,
      preco_promocional: p.produto.preco_promocional,
      marca: p.produto.marca,
      tipo: p.produto.tipo,
      situacao: p.produto.situacao,
      unidade: p.produto.unidade,
      ncm: p.produto.ncm,
      gtin: p.produto.gtin,
      estoque: p.produto.estoque
    }));

    res.json(produtosLimpos);
  } catch (error) {
    console.error('Erro ao buscar produtos do Tiny:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos do Tiny' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}/produtos`);
});
