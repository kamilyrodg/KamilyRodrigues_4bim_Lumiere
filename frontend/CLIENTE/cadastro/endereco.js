const formularioEnderecos = document.getElementById('form-enderecos');
const listaEnderecos = document.getElementById('lista-enderecos');
const botaoAdicionarEndereco = document.getElementById('adicionar-endereco');
const botaoSalvarEnderecos = document.getElementById('salvar-enderecos');
const mensagemEndereco = document.getElementById('mensagem-endereco');
const apiBase = (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';

function mostrarMensagem(mensagem, tipo) {
    mensagemEndereco.textContent = mensagem;
    mensagemEndereco.className = `mensagem-endereco ${tipo || 'erro'}`;
    mensagemEndereco.hidden = false;
}

function limparMensagem() {
    mensagemEndereco.textContent = '';
    mensagemEndereco.className = 'mensagem-endereco';
    mensagemEndereco.hidden = true;
}

function criarCampoEndereco(rotulo, classe, placeholder, opcoes) {
    const grupo = document.createElement('div');
    grupo.className = `campo-endereco campo-${classe}`;

    const label = document.createElement('label');
    label.textContent = rotulo;

    const campo = document.createElement('input');
    campo.className = classe;
    campo.type = 'text';
    campo.placeholder = placeholder;
    campo.autocomplete = opcoes.autocomplete || 'off';
    campo.required = opcoes.obrigatorio !== false;

    if (opcoes.maxLength) {
        campo.maxLength = opcoes.maxLength;
    }

    if (opcoes.inputMode) {
        campo.inputMode = opcoes.inputMode;
    }

    if (opcoes.pattern) {
        campo.pattern = opcoes.pattern;
    }

    grupo.append(label, campo);
    return { grupo, campo };
}

function criarCartaoEndereco() {
    const cartao = document.createElement('fieldset');
    cartao.className = 'cartao-endereco';

    const legenda = document.createElement('legend');

    const grupoNome = document.createElement('div');
    grupoNome.className = 'campo-endereco';

    const labelNome = document.createElement('label');
    labelNome.className = 'rotulo-nome-endereco';
    labelNome.textContent = 'TIPO DE ENDEREÇO *';

    const nome = document.createElement('select');
    nome.className = 'nome-endereco';
    nome.name = 'nome_endereco';
    nome.required = true;

    const opcaoPadrao = document.createElement('option');
    opcaoPadrao.value = '';
    opcaoPadrao.textContent = 'Selecione uma opção';
    opcaoPadrao.disabled = true;
    opcaoPadrao.selected = true;

    const opcaoCasa = document.createElement('option');
    opcaoCasa.value = 'Casa';
    opcaoCasa.textContent = 'Casa';

    const opcaoTrabalho = document.createElement('option');
    opcaoTrabalho.value = 'Trabalho';
    opcaoTrabalho.textContent = 'Trabalho';
    nome.append(opcaoPadrao, opcaoCasa, opcaoTrabalho);

    const camposDetalhados = document.createElement('div');
    camposDetalhados.className = 'campos-detalhados';

    const rua = criarCampoEndereco(
        'RUA *',
        'rua-endereco',
        'Ex.: Rua das Flores',
        { autocomplete: 'address-line1', maxLength: 150 }
    );
    const numero = criarCampoEndereco(
        'NÚMERO *',
        'numero-endereco',
        'Ex.: 123 ou s/n',
        { maxLength: 20 }
    );
    const complemento = criarCampoEndereco(
        'COMPLEMENTO (OPCIONAL)',
        'complemento-endereco',
        'Ex.: Apto. 12, bloco B',
        { autocomplete: 'address-line2', maxLength: 100, obrigatorio: false }
    );
    const estado = criarCampoEndereco(
        'ESTADO *',
        'estado-endereco',
        'Ex.: SP ou São Paulo',
        { autocomplete: 'address-level1', maxLength: 100 }
    );
    const cep = criarCampoEndereco(
        'CEP *',
        'cep-endereco',
        '00000-000',
        {
            autocomplete: 'postal-code',
            inputMode: 'numeric',
            maxLength: 9,
            pattern: '[0-9]{5}-?[0-9]{3}'
        }
    );

    cep.campo.addEventListener('input', () => {
        const digitos = cep.campo.value.replace(/\D/g, '').slice(0, 8);
        cep.campo.value = digitos.replace(/^(\d{5})(\d)/, '$1-$2');
    });

    camposDetalhados.append(
        rua.grupo,
        numero.grupo,
        complemento.grupo,
        estado.grupo,
        cep.grupo
    );
    grupoNome.append(labelNome, nome);

    const remover = document.createElement('button');
    remover.className = 'botao-remover-endereco';
    remover.type = 'button';
    remover.textContent = 'Remover endereço';
    remover.addEventListener('click', () => {
        if (listaEnderecos.children.length > 1) {
            cartao.remove();
            atualizarCartoesEnderecos();
            limparMensagem();
        }
    });

    cartao.append(legenda, grupoNome, camposDetalhados, remover);
    return cartao;
}

function atualizarCartoesEnderecos() {
    const cartoes = listaEnderecos.querySelectorAll('.cartao-endereco');

    cartoes.forEach((cartao, indice) => {
        const numero = indice + 1;
        const legenda = cartao.querySelector('legend');
        const nome = cartao.querySelector('.nome-endereco');
        const rua = cartao.querySelector('.rua-endereco');
        const numeroEndereco = cartao.querySelector('.numero-endereco');
        const complemento = cartao.querySelector('.complemento-endereco');
        const estado = cartao.querySelector('.estado-endereco');
        const cep = cartao.querySelector('.cep-endereco');
        const labelNome = cartao.querySelector('.rotulo-nome-endereco');
        const remover = cartao.querySelector('.botao-remover-endereco');

        legenda.textContent = `Endereço ${numero}`;
        nome.id = `nome-endereco-${numero}`;
        labelNome.htmlFor = nome.id;
        [rua, numeroEndereco, complemento, estado, cep].forEach(campo => {
            const label = campo.previousElementSibling;
            campo.id = `${campo.className}-${numero}`;
            label.htmlFor = campo.id;
        });
        remover.hidden = cartoes.length === 1;
    });
}

listaEnderecos.appendChild(criarCartaoEndereco());
atualizarCartoesEnderecos();

botaoAdicionarEndereco.addEventListener('click', () => {
    listaEnderecos.appendChild(criarCartaoEndereco());
    atualizarCartoesEnderecos();
    limparMensagem();
    listaEnderecos.lastElementChild
        .querySelector('.nome-endereco')
        .focus();
});

formularioEnderecos.addEventListener('input', limparMensagem);

formularioEnderecos.addEventListener('submit', async evento => {
    evento.preventDefault();
    limparMensagem();

    if (!formularioEnderecos.reportValidity()) {
        return;
    }

    const enderecos = Array.from(
        listaEnderecos.querySelectorAll('.cartao-endereco')
    ).map(cartao => {
        const rua = cartao.querySelector('.rua-endereco').value.trim();
        const numero = cartao.querySelector('.numero-endereco').value.trim();
        const complemento = cartao.querySelector('.complemento-endereco').value.trim();
        const estado = cartao.querySelector('.estado-endereco').value.trim();
        const cep = cartao.querySelector('.cep-endereco').value.trim();

        return {
            nome_endereco: cartao.querySelector('.nome-endereco').value,
            rua,
            numero,
            complemento,
            estado,
            cep,
            endereco: [
                `Rua: ${rua}`,
                `Número: ${numero}`,
                complemento && `Complemento: ${complemento}`,
                `Estado: ${estado}`,
                `CEP: ${cep}`
            ].filter(Boolean).join('\n')
        };
    });

    if (enderecos.length === 0) {
        mostrarMensagem('Cadastre pelo menos um endereço.');
        return;
    }

    if (enderecos.some(endereco =>
        !endereco.nome_endereco ||
        !endereco.rua ||
        !endereco.numero ||
        !endereco.estado ||
        !endereco.cep
    )) {
        mostrarMensagem('Preencha o tipo e todos os campos obrigatórios de cada endereço.');
        return;
    }

    const enderecosParaSalvar = enderecos.map(({ nome_endereco, endereco }) => ({
        nome_endereco,
        endereco
    }));

    botaoSalvarEnderecos.disabled = true;
    botaoSalvarEnderecos.textContent = 'SALVANDO...';

    try {
        const resposta = await fetch(`${apiBase}/api/enderecos`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enderecos: enderecosParaSalvar })
        });

        if (resposta.status === 401) {
            throw new Error('Entre na sua conta para salvar os endereços.');
        }

        const dados = await resposta.json();
        if (!resposta.ok) {
            throw new Error(dados.erro || 'Não foi possível salvar seus endereços.');
        }

        mostrarMensagem('Endereço(s) salvo(s)! Redirecionando para a loja...', 'sucesso');
        window.setTimeout(() => {
            window.location.href = '../../../index.html?apos-login=1';
        }, 1200);
    } catch (erro) {
        console.error('Não foi possível salvar os endereços.', erro);
        mostrarMensagem(erro.message || 'Não foi possível salvar seus endereços.');
        botaoSalvarEnderecos.disabled = false;
        botaoSalvarEnderecos.textContent = 'SALVAR ENDEREÇOS ↗';
    }
});
