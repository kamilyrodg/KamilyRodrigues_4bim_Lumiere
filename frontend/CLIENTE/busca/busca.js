const apiBase = (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';

const formResultados = document.getElementById('form-resultados');
const termoResultados = document.getElementById('termo-resultados');
const resumoResultados = document.getElementById('resumo-resultados');
const gradeResultados = document.getElementById('grade-resultados');
const estadoVazio = document.getElementById('estado-vazio');
const erroResultados = document.getElementById('erro-resultados');

const termoInicial = new URLSearchParams(window.location.search).get('busca') || '';
termoResultados.value = termoInicial;

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

function normalizarImagem(caminho) {
    if (!caminho) return '';
    const imagem = String(caminho);
    if (imagem.startsWith('./img/')) return `/${imagem.slice(2)}`;
    if (imagem.startsWith('img/')) return `/${imagem}`;
    return imagem;
}

function formatarPreco(valor) {
    const preco = Number(valor);
    return Number.isFinite(preco)
        ? preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : 'Consulte o preço';
}

async function buscarCategoria(categoria) {
    const resposta = await fetch(`${apiBase}${categoria.endpoint}`);
    if (!resposta.ok) throw new Error(`Falha ao buscar ${categoria.nome.toLowerCase()}.`);
    const produtos = await resposta.json();
    return produtos.map(produto => ({
        id: produto.id,
        nome: produto.nome,
        imagem: produto.imagem,
        preco: produto.preco,
        categoria: categoria.nome,
        destino: categoria.destino,
        textoBusca: [
            produto.nome,
            ...(Array.isArray(produto.caracteristicas) ? produto.caracteristicas : []),
            ...(Array.isArray(produto.produtos) ? produto.produtos.map(item => item.nome) : [])
        ].join(' ')
    }));
}

function desenharResultados(produtos, termo) {
    const busca = normalizarTexto(termo);
    const resultados = produtos.filter(produto =>
        normalizarTexto(produto.textoBusca).includes(busca)
    );

    gradeResultados.replaceChildren();
    erroResultados.hidden = true;
    estadoVazio.hidden = resultados.length > 0;
    resumoResultados.textContent = `${resultados.length} ${resultados.length === 1 ? 'produto encontrado' : 'produtos encontrados'} para “${termo}”.`;

    resultados.forEach(produto => {
        const card = document.createElement('article');
        card.className = 'resultado-card';

        const areaImagem = document.createElement('div');
        areaImagem.className = 'resultado-imagem';

        if (produto.imagem) {
            const imagem = document.createElement('img');
            imagem.src = normalizarImagem(produto.imagem);
            imagem.alt = produto.nome;
            imagem.loading = 'lazy';
            imagem.addEventListener('error', () => {
                imagem.remove();
                areaImagem.classList.add('sem-imagem');
            }, { once: true });
            areaImagem.append(imagem);
        } else {
            areaImagem.classList.add('sem-imagem');
        }

        const informacoes = document.createElement('div');
        informacoes.className = 'resultado-info';

        const categoria = document.createElement('span');
        categoria.className = 'resultado-categoria';
        categoria.textContent = produto.categoria;

        const nome = document.createElement('h2');
        nome.textContent = produto.nome;

        const preco = document.createElement('p');
        preco.className = 'resultado-preco';
        preco.textContent = formatarPreco(produto.preco);

        const verProduto = document.createElement('a');
        verProduto.className = 'resultado-link';
        verProduto.textContent = 'VER NA CATEGORIA';
        verProduto.href = `${produto.destino}?busca=${encodeURIComponent(termo)}`;

        informacoes.append(categoria, nome, preco, verProduto);
        card.append(areaImagem, informacoes);
        gradeResultados.append(card);
    });
}

async function pesquisar(termo) {
    const valor = termo.trim();
    if (!valor) {
        resumoResultados.textContent = 'Digite o nome de um produto para pesquisar.';
        gradeResultados.replaceChildren();
        estadoVazio.hidden = true;
        return;
    }

    resumoResultados.textContent = 'Buscando produtos…';
    estadoVazio.hidden = true;
    erroResultados.hidden = true;

    const categorias = [
        { endpoint: '/api/cameras', nome: 'Câmeras', destino: '../cameras/cameras.html' },
        { endpoint: '/api/filmes', nome: 'Filmes', destino: '../filmes/filmes.html' },
        { endpoint: '/api/lentes', nome: 'Lentes', destino: '../lentes/lentes.html' },
        { endpoint: '/api/kits', nome: 'Kits', destino: '../kits/kits.html' }
    ];

    try {
        const respostas = await Promise.all(categorias.map(buscarCategoria));
        desenharResultados(respostas.flat(), valor);
    } catch (erro) {
        console.error('Não foi possível pesquisar os produtos:', erro);
        resumoResultados.textContent = '';
        gradeResultados.replaceChildren();
        estadoVazio.hidden = true;
        erroResultados.hidden = false;
    }
}

formResultados.addEventListener('submit', evento => {
    evento.preventDefault();
    const valor = termoResultados.value.trim();
    if (!valor) {
        termoResultados.focus();
        return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('busca', valor);
    window.history.replaceState(null, '', url);
    pesquisar(valor);
});

pesquisar(termoInicial);
