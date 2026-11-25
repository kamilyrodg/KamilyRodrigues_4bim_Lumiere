const formulario = document.getElementById("form-cadastro");
const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoUsuario = document.getElementById("usuario");
const campoSenha = document.getElementById("senha");
const campoConfirmarSenha = document.getElementById("confirmar-senha");
const mensagemCadastro = document.getElementById("mensagem-cadastro");
const mensagemSenha = document.getElementById("mensagem-senha");
const apiBase = (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
    window.location.port !== "3000"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "";

function mostrarMensagem(mensagem) {
    mensagemCadastro.textContent = mensagem;
    mensagemCadastro.hidden = false;
}

function limparMensagem() {
    mensagemCadastro.textContent = "";
    mensagemCadastro.hidden = true;
}

function verificarSenhas() {
    const senha = campoSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    mensagemSenha.className = "";

    if (!confirmarSenha) {
        mensagemSenha.textContent = "";
        return false;
    }

    if (senha !== confirmarSenha) {
        mensagemSenha.textContent = "As senhas não coincidem.";
        mensagemSenha.classList.add("erro");
        return false;
    }

    mensagemSenha.textContent = "As senhas coincidem!";
    mensagemSenha.classList.add("sucesso");
    return true;
}

campoSenha.addEventListener("input", verificarSenhas);
campoConfirmarSenha.addEventListener("input", verificarSenhas);

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    limparMensagem();

    const nome = campoNome.value.trim();
    const email = campoEmail.value.trim().toLowerCase();
    const usuario = campoUsuario.value.trim();
    const senha = campoSenha.value;
    const confirmarSenha = campoConfirmarSenha.value;

    if (!nome || !email || !usuario || !senha || !confirmarSenha) {
        mostrarMensagem("Preencha todos os campos para continuar.");
        return;
    }

    if (nome.split(/\s+/).length < 2) {
        mostrarMensagem("Informe seu nome e sobrenome.");
        campoNome.focus();
        return;
    }

    if (senha.length < 8) {
        mostrarMensagem("Sua senha precisa ter pelo menos 8 caracteres.");
        return;
    }

    if (senha !== confirmarSenha) {
        mostrarMensagem("As senhas não coincidem. Confira e tente novamente.");
        campoConfirmarSenha.focus();
        verificarSenhas();
        return;
    }

    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/cadastro`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: nome, email: email, username: usuario, senha: senha })
        });

        const dados = await resposta.json();
        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível concluir o cadastro.");
        }
    } catch (erro) {
        if (erro instanceof TypeError) {
            console.error("Não foi possível conectar à API de autenticação.", erro);
            mostrarMensagem("Não foi possível conectar à API. Mantenha o backend rodando em http://localhost:3000; o frontend pode continuar aberto pelo Live Server.");
            return;
        }

        mostrarMensagem(erro.message || "Não foi possível concluir o cadastro.");
        return;
    }

    window.location.href = "./endereco.html";
});

campoNome.addEventListener("input", limparMensagem);
campoEmail.addEventListener("input", limparMensagem);
campoUsuario.addEventListener("input", limparMensagem);
campoSenha.addEventListener("input", limparMensagem);
campoConfirmarSenha.addEventListener("input", limparMensagem);