const gradeFilmes = document.getElementById('grade-filmes');
const quantidadeProdutos = document.getElementById('quantidade-produtos');
const pesquisaFilme = document.getElementById('pesquisa-filme');
pesquisaFilme.value = new URLSearchParams(window.location.search).get('busca') || '';

const mensagemVazia = document.getElementById('mensagem-vazia');
const mensagemErro = document.getElementById('mensagem-erro');
const tentarNovamente = document.getElementById('tentar-novamente');

const filtros = document.querySelectorAll('.filtro');

const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? 'http://localhost:3000'
    : '';

let filmes = [];
let favoritosIds = new Set();
let tipoSelecionado = 'todos';

const formatarPreco = valor => {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

const normalizarTexto = texto => {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
};

function obterCaracteristicas(filme) {
    if (Array.isArray(filme.caracteristicas)) {
        return filme.caracteristicas.map(item => {
            return normalizarTexto(
                typeof item === 'string' ? item : item.nome
            );
        });
    }

    if (filme.caracteristica) {
        return [normalizarTexto(filme.caracteristica)];
    }

    return [];
}

async function carregarFilmes() {
    gradeFilmes.innerHTML = `
        <p class="mensagem-carregamento">
            Preparando nossa coleção...
        </p>
    `;

    quantidadeProdutos.textContent = 'Carregando coleção...';

    mensagemVazia.hidden = true;
    mensagemErro.hidden = true;

    try {
        const resposta = await fetch(`${apiBase}/api/filmes`);

        if (!resposta.ok) {
            throw new Error('Não foi possível buscar os filmes.');
        }

        filmes = await resposta.json();
        await carregarFavoritos();

        renderizarFilmes();

    } catch (erro) {
        console.error('Erro ao carregar filmes:', erro);

        gradeFilmes.innerHTML = '';

        quantidadeProdutos.textContent = 'Coleção indisponível';

        mensagemErro.hidden = false;
    }
}

function obterFilmesFiltrados() {
    const pesquisa = normalizarTexto(pesquisaFilme.value.trim());

    return filmes.filter(filme => {
        const nome = normalizarTexto(filme.nome);

        const caracteristicas = obterCaracteristicas(filme);

        const correspondePesquisa = nome.includes(pesquisa) ||
            caracteristicas.some(caracteristica =>
                normalizarTexto(caracteristica).includes(pesquisa)
            );

        const correspondeTipo =
            tipoSelecionado === 'todos' ||
            caracteristicas.includes(tipoSelecionado);

        return correspondePesquisa && correspondeTipo;
    });
}

async function carregarFavoritos() {
    try {
        const favoritos = await window.LumiereFavoritos.listar();
        favoritosIds = new Set(favoritos.map(item => Number(item.id)));
    } catch (erro) {
        console.error('Erro ao carregar favoritos:', erro);
        alert('Não foi possível carregar seus favoritos.');
    }
}

function atualizarBotaoFavorito(botao, favorito) {
    botao.classList.toggle('ativo', favorito);

    botao.setAttribute('aria-pressed', String(favorito));

    botao.querySelector('.texto-favorito').textContent = favorito
        ? 'REMOVER DOS FAVORITOS'
        : 'ADICIONAR AOS FAVORITOS';

    botao.querySelector('[aria-hidden="true"]').textContent =
        favorito ? '♥' : '♡';

    botao.setAttribute(
        'aria-label',
        favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
    );
}

async function alternarFavorito(filme, botao) {
    const favoritoAtual = favoritosIds.has(Number(filme.id));
    botao.disabled = true;

    try {
        const favorito = await window.LumiereFavoritos.alternar(
            filme.id,
            favoritoAtual
        );

        if (favorito === null) {
            return;
        }

        if (favorito) {
            favoritosIds.add(Number(filme.id));
        } else {
            favoritosIds.delete(Number(filme.id));
        }

        atualizarBotaoFavorito(botao, favorito);
    } catch (erro) {
        console.error('Erro ao atualizar favoritos:', erro);
        alert(erro.message || 'Não foi possível atualizar seus favoritos.');
    } finally {
        botao.disabled = false;
    }
}

function criarCartao(filme) {
    const caracteristicas = obterCaracteristicas(filme);

    const caracteristica = caracteristicas[0] || 'Filme fotográfico';

    const favorito = favoritosIds.has(Number(filme.id));

    const cartao = document.createElement('article');

    cartao.className = 'cartao-camera';

    const imagem = document.createElement('div');

    imagem.className = 'imagem-camera';

    const foto = document.createElement('img');

    foto.src = filme.imagem || '';

    foto.alt = filme.nome;

    foto.loading = 'lazy';

    foto.onerror = function () {
        this.onerror = null;

        this.style.visibility = 'hidden';

        const aviso = document.createElement('span');

        aviso.className = 'aviso-imagem';

        aviso.textContent = 'Imagem indisponível';

        aviso.style.cssText = `
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 15px;
            color: #0C2745;
            font-size: 11px;
            text-align: center;
        `;

        imagem.appendChild(aviso);
    };

    const etiqueta = document.createElement('span');

    etiqueta.className = 'etiqueta-tipo';

    etiqueta.textContent = caracteristica;

    imagem.append(foto, etiqueta);

    const informacoes = document.createElement('div');

    informacoes.className = 'informacoes-camera';

    const categoria = document.createElement('span');

    categoria.className = 'categoria-pequena';

    categoria.textContent = filme.iso !== null && filme.iso !== undefined
        ? `ISO ${filme.iso} · ${filme.quantidade_poses} poses`
        : `${filme.quantidade_poses} poses · Instantâneo`;

    const nome = document.createElement('h3');

    nome.className = 'nome-camera';

    nome.textContent = filme.nome;

    const precoNormal = document.createElement('p');

    precoNormal.className = 'preco-normal';

    precoNormal.textContent = formatarPreco(filme.preco);

    const precoPix = document.createElement('p');

    precoPix.className = 'preco-pix';

    const rotuloPix = document.createElement('span');

    rotuloPix.textContent = 'NO PIX ';

    precoPix.append(
        rotuloPix,
        document.createTextNode(formatarPreco(filme.preco_pix))
    );

    const botaoFavorito = document.createElement('button');

    botaoFavorito.type = 'button';

    botaoFavorito.className = 'botao-favorito';

    const textoFavorito = document.createElement('span');

    textoFavorito.className = 'texto-favorito';

    const iconeFavorito = document.createElement('span');

    iconeFavorito.setAttribute('aria-hidden', 'true');

    iconeFavorito.textContent = favorito ? '♥' : '♡';

    botaoFavorito.replaceChildren(textoFavorito, iconeFavorito);

    atualizarBotaoFavorito(botaoFavorito, favorito);

    botaoFavorito.addEventListener('click', () => {
        alternarFavorito(filme, botaoFavorito);
    });

    const botaoComprar = document.createElement('button');

    botaoComprar.type = 'button';

    botaoComprar.className = 'botao-comprar';

    const textoBotao = document.createElement('span');

    textoBotao.textContent = 'ADICIONAR À SACOLA';

    const seta = document.createElement('span');

    seta.textContent = '↗';

    botaoComprar.append(textoBotao, seta);

    botaoComprar.addEventListener('click', () => {
        adicionarAoCarrinho(filme);
    });

    informacoes.append(
        categoria,
        nome,
        precoNormal,
        precoPix,
        botaoFavorito,
        botaoComprar
    );

    cartao.append(imagem, informacoes);

    return cartao;
}

function renderizarFilmes() {
    const filmesFiltrados = obterFilmesFiltrados();

    gradeFilmes.innerHTML = '';

    mensagemVazia.hidden = filmesFiltrados.length !== 0;

    quantidadeProdutos.textContent =
        `${filmesFiltrados.length} ${
            filmesFiltrados.length === 1
                ? 'filme encontrado'
                : 'filmes encontrados'
        }`;

    filmesFiltrados.forEach(filme => {
            gradeFilmes.appendChild(criarCartao(filme));
    });
}

function adicionarAoCarrinho(filme) {
    try {
        const carrinhoSalvo = localStorage.getItem('carrinho');

        let carrinho = [];

        if (carrinhoSalvo) {
            carrinho = JSON.parse(carrinhoSalvo);
        }

        if (!Array.isArray(carrinho)) {
            throw new Error('Formato de carrinho inválido.');
        }

        const existente = carrinho.find(item => {
            return Number(item.id) === Number(filme.id);
        });

        if (existente) {
            existente.quantidade =
                (Number(existente.quantidade) || 1) + 1;

        } else {
            carrinho.push({
                id: filme.id,
                nome: filme.nome,
                preco: Number(filme.preco),
                preco_pix: Number(filme.preco_pix),
                imagem: filme.imagem,
                quantidade: 1
            });
        }

        localStorage.setItem(
            'carrinho',
            JSON.stringify(carrinho)
        );

        alert(`${filme.nome} foi adicionado à sacola!`);

    } catch (erro) {
        console.error('Erro ao adicionar ao carrinho:', erro);

        alert(
            'Não foi possível adicionar o produto à sacola.'
        );
    }
}

filtros.forEach(filtro => {
    filtro.addEventListener('click', () => {
        tipoSelecionado = normalizarTexto(filtro.dataset.tipo);

        filtros.forEach(outroFiltro => {
            const selecionado = outroFiltro === filtro;

            outroFiltro.classList.toggle('ativo', selecionado);

            outroFiltro.setAttribute(
                'aria-pressed',
                String(selecionado)
            );
        });

        renderizarFilmes();
    });
});

pesquisaFilme.addEventListener('input', renderizarFilmes);

tentarNovamente.addEventListener('click', carregarFilmes);

carregarFilmes();
