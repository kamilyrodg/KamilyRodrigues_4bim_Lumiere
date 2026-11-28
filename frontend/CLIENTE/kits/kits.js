
const apiBase = (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/kits`;
let favoritosIds = new Set();

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

function normalizarCaminhoImagem(caminho) {
    if (!caminho) return '';
    const imagem = String(caminho);
    return imagem.startsWith('./img/') ? `/${imagem.slice(2)}`
        : imagem.startsWith('img/') ? `/${imagem}`
            : imagem;
}

async function alternarFavorito(kit, botao) {
    const favoritoAtual = favoritosIds.has(Number(kit.id));
    botao.disabled = true;

    try {
        const favorito = await window.LumiereFavoritos.alternar(
            kit.id,
            favoritoAtual
        );

        if (favorito === null) {
            return;
        }

        if (favorito) {
            favoritosIds.add(Number(kit.id));
        } else {
            favoritosIds.delete(Number(kit.id));
        }

        atualizarBotaoFavorito(botao, favorito);
    } catch (erro) {
        console.error('Erro ao atualizar favoritos:', erro);
        alert(erro.message || 'Não foi possível atualizar seus favoritos.');
    } finally {
        botao.disabled = false;
    }
}

function adicionarAoCarrinho(kit, imagem) {
    try {
        const carrinhoSalvo = localStorage.getItem('carrinho');
        const carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];

        if (!Array.isArray(carrinho)) {
            throw new Error('Formato de carrinho inválido.');
        }

        const existente = carrinho.find(item => Number(item.id) === Number(kit.id));

        if (existente) {
            existente.quantidade = (Number(existente.quantidade) || 1) + 1;
        } else {
            carrinho.push({
                id: kit.id,
                nome: kit.nome,
                preco: Number(kit.preco),
                preco_pix: Number(kit.preco_pix),
                imagem: imagem,
                quantidade: 1
            });
        }

        localStorage.setItem('carrinho', JSON.stringify(carrinho));
        alert(`${kit.nome} foi adicionado à sacola!`);
    } catch (erro) {
        console.error('Erro ao adicionar kit à sacola:', erro);
        alert(erro.message || 'Não foi possível adicionar o kit à sacola.');
    }
}

async function listarKits() {
    const grade = document.querySelector('.grade-kits');

    try {
        const resposta = await fetch(API);

        if (!resposta.ok) {
            throw new Error('Erro ao buscar os kits.');
        }

        const kitsDisponiveis = await resposta.json();
        const termoBusca = new URLSearchParams(window.location.search).get('busca') || '';
        const buscaNormalizada = termoBusca
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('pt-BR')
            .trim();
        const kits = kitsDisponiveis.filter(kit => {
            const textoKit = [kit.nome, ...(kit.produtos || []).map(produto => produto.nome)]
                .filter(Boolean)
                .join(' ')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase('pt-BR');
            return textoKit.includes(buscaNormalizada);
        });
        await carregarFavoritos();

        grade.innerHTML = '';

        if (kits.length === 0) {
            grade.innerHTML = buscaNormalizada
                ? '<p>Nenhum kit corresponde à pesquisa.</p>'
                : '<p>Nenhum kit disponível no momento.</p>';
            return;
        }

        kits.forEach(kit => {

            const imagemProduto = kit.produtos.find(produto => produto.imagem);
            const imagemComponente = normalizarCaminhoImagem(imagemProduto?.imagem);
            let imagem = normalizarCaminhoImagem(kit.imagem) || imagemComponente;

            const preco = Number(kit.preco).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            const precoPix = Number(kit.preco_pix).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            let categoria = 'ANALÓGICO';
            let classe = 'analogico';

            if (kit.nome.toLowerCase().includes('digital')) {
                categoria = 'DIGITAL';
                classe = 'digital';
            } else if (kit.nome.toLowerCase().includes('filmes')) {
                categoria = 'FILMES';
                classe = 'filmes';
            }

            const card = document.createElement('article');
            card.classList.add('card-kit');
            card.dataset.produtoId = String(kit.id);

            card.innerHTML = `
                <div class="imagem-kit">

                    <span class="categoria-kit ${classe}">
                        ${categoria}
                    </span>

                    <img src="${imagem}" alt="${kit.nome}">

                </div>

                <div class="informacoes-kit">

                    <span class="numero-kit">KIT ${String(kit.id).padStart(2, '0')}</span>

                    <h3>${kit.nome}</h3>

                    <p class="descricao-kit">
                        ${kit.produtos.map(produto =>
                            produto.nome
                        ).join(' + ')}
                    </p>

                    <div class="precos-kit">

                        <span class="preco-original">${preco}</span>

                        <strong>${precoPix}</strong>

                        <span class="preco-pix">no Pix</span>

                    </div>

                </div>
            `;

            card.querySelector('.imagem-kit img').onerror = function () {
                if (imagemComponente && imagem !== imagemComponente) {
                    imagem = imagemComponente;
                    this.src = imagemComponente;
                    return;
                }
                this.onerror = null;
                this.style.visibility = 'hidden';
            };

            const botaoFavorito = document.createElement('button');
            botaoFavorito.type = 'button';
            botaoFavorito.className = 'botao-favorito';
            botaoFavorito.innerHTML = `
                <span class="texto-favorito"></span>
                <span aria-hidden="true"></span>
            `;
            atualizarBotaoFavorito(
                botaoFavorito,
                favoritosIds.has(Number(kit.id))
            );
            botaoFavorito.addEventListener('click', () => {
                alternarFavorito(kit, botaoFavorito);
            });

            const botaoComprar = document.createElement('button');
            botaoComprar.type = 'button';
            botaoComprar.className = 'botao-comprar-kit';
            botaoComprar.textContent = 'ADICIONAR À SACOLA';
            botaoComprar.addEventListener('click', () => {
                adicionarAoCarrinho(kit, imagem);
            });

            card.querySelector('.informacoes-kit').append(
                botaoFavorito,
                botaoComprar
            );

            grade.appendChild(card);

        });

    } catch (erro) {
        console.error('Erro:', erro);

        grade.innerHTML = `
            <p>Não foi possível carregar os kits. Tente novamente.</p>
        `;
    }
}

listarKits();
