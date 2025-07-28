app.get('/produtos', async (req, res) => {
  try {
    const filtroNome = req.query.nome || '';  // ?nome=notebook
    const filtroTipo = req.query.tipo || '';  // ?tipo=Periférico

    let produtosTotais = [];
    let pagina = 1;
    let totalDePaginas = 1;

    do {
      // Monta o corpo da requisição, incluindo filtro por nome se passado
      const params = new URLSearchParams({
        token: TINY_TOKEN,
        formato: 'json',
        pagina: pagina.toString(),
        limite: '100',
      });

      if (filtroNome) {
        params.append('nome', filtroNome);
      }
      if (filtroTipo) {
        params.append('tipo', filtroTipo);
      }

      const response = await axios.post(
        'https://api.tiny.com.br/api2/produtos.pesquisa.php',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const retorno = response.data.retorno;
      if (!retorno.produtos) break;

      produtosTotais = produtosTotais.concat(retorno.produtos);
      totalDePaginas = parseInt(retorno.totalDePaginas) || 1;
      pagina++;
    } while (pagina <= totalDePaginas);

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
