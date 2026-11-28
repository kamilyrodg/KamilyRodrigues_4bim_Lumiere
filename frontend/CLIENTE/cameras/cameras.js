const gradeCameras = document.getElementById('grade-cameras');
const quantidadeProdutos = document.getElementById('quantidade-produtos');
const pesquisaCamera = document.getElementById('pesquisa-camera');
pesquisaCamera.value = new URLSearchParams(window.location.search).get('busca') || '';

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

let cameras = [];
let favoritosIds = new Set();
let tipoSelecionado = 'todas';

function normalizarCaminhoImagem(caminho) {
    if (!caminho) return '';
    const imagem = String(caminho);
    return imagem.startsWith('./img/') ? `/${imagem.slice(2)}`
        : imagem.startsWith('img/') ? `/${imagem}`
            : imagem;
}

const formatarPreco = valor => {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

async function carregarCameras() {
    gradeCameras.innerHTML = `
        <p class="mensagem-carregamento">
            Preparando nossa coleção...
        </p>
    `;

    quantidadeProdutos.textContent = 'Carregando coleção...';

    mensagemVazia.hidden = true;
    mensagemErro.hidden = true;

    try {
        const resposta = await fetch(`${apiBase}/api/cameras`);

        if (!resposta.ok) {
            throw new Error('Não foi possível buscar as câmeras.');
        }

        cameras = await resposta.json();
        await carregarFavoritos();

        renderizarCameras();

    } catch (erro) {
        console.error('Erro ao carregar câmeras:', erro);

        gradeCameras.innerHTML = '';

        quantidadeProdutos.textContent = 'Coleção indisponível';

        mensagemErro.hidden = false;
    }
}

function obterCamerasFiltradas() {
    const normalizarTexto = texto => String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
    const pesquisa = normalizarTexto(pesquisaCamera.value.trim());

    return cameras.filter(camera => {
        const nome = normalizarTexto(camera.nome);

        const correspondePesquisa = nome.includes(pesquisa);

        const correspondeTipo =
            tipoSelecionado === 'todas' ||
            (
                tipoSelecionado === 'analogica' &&
                Number(camera.categoria_id) === 1
            ) ||
            (
                tipoSelecionado === 'digital' &&
                Number(camera.categoria_id) === 2
            );

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

async function alternarFavorito(camera, botao) {
    const favoritoAtual = favoritosIds.has(Number(camera.id));
    botao.disabled = true;

    try {
        const favorito = await window.LumiereFavoritos.alternar(
            camera.id,
            favoritoAtual
        );

        if (favorito === null) {
            return;
        }

        if (favorito) {
            favoritosIds.add(Number(camera.id));
        } else {
            favoritosIds.delete(Number(camera.id));
        }

        atualizarBotaoFavorito(botao, favorito);
    } catch (erro) {
        console.error('Erro ao atualizar favoritos:', erro);
        alert(erro.message || 'Não foi possível atualizar seus favoritos.');
    } finally {
        botao.disabled = false;
    }
}

function criarCartao(camera) {
    const analogica = Number(camera.categoria_id) === 1;

    const tipo = analogica ? 'Analógica' : 'Digital';
    const favorito = favoritosIds.has(Number(camera.id));

    const cartao = document.createElement('article');

    cartao.className = 'cartao-camera';

    const imagem = document.createElement('div');

    imagem.className = 'imagem-camera';

    const foto = document.createElement('img');

    foto.src = normalizarCaminhoImagem(camera.imagem);

    foto.alt = camera.nome;

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

    etiqueta.className = `etiqueta-tipo ${analogica ? 'analogica' : 'digital'}`;

    etiqueta.textContent = tipo;

    imagem.append(foto, etiqueta);

    const informacoes = document.createElement('div');

    informacoes.className = 'informacoes-camera';

    const categoria = document.createElement('span');

    categoria.className = 'categoria-pequena';

    categoria.textContent = analogica
        ? 'Fotografia em filme'
        : 'Fotografia digital';

    const nome = document.createElement('h3');

    nome.className = 'nome-camera';

    nome.textContent = camera.nome;

    const precoNormal = document.createElement('p');

    precoNormal.className = 'preco-normal';

    precoNormal.textContent = formatarPreco(camera.preco);

    const precoPix = document.createElement('p');

    precoPix.className = 'preco-pix';

    const rotuloPix = document.createElement('span');

    rotuloPix.textContent = 'NO PIX ';

    precoPix.append(
        rotuloPix,
        document.createTextNode(formatarPreco(camera.preco_pix))
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
        alternarFavorito(camera, botaoFavorito);
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
        adicionarAoCarrinho(camera);
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

function renderizarCameras() {
    const camerasFiltradas = obterCamerasFiltradas();

    gradeCameras.innerHTML = '';

    mensagemVazia.hidden = camerasFiltradas.length !== 0;

    quantidadeProdutos.textContent =
        `${camerasFiltradas.length} ${
            camerasFiltradas.length === 1
                ? 'câmera encontrada'
                : 'câmeras encontradas'
        }`;

    camerasFiltradas.forEach(camera => {
            gradeCameras.appendChild(criarCartao(camera));
    });
}

function adicionarAoCarrinho(camera) {
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
            return Number(item.id) === Number(camera.id);
        });

        if (existente) {
            existente.quantidade =
                (Number(existente.quantidade) || 1) + 1;
        } else {
            carrinho.push({
                id: camera.id,
                nome: camera.nome,
                preco: Number(camera.preco),
                preco_pix: Number(camera.preco_pix),
                imagem: camera.imagem,
                quantidade: 1
            });
        }

        localStorage.setItem(
            'carrinho',
            JSON.stringify(carrinho)
        );

        alert(`${camera.nome} foi adicionada à sacola!`);

    } catch (erro) {
        console.error('Erro ao adicionar ao carrinho:', erro);

        alert(
            'Não foi possível adicionar o produto à sacola.'
        );
    }
}

filtros.forEach(filtro => {
    filtro.addEventListener('click', () => {
        tipoSelecionado = filtro.dataset.tipo;

        filtros.forEach(outroFiltro => {
            const selecionado = outroFiltro === filtro;

            outroFiltro.classList.toggle('ativo', selecionado);

            outroFiltro.setAttribute(
                'aria-pressed',
                String(selecionado)
            );
        });

        renderizarCameras();
    });
});

pesquisaCamera.addEventListener('input', renderizarCameras);

tentarNovamente.addEventListener('click', carregarCameras);

carregarCameras();
