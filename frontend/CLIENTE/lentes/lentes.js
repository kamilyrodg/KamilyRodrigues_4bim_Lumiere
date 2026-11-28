
const gradeLentes = document.getElementById('grade-lentes');
const quantidadeProdutos = document.getElementById('quantidade-produtos');
const pesquisaLente = document.getElementById('pesquisa-lente');
pesquisaLente.value = new URLSearchParams(window.location.search).get('busca') || '';
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

let lentes = [];
let favoritosIds = new Set();
let caracteristicaAtual = 'todas';

function normalizarCaminhoImagem(caminho) {
    if (!caminho) return '';
    const imagem = String(caminho);
    return imagem.startsWith('./img/') ? `/${imagem.slice(2)}`
        : imagem.startsWith('img/') ? `/${imagem}`
            : imagem;
}

async function carregarLentes() {

    gradeLentes.innerHTML = `
        <p class="mensagem-carregamento">
            Preparando nossa coleção...
        </p>
    `;

    mensagemVazia.hidden = true;
    mensagemErro.hidden = true;

    try {

        const resposta = await fetch(`${apiBase}/api/lentes`);

        if (!resposta.ok) {
            throw new Error('Erro ao buscar lentes.');
        }

        lentes = await resposta.json();
        await carregarFavoritos();

        exibirLentes();

    } catch (erro) {

        console.error('Erro ao carregar lentes:', erro);

        gradeLentes.innerHTML = '';

        quantidadeProdutos.textContent = 'Coleção indisponível';

        mensagemErro.hidden = false;

    }

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

async function alternarFavorito(lente, botao) {
    const favoritoAtual = favoritosIds.has(Number(lente.id));
    botao.disabled = true;

    try {
        const favorito = await window.LumiereFavoritos.alternar(
            lente.id,
            favoritoAtual
        );

        if (favorito === null) {
            return;
        }

        if (favorito) {
            favoritosIds.add(Number(lente.id));
        } else {
            favoritosIds.delete(Number(lente.id));
        }

        atualizarBotaoFavorito(botao, favorito);
    } catch (erro) {
        console.error('Erro ao atualizar favoritos:', erro);
        alert(erro.message || 'Não foi possível atualizar seus favoritos.');
    } finally {
        botao.disabled = false;
    }
}

function exibirLentes() {

    const normalizarTexto = texto => String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
    const pesquisa = normalizarTexto(pesquisaLente.value.trim());

    const lentesFiltradas = lentes.filter(lente => {

        const nome = normalizarTexto(lente.nome);

        const caracteristicas = lente.caracteristicas || [];

        const correspondePesquisa =
            nome.includes(pesquisa) ||
            caracteristicas.some(caracteristica =>
                normalizarTexto(caracteristica).includes(pesquisa)
            );

        const correspondeCaracteristica =
            caracteristicaAtual === 'todas' ||
            caracteristicas.some(caracteristica =>
                caracteristica.toLowerCase() === caracteristicaAtual.toLowerCase()
            );

        return correspondePesquisa && correspondeCaracteristica;

    });

    gradeLentes.innerHTML = '';

    quantidadeProdutos.textContent =
        `${lentesFiltradas.length} ${lentesFiltradas.length === 1 ? 'lente encontrada' : 'lentes encontradas'}`;

    if (lentesFiltradas.length === 0) {

        mensagemVazia.hidden = false;

        return;

    }

    mensagemVazia.hidden = true;

    lentesFiltradas.forEach(lente => {

        const card = document.createElement('article');

        card.classList.add('card-produto');

        const caracteristicas = lente.caracteristicas || [];

        const imagem = document.createElement('img');

        imagem.src = normalizarCaminhoImagem(lente.imagem);
        imagem.alt = lente.nome;

        imagem.onerror = function () {
            this.onerror = null;
            this.src = '/img/CLIENTE/index/lentes.jpg';
        };

        const imagemContainer = document.createElement('div');
        imagemContainer.classList.add('imagem-produto');
        imagemContainer.appendChild(imagem);

        const informacoes = document.createElement('div');
        informacoes.classList.add('informacoes-produto');

        const categoria = document.createElement('span');
        categoria.classList.add('categoria-produto');
        categoria.textContent = caracteristicas.join(' · ');

        const nome = document.createElement('h3');
        nome.textContent = lente.nome;

        const preco = document.createElement('p');
        preco.classList.add('preco-produto');
        preco.textContent = `R$ ${Number(lente.preco).toLocaleString('pt-BR', {
            minimumFractionDigits: 2
        })}`;

        const precoPix = document.createElement('p');
        precoPix.classList.add('preco-pix');
        precoPix.textContent = `R$ ${Number(lente.preco_pix).toLocaleString('pt-BR', {
            minimumFractionDigits: 2
        })} no Pix`;

        const botaoFavorito = document.createElement('button');
        botaoFavorito.type = 'button';
        botaoFavorito.className = 'botao-favorito';
        botaoFavorito.innerHTML = `
            <span class="texto-favorito"></span>
            <span aria-hidden="true"></span>
        `;
        atualizarBotaoFavorito(
            botaoFavorito,
            favoritosIds.has(Number(lente.id))
        );
        botaoFavorito.addEventListener('click', () => {
            alternarFavorito(lente, botaoFavorito);
        });

        const botaoComprar = document.createElement('button');
        botaoComprar.type = 'button';
        botaoComprar.className = 'botao-comprar';
        botaoComprar.innerHTML = '<span>ADICIONAR À SACOLA</span><span>↗</span>';
        botaoComprar.addEventListener('click', () => {
            adicionarAoCarrinho(lente);
        });

        informacoes.append(
            categoria,
            nome,
            preco,
            precoPix,
            botaoFavorito,
            botaoComprar
        );

        card.append(
            imagemContainer,
            informacoes
        );

        gradeLentes.appendChild(card);

    });

}

function adicionarAoCarrinho(lente) {
    try {
        const carrinhoSalvo = localStorage.getItem('carrinho');
        const carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];

        if (!Array.isArray(carrinho)) {
            throw new Error('Formato de carrinho inválido.');
        }

        const existente = carrinho.find(item => Number(item.id) === Number(lente.id));

        if (existente) {
            existente.quantidade = (Number(existente.quantidade) || 1) + 1;
        } else {
            carrinho.push({
                id: lente.id,
                nome: lente.nome,
                preco: Number(lente.preco),
                preco_pix: Number(lente.preco_pix),
                imagem: lente.imagem,
                quantidade: 1
            });
        }

        localStorage.setItem('carrinho', JSON.stringify(carrinho));
        alert(`${lente.nome} foi adicionada à sacola!`);
    } catch (erro) {
        console.error('Erro ao adicionar lente à sacola:', erro);
        alert(erro.message || 'Não foi possível adicionar a lente à sacola.');
    }
}

filtros.forEach(filtro => {

    filtro.addEventListener('click', () => {

        filtros.forEach(botao => {

            botao.classList.remove('ativo');
            botao.setAttribute('aria-pressed', 'false');

        });

        filtro.classList.add('ativo');
        filtro.setAttribute('aria-pressed', 'true');

        caracteristicaAtual = filtro.dataset.caracteristica;

        exibirLentes();

    });

});

pesquisaLente.addEventListener('input', exibirLentes);

tentarNovamente.addEventListener('click', carregarLentes);

carregarLentes();
