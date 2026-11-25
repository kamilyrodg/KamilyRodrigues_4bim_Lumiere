
const formulario = document.getElementById("form-login");
const campoUsuario = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagemLogin = document.getElementById("mensagem-login");
const apiBase = (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
    window.location.port !== "3000"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "";

function mostrarMensagem(mensagem) {
    mensagemLogin.textContent = mensagem;
    mensagemLogin.hidden = false;
}

function limparMensagem() {
    mensagemLogin.textContent = "";
    mensagemLogin.hidden = true;
}

function obterItensCarrinhoCheckout() {
    const parametros = new URLSearchParams(window.location.search);
    const carrinhoDaUrl = parametros.get("carrinho");
    let carrinho;

    if (carrinhoDaUrl !== null) {
        try {
            carrinho = JSON.parse(carrinhoDaUrl);
        } catch {
            throw new Error("Não foi possível recuperar os itens da sacola.");
        }
    } else {
        try {
            const carrinhoSalvo = localStorage.getItem("carrinho");
            carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
        } catch {
            throw new Error("Não foi possível ler os itens salvos na sacola.");
        }
    }

    if (!Array.isArray(carrinho)) {
        throw new Error("O conteúdo da sacola está inválido.");
    }
    if (carrinho.length > 100) {
        throw new Error("A sacola contém produtos demais para finalizar a compra.");
    }

    return carrinho.map(item => {
        const produtoId = Number(item.produtoId ?? item.id ?? item.produto_id);
        const quantidade = Number(
            item.quantidade ?? item.qtd ?? item.quantity ?? 1
        );
        if (
            !Number.isSafeInteger(produtoId) ||
            produtoId < 1 ||
            !Number.isSafeInteger(quantidade) ||
            quantidade < 1 ||
            quantidade > 999
        ) {
            throw new Error("Confira os produtos e as quantidades da sacola.");
        }

        return { produtoId, quantidade };
    });
}

async function sincronizarCarrinhoCheckout() {
    const itens = obterItensCarrinhoCheckout();
    const parametros = new URLSearchParams(window.location.search);
    let carrinhoLocalExiste;
    try {
        carrinhoLocalExiste = localStorage.getItem("carrinho") !== null;
    } catch {
        throw new Error("Não foi possível acessar a sacola salva neste navegador.");
    }

    if (
        itens.length === 0 &&
        !parametros.has("carrinho") &&
        !carrinhoLocalExiste
    ) {
        return;
    }

    const resposta = await fetch(`${apiBase}/api/finalizar-compra/carrinho`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens })
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível sincronizar a sacola.");
    }
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    limparMensagem();

    const usuario = campoUsuario.value.trim();
    const senha = campoSenha.value;

    if (!usuario || !senha) {
        mostrarMensagem("Preencha todos os campos para continuar.");
        return;
    }

    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identificador: usuario, senha: senha })
        });

        const dados = await resposta.json();
        if (!resposta.ok) {
            const erro = new Error(dados.erro || "Não foi possível entrar. Tente novamente.");
            erro.status = resposta.status;
            throw erro;
        }

        if (dados.usuario.tipo === "gerente") {
            window.location.href = "../../gerente.html";
        } else if (new URLSearchParams(window.location.search).get("retorno") === "favoritos") {
            window.location.href = "../../../index.html?mostrarFavoritos=1";
        } else if (new URLSearchParams(window.location.search).get("retorno") === "checkout") {
            await sincronizarCarrinhoCheckout();
            window.location.href = "../finalizar-compra/finalizar-compra.html";
        } else if (new URLSearchParams(window.location.search).get("retorno") === "endereco") {
            window.location.href = "../cadastro/endereco.html";
        } else {
            window.location.href = "../../../index.html?apos-login=1";
        }
    } catch (erro) {
        if (erro.status === 401) {
            mostrarMensagem("Usuário ou senha incorretos. Confira seus dados ou cadastre-se.");
        } else if (erro instanceof TypeError) {
            console.error("Não foi possível conectar à API de autenticação.", erro);
            mostrarMensagem("Não foi possível conectar à API. Mantenha o backend rodando em http://localhost:3000; o frontend pode continuar aberto pelo Live Server.");
        } else {
            console.error("Não foi possível entrar na conta.", erro);
            mostrarMensagem(erro.message || "Não foi possível entrar. Tente novamente.");
        }
    }
});

campoUsuario.addEventListener("input", limparMensagem);
campoSenha.addEventListener("input", limparMensagem);
