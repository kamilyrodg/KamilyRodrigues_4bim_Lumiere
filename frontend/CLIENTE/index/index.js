
const botaoPesquisa = document.getElementById("botao-pesquisa");
const pesquisaHeader = document.getElementById("pesquisa-header");
const formPesquisa = document.getElementById("form-pesquisa");
const campoPesquisa = document.getElementById("campo-pesquisa");
const linkConta = document.getElementById("link-conta");
const apiBase = (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
    window.location.port !== "3000"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "";
const parametrosNavegacao = new URLSearchParams(window.location.search);
const aposLogin = parametrosNavegacao.has("apos-login");
const voltandoDaConta = parametrosNavegacao.has("volta-conta");
const abrirFavoritosAposLogin = parametrosNavegacao.has("mostrarFavoritos");
const abrirCarrinhoAposNavegacao = parametrosNavegacao.has("mostrarCarrinho");

if (aposLogin || voltandoDaConta || abrirFavoritosAposLogin || abrirCarrinhoAposNavegacao) {
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
}

linkConta.href = "./frontend/CLIENTE/login/login.html";
linkConta.setAttribute("aria-label", "Entrar");
linkConta.title = "Entrar";

async function verificarSessao() {
    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/me`, {
            credentials: "include"
        });
        if (!resposta.ok) {
            if (resposta.status !== 401) {
                throw new Error("Não foi possível verificar a sessão da conta.");
            }
            return;
        }

        linkConta.href = "/frontend/CLIENTE/minha-conta/minha-conta.html";
        linkConta.setAttribute("aria-label", "Minha conta");
        linkConta.title = "Minha conta";
    } catch (erro) {
        if (erro.status !== 401) {
            console.error("Não foi possível verificar a sessão da conta.", erro);
        }
    }
}

verificarSessao();

botaoPesquisa.addEventListener("click", function (evento) {
    evento.preventDefault();

    pesquisaHeader.hidden = !pesquisaHeader.hidden;

    if (!pesquisaHeader.hidden) {
        campoPesquisa.focus();
    } else {
        campoPesquisa.value = "";
    }
});

formPesquisa.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const pesquisa = campoPesquisa.value.trim();

    if (pesquisa === "") {
        campoPesquisa.focus();
        return;
    }

    window.location.href = `./frontend/CLIENTE/busca/busca.html?busca=${encodeURIComponent(pesquisa)}`;
});

document.addEventListener("click", function (evento) {
    if (
        !pesquisaHeader.contains(evento.target) &&
        !botaoPesquisa.contains(evento.target) &&
        !pesquisaHeader.hidden
    ) {
        pesquisaHeader.hidden = true;
    }
});

document.addEventListener("click", function (evento) {
    if (
        !painelFavoritos.hidden &&
        !painelFavoritos.contains(evento.target) &&
        !botaoFavoritos.contains(evento.target)
    ) {
        painelFavoritos.hidden = true;
        botaoFavoritos.setAttribute("aria-expanded", "false");
    }
});

document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
        pesquisaHeader.hidden = true;
        painelFavoritos.hidden = true;
        botaoFavoritos.setAttribute("aria-expanded", "false");
    }
});

const botaoCarrinho = document.getElementById("botao-carrinho");
const painelCarrinho = document.getElementById("painel-carrinho");
const fecharCarrinho = document.getElementById("fechar-carrinho");
const itensCarrinho = document.getElementById("itens-carrinho");
const totalCarrinho = document.getElementById("total-carrinho");
const botaoFinalizar = document.getElementById("finalizar-compra");
const avisoCarrinho = document.getElementById("aviso-carrinho");
const botaoFavoritos = document.getElementById("botao-favoritos");
const painelFavoritos = document.getElementById("painel-favoritos");
const fecharFavoritos = document.getElementById("fechar-favoritos");
const itensFavoritos = document.getElementById("itens-favoritos");
const botaoAdicionarFavoritos = document.getElementById("adicionar-favoritos-sacola");
const avisoFavoritosSacola = document.getElementById("aviso-favoritos-sacola");
let favoritosExibidos = [];

function obterCarrinho() {
    try {
        const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
        return Array.isArray(carrinho) ? carrinho : [];
    } catch {
        return [];
    }
}

function obterPreco(item) {
    const valor = item.preco ?? item.valor ?? item.price ?? 0;

    if (typeof valor === "number") {
        return Number.isFinite(valor) && valor >= 0 ? valor : 0;
    }

    const texto = String(valor)
        .replace(/R\$\s?/g, "")
        .trim();
    const numero = Number(
        texto.includes(",")
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto
    );

    return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function renderizarCarrinho() {
    const carrinho = obterCarrinho();

    itensCarrinho.replaceChildren();

    let total = 0;
    let quantidadeTotal = 0;

    if (carrinho.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "carrinho-vazio";
        vazio.textContent = "Seu carrinho está vazio. Que tal encontrar algo especial?";
        itensCarrinho.appendChild(vazio);
    }

    carrinho.forEach(function (item) {
        const nome = item.nome || item.nome_produto || item.name || "Produto";
        const quantidade = Math.max(
            1,
            Number.parseInt(item.quantidade ?? item.qtd ?? item.quantity ?? 1, 10) || 1
        );
        const preco = obterPreco(item);
        const subtotal = preco * quantidade;

        total += subtotal;
        quantidadeTotal += quantidade;

        const linha = document.createElement("article");
        linha.className = "item-carrinho";

        const imagem = document.createElement("img");
        const caminhoImagem = item.imagem || item.foto || item.image || item.imagem_url;

        if (caminhoImagem) {
            imagem.src = caminhoImagem;
            imagem.alt = nome;
            imagem.addEventListener("error", function () {
                imagem.classList.add("sem-imagem");
            }, { once: true });
        } else {
            imagem.className = "sem-imagem";
            imagem.alt = "";
        }

        const informacoes = document.createElement("div");
        informacoes.className = "info-item-carrinho";

        const titulo = document.createElement("h3");
        titulo.textContent = nome;

        const detalhe = document.createElement("p");
        detalhe.textContent = "Quantidade: " + quantidade;

        const precoItem = document.createElement("p");
        precoItem.className = "preco-item";
        precoItem.textContent = formatarPreco(subtotal);

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "remover-favorito";
        remover.textContent = "Remover";
        remover.setAttribute("aria-label", "Remover " + nome + " da sacola");
        remover.addEventListener("click", function () {
            remover.disabled = true;

            try {
                const carrinhoAtualizado = obterCarrinhoAtualizavel();
                const id = Number(item.id ?? item.produto_id);
                const indice = carrinhoAtualizado.findIndex(function (produto) {
                    return Number(produto.id ?? produto.produto_id) === id;
                });

                if (indice !== -1) {
                    carrinhoAtualizado.splice(indice, 1);
                    localStorage.setItem(
                        "carrinho",
                        JSON.stringify(carrinhoAtualizado)
                    );
                }

                avisoCarrinho.textContent = "";
                renderizarCarrinho();
            } catch (erro) {
                console.error("Não foi possível remover o produto da sacola.", erro);
                avisoCarrinho.textContent =
                    erro.message || "Não foi possível remover o produto da sacola.";
            } finally {
                remover.disabled = false;
            }
        });

        informacoes.append(titulo, detalhe, precoItem, remover);
        linha.append(imagem, informacoes);
        itensCarrinho.appendChild(linha);
    });

    totalCarrinho.textContent = formatarPreco(total);
    botaoFinalizar.disabled = carrinho.length === 0;
    botaoCarrinho.setAttribute(
        "aria-label",
        "Abrir carrinho com " + quantidadeTotal + " produtos"
    );
}

function obterCarrinhoAtualizavel() {
    const carrinhoSalvo = localStorage.getItem("carrinho");
    const carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];

    if (!Array.isArray(carrinho)) {
        throw new Error("Formato do carrinho inválido.");
    }

    return carrinho;
}

function adicionarProdutoAoCarrinho(carrinho, item, incrementarExistente) {
    const id = Number(item.id);

    if (!Number.isSafeInteger(id) || id < 1) {
        throw new Error("Um produto favorito tem um ID inválido.");
    }

    const existente = carrinho.find(function (produto) {
        return Number(produto.id) === id;
    });

    if (existente) {
        if (incrementarExistente) {
            existente.quantidade =
                Math.max(1, Number.parseInt(existente.quantidade, 10) || 1) + 1;
        }
        return;
    }

    carrinho.push({
        id: id,
        nome: item.nome || item.nome_produto || item.name || "Produto",
        preco: obterPreco(item),
        preco_pix: item.preco_pix === undefined
            ? obterPreco(item)
            : obterPreco({ preco: item.preco_pix }),
        imagem: item.imagem || item.foto || item.image || item.imagem_url,
        quantidade: 1
    });
}

function renderizarFavoritos(favoritos) {
    if (!Array.isArray(favoritos)) {
        throw new Error("Formato de favoritos inválido.");
    }

    favoritosExibidos = favoritos;
    botaoAdicionarFavoritos.disabled = favoritos.length === 0;
    avisoFavoritosSacola.textContent = "";
    itensFavoritos.replaceChildren();

    if (favoritos.length === 0) {
        const aviso = document.createElement("p");
        aviso.className = "favoritos-vazio";
        aviso.textContent = "Você ainda não adicionou produtos aos favoritos.";
        itensFavoritos.appendChild(aviso);
        return;
    }

    favoritos.forEach(function (item) {
        const nome = item.nome || item.nome_produto || item.name || "Produto";
        const linha = document.createElement("article");
        linha.className = "item-favorito";

        const imagem = document.createElement("img");
        const caminhoImagem = item.imagem || item.foto || item.image || item.imagem_url;

        if (caminhoImagem) {
            imagem.src = caminhoImagem;
            imagem.alt = nome;
            imagem.addEventListener("error", function () {
                imagem.classList.add("sem-imagem-favorito");
            }, { once: true });
        } else {
            imagem.className = "sem-imagem-favorito";
            imagem.alt = "";
        }

        const informacoes = document.createElement("div");
        informacoes.className = "info-item-favorito";

        const titulo = document.createElement("h3");
        titulo.textContent = nome;

        const preco = document.createElement("p");
        preco.textContent = formatarPreco(obterPreco(item));

        const adicionar = document.createElement("button");
        adicionar.type = "button";
        adicionar.className = "adicionar-favorito-sacola";
        adicionar.textContent = "ADICIONAR À SACOLA";
        adicionar.addEventListener("click", function () {
            adicionar.disabled = true;
            avisoFavoritosSacola.textContent = "";

            try {
                const carrinho = obterCarrinhoAtualizavel();
                adicionarProdutoAoCarrinho(carrinho, item, true);
                localStorage.setItem("carrinho", JSON.stringify(carrinho));
                renderizarCarrinho();
                avisoFavoritosSacola.textContent = nome + " foi adicionado à sacola.";
            } catch (erro) {
                console.error("Não foi possível adicionar o produto à sacola.", erro);
                avisoFavoritosSacola.textContent =
                    erro.message || "Não foi possível adicionar o produto à sacola.";
            } finally {
                adicionar.disabled = false;
            }
        });

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "remover-favorito";
        remover.textContent = "Remover";
        remover.setAttribute("aria-label", "Remover " + nome + " dos favoritos");
        remover.addEventListener("click", async function () {
            remover.disabled = true;

            try {
                const resposta = await fetch(
                    `${apiBase}/api/favoritos/${encodeURIComponent(item.id)}`,
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );

                if (resposta.status === 401) {
                    window.location.href = "./frontend/CLIENTE/login/login.html?retorno=favoritos";
                    return;
                }

                if (!resposta.ok) {
                    throw new Error("Não foi possível remover o produto dos favoritos.");
                }

                await abrirPainelFavoritos();
            } catch (erro) {
                console.error("Não foi possível atualizar seus favoritos.", erro);
                mostrarMensagemFavoritos(
                    erro.message || "Não foi possível atualizar seus favoritos. Tente novamente."
                );
            } finally {
                remover.disabled = false;
            }
        });

        informacoes.append(titulo, preco, adicionar, remover);
        linha.append(imagem, informacoes);
        itensFavoritos.appendChild(linha);
    });
}

function mostrarMensagemFavoritos(mensagem) {
    botaoAdicionarFavoritos.disabled = true;
    itensFavoritos.replaceChildren();
    const aviso = document.createElement("p");
    aviso.className = "favoritos-vazio";
    aviso.textContent = mensagem;
    itensFavoritos.appendChild(aviso);
}

async function abrirPainelFavoritos() {
    painelCarrinho.hidden = true;
    painelFavoritos.hidden = false;
    botaoFavoritos.setAttribute("aria-expanded", "true");
    mostrarMensagemFavoritos("Carregando seus favoritos...");

    try {
        const resposta = await fetch(`${apiBase}/api/favoritos`, {
            credentials: "include"
        });

        if (resposta.status === 401) {
            window.location.href = "./frontend/CLIENTE/login/login.html?retorno=favoritos";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar seus favoritos.");
        }

        const favoritos = await resposta.json();
        renderizarFavoritos(favoritos);
    } catch (erro) {
        console.error("Não foi possível carregar seus favoritos.", erro);
        mostrarMensagemFavoritos(
            erro.message || "Não foi possível carregar seus favoritos. Tente novamente."
        );
    }
}

botaoCarrinho.addEventListener("click", function (evento) {
    evento.preventDefault();

    renderizarCarrinho();
    painelFavoritos.hidden = true;
    botaoFavoritos.setAttribute("aria-expanded", "false");
    painelCarrinho.hidden = !painelCarrinho.hidden;
});

fecharCarrinho.addEventListener("click", function () {
    painelCarrinho.hidden = true;
});

botaoFavoritos.addEventListener("click", function (evento) {
    evento.preventDefault();

    if (painelFavoritos.hidden) {
        abrirPainelFavoritos();
    } else {
        painelFavoritos.hidden = true;
        botaoFavoritos.setAttribute("aria-expanded", "false");
    }
});

fecharFavoritos.addEventListener("click", function () {
    painelFavoritos.hidden = true;
    botaoFavoritos.setAttribute("aria-expanded", "false");
});

botaoAdicionarFavoritos.addEventListener("click", function () {
    botaoAdicionarFavoritos.disabled = true;
    avisoFavoritosSacola.textContent = "";

    try {
        const carrinho = obterCarrinhoAtualizavel();
        favoritosExibidos.forEach(function (item) {
            adicionarProdutoAoCarrinho(carrinho, item, false);
        });

        localStorage.setItem("carrinho", JSON.stringify(carrinho));
        renderizarCarrinho();
        painelFavoritos.hidden = true;
        botaoFavoritos.setAttribute("aria-expanded", "false");
        painelCarrinho.hidden = false;
    } catch (erro) {
        console.error("Não foi possível adicionar os favoritos à sacola.", erro);
        avisoFavoritosSacola.textContent =
            erro.message || "Não foi possível adicionar os favoritos à sacola.";
        botaoAdicionarFavoritos.disabled = favoritosExibidos.length === 0;
    }
});

document.addEventListener("click", function (evento) {
    if (
        !painelCarrinho.hidden &&
        !painelCarrinho.contains(evento.target) &&
        !botaoCarrinho.contains(evento.target)
    ) {
        painelCarrinho.hidden = true;
    }
});

botaoFinalizar.addEventListener("click", async function () {
    const carrinho = obterCarrinho();

    if (carrinho.length === 0) {
        avisoCarrinho.textContent = "Adicione pelo menos um produto antes de continuar.";
        return;
    }

    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/me`, {
            credentials: "include"
        });
        if (!resposta.ok) {
            if (resposta.status === 401) {
                window.location.href = "./frontend/CLIENTE/login/login.html?retorno=checkout";
                return;
            }
            throw new Error("Não foi possível verificar sua conta.");
        }

        window.location.href = "/frontend/CLIENTE/finalizar-compra/finalizar-compra.html";
    } catch (erro) {
        console.error("Não foi possível validar a sessão para finalizar a compra.", erro);
        avisoCarrinho.textContent = erro.message || "Não foi possível verificar sua conta. Tente novamente.";
    }
});

window.addEventListener("storage", function (evento) {
    if (evento.key === "carrinho") {
        renderizarCarrinho();
    }
});

renderizarCarrinho();

if (abrirCarrinhoAposNavegacao) {
    painelCarrinho.hidden = false;
}

if (abrirFavoritosAposLogin) {
    abrirPainelFavoritos();
}
