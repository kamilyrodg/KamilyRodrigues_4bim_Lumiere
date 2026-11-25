
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

if (aposLogin || voltandoDaConta) {
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
}

linkConta.href = "/frontend/CLIENTE/login/login.html";
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

        if (!aposLogin && !voltandoDaConta) {
            window.location.replace("/frontend/CLIENTE/minha-conta/minha-conta.html");
        }
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

    window.location.href = `./frontend/produtos.html?busca=${encodeURIComponent(pesquisa)}`;
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

document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
        pesquisaHeader.hidden = true;
    }
});

const botaoCarrinho = document.getElementById("botao-carrinho");
const painelCarrinho = document.getElementById("painel-carrinho");
const fecharCarrinho = document.getElementById("fechar-carrinho");
const itensCarrinho = document.getElementById("itens-carrinho");
const totalCarrinho = document.getElementById("total-carrinho");
const botaoFinalizar = document.getElementById("finalizar-compra");
const avisoCarrinho = document.getElementById("aviso-carrinho");

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

    const numero = Number(
        String(valor)
            .replace(/R\$\s?/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
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

        informacoes.append(titulo, detalhe, precoItem);
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

botaoCarrinho.addEventListener("click", function (evento) {
    evento.preventDefault();

    renderizarCarrinho();
    painelCarrinho.hidden = !painelCarrinho.hidden;
});

fecharCarrinho.addEventListener("click", function () {
    painelCarrinho.hidden = true;
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
                window.location.href = "/frontend/CLIENTE/login/login.html?retorno=checkout";
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
