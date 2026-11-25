const nomeConta = document.getElementById("nome-conta");
const formularioDadosConta = document.getElementById("form-dados-conta");
const campoNomeConta = document.getElementById("campo-nome-conta");
const campoEmailConta = document.getElementById("campo-email-conta");
const campoUsuarioConta = document.getElementById("campo-usuario-conta");
const botaoSalvarDados = document.getElementById("botao-salvar-dados");
const mensagemDadosConta = document.getElementById("mensagem-dados-conta");
const mensagemConta = document.getElementById("mensagem-conta");
const listaEnderecosConta = document.getElementById("lista-enderecos-conta");
const mensagemEnderecos = document.getElementById("mensagem-enderecos");
const botaoAdicionarEndereco = document.getElementById("botao-adicionar-endereco");
const botaoSair = document.getElementById("botao-sair");
const apiBase = (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
    window.location.port !== "3000"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "";

function mostrarMensagemEnderecos(texto, tipo) {
    mensagemEnderecos.textContent = texto;
    mensagemEnderecos.className = `mensagem-conta${tipo ? ` ${tipo}` : ""}`;
    mensagemEnderecos.hidden = false;
}

function decomporEndereco(texto) {
    const campos = {
        rua: "",
        numero: "",
        complemento: "",
        estado: "",
        cep: ""
    };
    const nomesCampos = {
        rua: "rua",
        "número": "numero",
        numero: "numero",
        complemento: "complemento",
        estado: "estado",
        cep: "cep"
    };
    let encontrouCampo = false;

    String(texto || "").split(/\r?\n/).forEach(linha => {
        const correspondencia = linha.match(/^(Rua|N[uú]mero|Complemento|Estado|CEP):\s*(.*)$/i);
        if (!correspondencia) {
            return;
        }

        const nomeCampo = nomesCampos[correspondencia[1].toLowerCase()];
        campos[nomeCampo] = correspondencia[2].trim();
        encontrouCampo = true;
    });

    if (!encontrouCampo) {
        campos.rua = String(texto || "");
    }

    return campos;
}

function criarCampoEndereco(rotulo, classe, valor, opcoes) {
    const grupo = document.createElement("div");
    grupo.className = `campo-endereco-conta campo-${classe}`;

    const label = document.createElement("label");
    label.textContent = rotulo;

    const campo = document.createElement("input");
    campo.className = classe;
    campo.type = "text";
    campo.value = valor;
    campo.autocomplete = opcoes.autocomplete || "off";
    campo.required = opcoes.obrigatorio !== false;
    campo.maxLength = opcoes.maxLength;

    if (opcoes.inputMode) {
        campo.inputMode = opcoes.inputMode;
    }
    if (opcoes.pattern) {
        campo.pattern = opcoes.pattern;
    }

    grupo.append(label, campo);
    return { grupo, campo };
}

function criarCartaoEndereco(endereco, indice) {
    const cartao = document.createElement("fieldset");
    cartao.className = "cartao-endereco-conta";
    const chaveEndereco = endereco.id || `novo-${Date.now()}-${indice}`;
    let idEndereco = endereco.id || null;

    const legenda = document.createElement("legend");
    legenda.textContent = `Endereço ${indice + 1}`;

    const formulario = document.createElement("form");
    formulario.className = "formulario-endereco-conta";

    const tipoGrupo = document.createElement("div");
    tipoGrupo.className = "campo-endereco-conta campo-tipo-endereco";

    const tipoLabel = document.createElement("label");
    tipoLabel.textContent = "TIPO DE ENDEREÇO *";

    const tipo = document.createElement("select");
    tipo.className = "tipo-endereco";
    tipo.required = true;
    [
        { valor: "Casa", texto: "Casa" },
        { valor: "Trabalho", texto: "Trabalho" }
    ].forEach(opcao => {
        const elemento = document.createElement("option");
        elemento.value = opcao.valor;
        elemento.textContent = opcao.texto;
        tipo.appendChild(elemento);
    });

    const nomeAtual = endereco.nome_endereco || "";
    if (nomeAtual && !["Casa", "Trabalho"].includes(nomeAtual)) {
        const opcaoAtual = document.createElement("option");
        opcaoAtual.value = nomeAtual;
        opcaoAtual.textContent = nomeAtual;
        tipo.appendChild(opcaoAtual);
    }
    tipo.value = nomeAtual;
    tipo.id = `tipo-endereco-${chaveEndereco}`;
    tipoLabel.htmlFor = tipo.id;
    tipoGrupo.append(tipoLabel, tipo);

    const campos = decomporEndereco(endereco.endereco);
    const grade = document.createElement("div");
    grade.className = "campos-endereco-conta";

    const rua = criarCampoEndereco(
        "RUA *",
        "rua-endereco",
        campos.rua,
        { autocomplete: "address-line1", maxLength: 150 }
    );
    const numero = criarCampoEndereco(
        "NÚMERO *",
        "numero-endereco",
        campos.numero,
        { maxLength: 20 }
    );
    const complemento = criarCampoEndereco(
        "COMPLEMENTO (OPCIONAL)",
        "complemento-endereco",
        campos.complemento,
        { autocomplete: "address-line2", maxLength: 100, obrigatorio: false }
    );
    const estado = criarCampoEndereco(
        "ESTADO *",
        "estado-endereco",
        campos.estado,
        { autocomplete: "address-level1", maxLength: 100 }
    );
    const cep = criarCampoEndereco(
        "CEP *",
        "cep-endereco",
        campos.cep,
        {
            autocomplete: "postal-code",
            inputMode: "numeric",
            maxLength: 9,
            pattern: "[0-9]{5}-?[0-9]{3}"
        }
    );
    cep.campo.addEventListener("input", () => {
        const digitos = cep.campo.value.replace(/\D/g, "").slice(0, 8);
        cep.campo.value = digitos.replace(/^(\d{5})(\d)/, "$1-$2");
    });

    [
        rua,
        numero,
        complemento,
        estado,
        cep
    ].forEach(({ grupo, campo }) => {
        campo.id = `${campo.className}-${chaveEndereco}`;
        grupo.querySelector("label").htmlFor = campo.id;
        grade.appendChild(grupo);
    });

    const salvar = document.createElement("button");
    salvar.className = "botao-salvar-endereco";
    salvar.type = "submit";
    salvar.textContent = idEndereco ? "SALVAR ALTERAÇÕES" : "ADICIONAR ENDEREÇO";

    const mensagem = document.createElement("p");
    mensagem.className = "mensagem-edicao-endereco";
    mensagem.setAttribute("role", "status");
    mensagem.setAttribute("aria-live", "polite");
    mensagem.hidden = true;

    formulario.append(tipoGrupo, grade, mensagem, salvar);
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const resultado = await salvarEndereco(idEndereco, {
            nome_endereco: tipo.value,
            rua: rua.campo.value.trim(),
            numero: numero.campo.value.trim(),
            complemento: complemento.campo.value.trim(),
            estado: estado.campo.value.trim(),
            cep: cep.campo.value.trim()
        }, salvar, mensagem);

        if (resultado && idEndereco === null) {
            idEndereco = resultado.id;
            legenda.textContent = `Endereço ${indice + 1}`;
            salvar.textContent = "SALVAR ALTERAÇÕES";
        }
    });

    cartao.append(legenda, formulario);
    return cartao;
}

async function carregarEnderecos() {
    try {
        const resposta = await fetch(`${apiBase}/api/enderecos`, {
            credentials: "include"
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            const erro = new Error(dados.erro || "Não foi possível carregar os endereços.");
            erro.status = resposta.status;
            throw erro;
        }

        listaEnderecosConta.replaceChildren();
        if (dados.enderecos.length === 0) {
            const aviso = document.createElement("p");
            aviso.className = "sem-enderecos";
            aviso.append("Você ainda não cadastrou endereços. ");

            const link = document.createElement("a");
            link.href = "../cadastro/endereco.html";
            link.textContent = "Cadastrar endereço";
            aviso.appendChild(link);
            listaEnderecosConta.appendChild(aviso);
            return;
        }

        dados.enderecos.forEach((endereco, indice) => {
            listaEnderecosConta.appendChild(criarCartaoEndereco(endereco, indice));
        });
    } catch (erro) {
        if (erro.status === 401) {
            window.location.replace("../login/login.html");
        } else {
            console.error("Não foi possível carregar os endereços da conta.", erro);
            mostrarMensagemEnderecos(
                erro.message || "Não foi possível carregar os endereços."
            );
        }
    }
}

async function salvarEndereco(id, endereco, botao, mensagem) {
    const novoEndereco = id === null;
    botao.disabled = true;
    botao.textContent = "SALVANDO...";
    mensagem.hidden = true;

    try {
        const resposta = await fetch(
            novoEndereco ? `${apiBase}/api/enderecos` : `${apiBase}/api/enderecos/${id}`,
            {
                method: novoEndereco ? "POST" : "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novoEndereco
                    ? {
                        enderecos: [{
                            nome_endereco: endereco.nome_endereco,
                            endereco: formatarEndereco(endereco)
                        }]
                    }
                    : endereco)
            }
        );
        const dados = await resposta.json();
        if (!resposta.ok) {
            if (resposta.status === 401) {
                window.location.replace("../login/login.html");
                return null;
            }
            throw new Error(dados.erro || "Não foi possível salvar o endereço.");
        }

        mensagem.textContent = novoEndereco
            ? "Endereço adicionado com sucesso."
            : "Endereço atualizado com sucesso.";
        mensagem.className = "mensagem-edicao-endereco sucesso";
        mensagem.hidden = false;
        return novoEndereco ? dados.enderecos[0] : { id };
    } catch (erro) {
        console.error("Não foi possível salvar o endereço.", erro);
        mensagem.textContent = erro instanceof TypeError
            ? "Não foi possível conectar à API. Verifique se o backend está rodando."
            : erro.message || "Não foi possível salvar o endereço.";
        mensagem.className = "mensagem-edicao-endereco erro";
        mensagem.hidden = false;
        return null;
    } finally {
        botao.disabled = false;
        botao.textContent = novoEndereco ? "ADICIONAR ENDEREÇO" : "SALVAR ALTERAÇÕES";
    }
}

function formatarEndereco(endereco) {
    return [
        `Rua: ${endereco.rua}`,
        `Número: ${endereco.numero}`,
        endereco.complemento && `Complemento: ${endereco.complemento}`,
        `Estado: ${endereco.estado}`,
        `CEP: ${endereco.cep}`
    ].filter(Boolean).join("\n");
}

async function salvarDadosConta(evento) {
    evento.preventDefault();
    mensagemDadosConta.hidden = true;

    if (!formularioDadosConta.reportValidity()) {
        return;
    }

    botaoSalvarDados.disabled = true;
    botaoSalvarDados.textContent = "SALVANDO...";

    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/me`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome: campoNomeConta.value.trim(),
                email: campoEmailConta.value.trim(),
                username: campoUsuarioConta.value.trim()
            })
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            if (resposta.status === 401) {
                window.location.replace("../login/login.html");
                return;
            }
            throw new Error(dados.erro || "Não foi possível atualizar os dados da conta.");
        }

        campoNomeConta.value = dados.usuario.nome;
        campoEmailConta.value = dados.usuario.email;
        campoUsuarioConta.value = dados.usuario.username;
        nomeConta.textContent = dados.usuario.nome.split(/\s+/)[0];
        mensagemDadosConta.textContent = "Dados atualizados com sucesso.";
        mensagemDadosConta.className = "mensagem-conta sucesso";
        mensagemDadosConta.hidden = false;
    } catch (erro) {
        console.error("Não foi possível atualizar os dados da conta.", erro);
        mensagemDadosConta.textContent = erro instanceof TypeError
            ? "Não foi possível conectar à API. Verifique se o backend está rodando."
            : erro.message || "Não foi possível atualizar os dados da conta.";
        mensagemDadosConta.className = "mensagem-conta";
        mensagemDadosConta.hidden = false;
    } finally {
        botaoSalvarDados.disabled = false;
        botaoSalvarDados.textContent = "SALVAR DADOS";
    }
}

async function carregarConta() {
    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/me`, {
            credentials: "include"
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            const erro = new Error(dados.erro || "Não foi possível carregar os dados da conta.");
            erro.status = resposta.status;
            throw erro;
        }

        const usuario = dados.usuario;
        nomeConta.textContent = usuario.nome.split(/\s+/)[0];
        campoNomeConta.value = usuario.nome;
        campoEmailConta.value = usuario.email;
        campoUsuarioConta.value = usuario.username;
        await carregarEnderecos();
    } catch (erro) {
        if (erro.status === 401) {
            window.location.replace("../login/login.html");
        } else {
            console.error("Não foi possível carregar os dados da conta.", erro);
            mensagemConta.textContent = erro.message || "Não foi possível carregar os dados da conta.";
            mensagemConta.hidden = false;
        }
    }
}

botaoAdicionarEndereco.addEventListener("click", () => {
    const avisoVazio = listaEnderecosConta.querySelector(".sem-enderecos");
    if (avisoVazio) {
        avisoVazio.remove();
    }

    const indice = listaEnderecosConta.querySelectorAll(".cartao-endereco-conta").length;
    const cartao = criarCartaoEndereco({
        id: null,
        nome_endereco: "",
        endereco: ""
    }, indice);
    listaEnderecosConta.appendChild(cartao);
    cartao.querySelector(".tipo-endereco").focus();
});

formularioDadosConta.addEventListener("submit", salvarDadosConta);

botaoSair.addEventListener("click", async function () {
    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/logout`, {
            method: "POST",
            credentials: "include"
        });
        if (!resposta.ok) {
            const dados = await resposta.json();
            throw new Error(dados.erro || "Não foi possível sair da conta.");
        }

        window.location.replace("/index.html");
    } catch (erro) {
        console.error("Não foi possível encerrar a sessão.", erro);
        mensagemConta.textContent = erro.message || "Não foi possível sair da conta. Tente novamente.";
        mensagemConta.hidden = false;
    }
});

carregarConta();
