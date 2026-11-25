const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';

const itensPedido = document.getElementById('itens-pedido');
const totalPedido = document.getElementById('total-pedido');
const formasPagamento = document.getElementById('formas-pagamento');
const mensagemCheckout = document.getElementById('mensagem-checkout');
const confirmarCompra = document.getElementById('confirmar-compra');
const formularioFinalizar = document.getElementById('form-finalizar');
const enderecosEntrega = document.getElementById('enderecos-entrega');
const statusEndereco = document.getElementById('status-endereco');

const dadosCartao = document.getElementById('dados-cartao');
const dadosPix = document.getElementById('dados-pix');

const numeroCartao = document.getElementById('numero-cartao');
const nomeTitular = document.getElementById('nome-titular');
const validadeCartao = document.getElementById('validade-cartao');
const cvvCartao = document.getElementById('cvv-cartao');
const parcelasCartao = document.getElementById('parcelas-cartao');

const areaParcelas = document.getElementById('area-parcelas');
const resumoParcelas = document.getElementById('resumo-parcelas');

const bandeiraCartao = document.getElementById('bandeira-cartao');
const bandeiraVisual = document.getElementById('bandeira-visual');

const numeroVisual = document.getElementById('numero-visual');
const titularVisual = document.getElementById('titular-visual');
const validadeVisual = document.getElementById('validade-visual');
const cartaoVisual = document.querySelector('.cartao-visual');

const erroNumero = document.getElementById('erro-numero');
const erroValidade = document.getElementById('erro-validade');

const codigoPix = document.getElementById('codigo-pix');
const valorPix = document.getElementById('valor-pix');
const qrcode = document.getElementById('qrcode');

let itensCheckout = [];
let valorTotalPedido = 0;

let pedidoCarregado = false;
let formasPagamentoCarregadas = false;
let enderecosCarregados = false;

let enviandoPedido = false;
let pedidoConcluido = false;

let metodosPagamento = [];

function mostrarMensagem(mensagem, tipo) {
    mensagemCheckout.textContent = mensagem;
    mensagemCheckout.className = `mensagem-checkout${tipo ? ` ${tipo}` : ''}`;
    mensagemCheckout.hidden = false;
}

function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function obterCarrinho() {
    const carrinhoSalvo = localStorage.getItem('carrinho');
    const carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];

    if (!Array.isArray(carrinho)) {
        throw new Error('O conteúdo da sacola está inválido.');
    }

    return carrinho;
}

function formatarItensCarrinho(carrinho) {
    return carrinho.map(item => {
        const produtoId = Number(item.id ?? item.produto_id);

        const quantidade = Number(
            item.quantidade ?? item.qtd ?? item.quantity ?? 1
        );

        if (
            !Number.isSafeInteger(produtoId) ||
            produtoId < 1 ||
            !Number.isSafeInteger(quantidade) ||
            quantidade < 1
        ) {
            throw new Error('Confira os produtos e as quantidades da sacola.');
        }

        return { produtoId, quantidade };
    });
}

function redirecionarParaLoginCheckout(itens) {
    const urlLogin = new URL('../login/login.html', window.location.href);

    urlLogin.searchParams.set('retorno', 'checkout');

    if (itens && itens.length > 0) {
        urlLogin.searchParams.set('carrinho', JSON.stringify(itens));
    }

    window.location.href = urlLogin.href;
}

function atualizarBotaoCompra() {
    const temEndereco = Boolean(enderecosEntrega.querySelector(
        'input[name="enderecoEntrega"]:checked'
    ));

    const temFormaPagamento = Boolean(formasPagamento.querySelector(
        'input[name="formaPagamento"]:checked'
    ));

    confirmarCompra.disabled =
        !pedidoCarregado ||
        !formasPagamentoCarregadas ||
        !enderecosCarregados ||
        !temEndereco ||
        !temFormaPagamento ||
        enviandoPedido ||
        pedidoConcluido;
}


// ==========================================
// RESUMO DO PEDIDO
// ==========================================

function renderizarPedido(itens, valorTotal) {
    itensPedido.replaceChildren();

    itensCheckout = itens.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade
    }));

    pedidoCarregado = itensCheckout.length > 0;
    valorTotalPedido = Number(valorTotal);

    if (itens.length === 0) {
        const vazio = document.createElement('p');

        vazio.className = 'estado-checkout';
        vazio.textContent = 'Sua sacola está vazia. Volte à loja para escolher seus produtos.';

        itensPedido.appendChild(vazio);

        totalPedido.textContent = formatarPreco(0);

        atualizarBotaoCompra();
        return;
    }

    itens.forEach(item => {
        const subtotal = Number(item.preco) * item.quantidade;

        const linha = document.createElement('article');
        linha.className = 'item-pedido';

        const imagem = document.createElement('img');

        if (item.imagem) {
            imagem.src = item.imagem;
            imagem.alt = item.nome;

            imagem.addEventListener('error', () => {
                imagem.hidden = true;
            }, { once: true });
        } else {
            imagem.hidden = true;
            imagem.alt = '';
        }

        const informacoes = document.createElement('div');
        informacoes.className = 'informacoes-item';

        const titulo = document.createElement('h3');
        titulo.textContent = item.nome;

        const detalhe = document.createElement('p');
        detalhe.textContent = `Quantidade: ${item.quantidade}`;

        const preco = document.createElement('p');
        preco.className = 'preco-item-pedido';
        preco.textContent = formatarPreco(subtotal);

        informacoes.append(titulo, detalhe);
        linha.append(imagem, informacoes, preco);

        itensPedido.appendChild(linha);
    });

    totalPedido.textContent = formatarPreco(valorTotalPedido);

    atualizarBotaoCompra();

    atualizarParcelas();
}


// ==========================================
// IDENTIFICAÇÃO DA BANDEIRA
// ==========================================

function identificarBandeira(numero) {
    if (/^4/.test(numero)) {
        return 'VISA';
    }

    if (/^5[1-5]/.test(numero) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(numero)) {
        return 'MASTERCARD';
    }

    if (/^3[47]/.test(numero)) {
        return 'AMEX';
    }

    if (/^6(?:011|5)/.test(numero)) {
        return 'DISCOVER';
    }

    if (/^(4011|4312|4389|4514|4576|5067|5090|6277|6362|6363)/.test(numero)) {
        return 'ELO';
    }

    return numero.length ? 'CARTÃO' : 'CARD';
}


// ==========================================
// CARTÃO VISUAL
// ==========================================

function atualizarCartaoVisual() {
    const numero = numeroCartao.value.replace(/\D/g, '');
    const bandeira = identificarBandeira(numero);

    numeroCartao.value = numero
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .trim();

    numeroVisual.textContent = numero
        ? numero.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim()
        : '•••• •••• •••• ••••';

    bandeiraCartao.textContent = bandeira;
    bandeiraVisual.textContent = bandeira;

    titularVisual.textContent =
        nomeTitular.value.toUpperCase() || 'NOME DO TITULAR';

    validadeVisual.textContent =
        validadeCartao.value || 'MM/AA';
}

numeroCartao.addEventListener('input', () => {
    numeroCartao.value = numeroCartao.value
        .replace(/\D/g, '')
        .slice(0, 16);

    atualizarCartaoVisual();
});

nomeTitular.addEventListener('input', atualizarCartaoVisual);


// Animação do cartão ao acessar o CVV

cvvCartao.addEventListener('focus', () => {
    cartaoVisual.classList.add('virado');
});

cvvCartao.addEventListener('blur', () => {
    cartaoVisual.classList.remove('virado');
});


// ==========================================
// VALIDADE DO CARTÃO
// ==========================================

validadeCartao.addEventListener('input', () => {
    let valor = validadeCartao.value.replace(/\D/g, '').slice(0, 4);

    if (valor.length > 2) {
        valor = valor.slice(0, 2) + '/' + valor.slice(2);
    }

    validadeCartao.value = valor;
    validadeCartao.setAttribute('aria-invalid', 'false');
    erroValidade.textContent = '';

    atualizarCartaoVisual();
});

function validarValidade() {
    const valor = validadeCartao.value;

    if (!/^\d{2}\/\d{2}$/.test(valor)) {
        return false;
    }

    const [mes, ano] = valor.split('/').map(Number);

    if (mes < 1 || mes > 12) {
        return false;
    }

    const anoCompleto = 2000 + ano;

    const dataAtual = new Date();

    const anoAtual = dataAtual.getFullYear();
    const mesAtual = dataAtual.getMonth() + 1;

    if (anoCompleto < 2026) {
        return false;
    }

    if (
        anoCompleto < anoAtual ||
        (anoCompleto === anoAtual && mes < mesAtual)
    ) {
        return false;
    }

    return true;
}

validadeCartao.addEventListener('blur', () => {
    const validadeInformada = validadeCartao.value.length > 0;
    const validadeValida = validarValidade();

    validadeCartao.setAttribute(
        'aria-invalid',
        String(validadeInformada && !validadeValida)
    );
    erroValidade.textContent = validadeInformada && !validadeValida
        ? 'Use MM/AA com ano a partir de 2026 e validade futura.'
        : '';
});


// ==========================================
// VALIDAÇÃO DO NÚMERO DO CARTÃO
// ==========================================

function validarNumeroCartao(numero) {
    if (!/^\d{16}$/.test(numero)) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < numero.length; i++) {
        let digito = Number(numero[numero.length - 1 - i]);

        if (i % 2 === 1) {
            digito *= 2;

            if (digito > 9) {
                digito -= 9;
            }
        }

        soma += digito;
    }

    return soma % 10 === 0;
}


// ==========================================
// PARCELAMENTO
// ==========================================

function obterMaximoParcelas(total) {
    if (total < 100) {
        return 1;
    }

    if (total < 1000) {
        return 2;
    }

    if (total < 4000) {
        return 10;
    }

    if (total < 6000) {
        return 15;
    }

    return 20;
}

function atualizarParcelas() {
    const tipo = obterTipoCartaoSelecionado();

    if (tipo !== 'credito') {
        areaParcelas.hidden = true;
        return;
    }

    areaParcelas.hidden = false;

    const maximo = obterMaximoParcelas(valorTotalPedido);

    parcelasCartao.replaceChildren();

    for (let i = 1; i <= maximo; i++) {
        const valorParcela = valorTotalPedido / i;

        const opcao = document.createElement('option');

        opcao.value = String(i);

        opcao.textContent =
            `${i}x de ${formatarPreco(valorParcela)}` +
            (i === 1 ? ' (à vista)' : '');

        parcelasCartao.appendChild(opcao);
    }

    parcelasCartao.value = '1';

    atualizarResumoParcelas();
}

function atualizarResumoParcelas() {
    const quantidade = Number(parcelasCartao.value);

    if (!quantidade) {
        resumoParcelas.textContent = '';
        return;
    }

    const valor = valorTotalPedido / quantidade;

    resumoParcelas.textContent =
        `${quantidade} parcela(s) de ${formatarPreco(valor)}.`;
}

parcelasCartao.addEventListener('change', atualizarResumoParcelas);


// ==========================================
// FORMAS DE PAGAMENTO
// ==========================================

function identificarTipoPagamento(nome) {
    const texto = nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (texto.includes('pix')) {
        return 'pix';
    }

    if (texto.includes('credito') || texto.includes('debito')) {
        return 'cartao';
    }

    return 'outro';
}

function obterTipoCartaoSelecionado() {
    const selecionado = formasPagamento.querySelector(
        'input[name="formaPagamento"]:checked'
    );

    if (!selecionado) {
        return null;
    }

    const metodo = metodosPagamento.find(
        item => String(item.id) === selecionado.value
    );

    if (!metodo) {
        return null;
    }

    const nome = metodo.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (nome.includes('debito')) {
        return 'debito';
    }

    if (nome.includes('credito')) {
        return 'credito';
    }

    return null;
}

function atualizarFormaPagamento() {
    const selecionado = formasPagamento.querySelector(
        'input[name="formaPagamento"]:checked'
    );

    dadosCartao.hidden = true;
    dadosPix.hidden = true;

    if (!selecionado) {
        atualizarBotaoCompra();
        return;
    }

    const metodo = metodosPagamento.find(
        item => String(item.id) === selecionado.value
    );

    if (!metodo) {
        atualizarBotaoCompra();
        return;
    }

    const tipo = identificarTipoPagamento(metodo.nome);

    if (tipo === 'cartao') {
        dadosCartao.hidden = false;

        atualizarParcelas();

    } else if (tipo === 'pix') {
        dadosPix.hidden = false;

        gerarPixDemonstrativo();
    }

    atualizarBotaoCompra();
}

function renderizarFormasPagamento(metodos) {
    if (
        !Array.isArray(metodos) ||
        metodos.length === 0 ||
        metodos.some(metodo =>
            !metodo ||
            metodo.id === undefined ||
            typeof metodo.nome !== 'string'
        )
    ) {
        throw new Error('Nenhuma forma de pagamento está disponível.');
    }

    metodosPagamento = metodos;

    formasPagamento.replaceChildren();

    metodos.forEach(metodo => {
        const opcao = document.createElement('label');
        opcao.className = 'forma-pagamento';

        const radio = document.createElement('input');

        radio.type = 'radio';
        radio.name = 'formaPagamento';
        radio.value = String(metodo.id);
        radio.required = true;

        const nome = document.createElement('span');
        nome.textContent = metodo.nome;

        opcao.append(radio, nome);

        formasPagamento.appendChild(opcao);
    });

    formasPagamentoCarregadas = true;

    atualizarBotaoCompra();
}

formasPagamento.addEventListener('change', atualizarFormaPagamento);


// ==========================================
// PIX DEMONSTRATIVO
// ==========================================

function gerarPixDemonstrativo() {
    if (!valorTotalPedido || valorTotalPedido <= 0) {
        return;
    }

    const valor = valorTotalPedido.toFixed(2);

    const identificador = `LUMIERE-${Date.now()}`;

    // Conteúdo demonstrativo, não é um payload PIX bancário válido.
    const payload = `LUMIERE|PIX|${identificador}|BRL|${valor}`;

    codigoPix.value = payload;

    valorPix.textContent = formatarPreco(valorTotalPedido);

    qrcode.replaceChildren();

    if (typeof QRCode === 'undefined') {
        qrcode.textContent = 'Não foi possível carregar o gerador de QR Code.';
        return;
    }

    new QRCode(qrcode, {
        text: payload,
        width: 190,
        height: 190,
        colorDark: '#25344F',
        colorLight: '#FFFCF5',
        correctLevel: QRCode.CorrectLevel.H
    });
}

document.getElementById('copiar-pix').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(codigoPix.value);

        const botao = document.getElementById('copiar-pix');

        botao.textContent = 'CÓDIGO COPIADO!';

        setTimeout(() => {
            botao.textContent = 'COPIAR CÓDIGO';
        }, 2000);

    } catch (erro) {
        mostrarMensagem('Não foi possível copiar o código PIX.');
    }
});


// ==========================================
// ENDEREÇOS
// ==========================================

function renderizarEnderecos(enderecos) {
    if (
        !Array.isArray(enderecos) ||
        enderecos.some(endereco =>
            !endereco ||
            endereco.id === undefined ||
            typeof endereco.nome_endereco !== 'string' ||
            typeof endereco.endereco !== 'string'
        )
    ) {
        throw new Error('A lista de endereços recebida é inválida.');
    }

    enderecosEntrega.replaceChildren();

    enderecosCarregados = enderecos.length > 0;

    if (enderecos.length === 0) {
        const estado = document.createElement('p');

        estado.className = 'estado-checkout';
        estado.append('Nenhum endereço cadastrado. ');

        const linkCadastro = document.createElement('a');

        linkCadastro.href = '../minha-conta/minha-conta.html';
        linkCadastro.textContent = 'Cadastre um endereço na sua conta.';

        estado.appendChild(linkCadastro);
        enderecosEntrega.appendChild(estado);

        statusEndereco.textContent = 'Cadastre um endereço para continuar.';

        atualizarBotaoCompra();
        return;
    }

    enderecos.forEach((endereco, indice) => {
        const opcao = document.createElement('label');

        opcao.className = 'opcao-endereco';

        const radio = document.createElement('input');

        radio.type = 'radio';
        radio.name = 'enderecoEntrega';
        radio.value = String(endereco.id);
        radio.required = true;

        radio.checked = enderecos.length === 1 && indice === 0;

        radio.dataset.nomeEndereco = endereco.nome_endereco;

        const informacoes = document.createElement('span');

        informacoes.textContent = endereco.nome_endereco;

        const descricao = document.createElement('small');

        descricao.textContent = endereco.endereco;

        informacoes.appendChild(descricao);

        opcao.append(radio, informacoes);

        enderecosEntrega.appendChild(opcao);
    });

    const selecionado = enderecosEntrega.querySelector(
        'input[name="enderecoEntrega"]:checked'
    );

    statusEndereco.textContent = selecionado
        ? `Endereço confirmado para entrega: ${selecionado.dataset.nomeEndereco}.`
        : 'Selecione o endereço para a entrega.';

    atualizarBotaoCompra();
}

async function carregarEnderecos() {
    try {
        const resposta = await fetch(`${apiBase}/api/enderecos`, {
            credentials: 'include'
        });

        if (resposta.status === 401) {
            redirecionarParaLoginCheckout();
            return;
        }

        if (!resposta.ok) {
            throw new Error('Não foi possível carregar seus endereços cadastrados.');
        }

        const dados = await resposta.json();

        renderizarEnderecos(dados.enderecos);

    } catch (erro) {
        console.error('Não foi possível carregar os endereços:', erro);

        enderecosEntrega.replaceChildren();

        const estado = document.createElement('p');

        estado.className = 'estado-checkout';
        estado.textContent = 'Não foi possível carregar seus endereços.';

        enderecosEntrega.appendChild(estado);

        enderecosCarregados = false;

        atualizarBotaoCompra();

        statusEndereco.textContent = erro.message;
    }
}

enderecosEntrega.addEventListener('change', () => {
    const selecionado = enderecosEntrega.querySelector(
        'input[name="enderecoEntrega"]:checked'
    );

    statusEndereco.textContent = selecionado
        ? `Endereço confirmado para entrega: ${selecionado.dataset.nomeEndereco}.`
        : 'Selecione o endereço para a entrega.';

    atualizarBotaoCompra();
});


// ==========================================
// CARREGAR RESUMO
// ==========================================

async function carregarResumoPedido() {
    try {
        const carrinhoSalvo = localStorage.getItem('carrinho');

        const carrinho = obterCarrinho();

        const itens = formatarItensCarrinho(carrinho);

        let resposta;

        if (carrinhoSalvo !== null) {
            resposta = await fetch(`${apiBase}/api/finalizar-compra/carrinho`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itens })
            });

            if (resposta.status === 401) {
                redirecionarParaLoginCheckout(itens);
                return;
            }

            const dadosSincronizacao = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dadosSincronizacao.erro || 'Não foi possível sincronizar a sacola.'
                );
            }
        }

        resposta = await fetch(`${apiBase}/api/finalizar-compra/carrinho`, {
            credentials: 'include'
        });

        if (resposta.status === 401) {
            redirecionarParaLoginCheckout(itens);
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível carregar o resumo do pedido.'
            );
        }

        if (
            !Array.isArray(dados.itens) ||
            !Number.isFinite(Number(dados.valorTotal))
        ) {
            throw new Error('O resumo do pedido recebido é inválido.');
        }

        renderizarPedido(dados.itens, Number(dados.valorTotal));

    } catch (erro) {
        console.error('Não foi possível carregar o resumo:', erro);

        itensPedido.replaceChildren();

        const estadoPedido = document.createElement('p');

        estadoPedido.className = 'estado-checkout';
        estadoPedido.textContent = erro.message;

        itensPedido.appendChild(estadoPedido);

        totalPedido.textContent = formatarPreco(0);

        pedidoCarregado = false;

        atualizarBotaoCompra();

        mostrarMensagem(erro.message);
    }
}


// ==========================================
// CARREGAR FORMAS DE PAGAMENTO
// ==========================================

async function carregarFormasPagamento() {
    try {
        const resposta = await fetch(
            `${apiBase}/api/finalizar-compra/formas-pagamento`,
            { credentials: 'include' }
        );

        if (resposta.status === 401) {
            redirecionarParaLoginCheckout();
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível carregar as formas de pagamento.'
            );
        }

        renderizarFormasPagamento(dados.formasPagamento);

    } catch (erro) {
        console.error('Não foi possível carregar as formas de pagamento:', erro);

        formasPagamentoCarregadas = false;

        formasPagamento.replaceChildren();

        const estadoPagamento = document.createElement('p');

        estadoPagamento.className = 'estado-checkout';
        estadoPagamento.textContent = erro.message;

        formasPagamento.appendChild(estadoPagamento);

        atualizarBotaoCompra();
    }
}


// ==========================================
// INICIAR CHECKOUT
// ==========================================

async function iniciarCheckout() {
    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/me`, {
            credentials: 'include'
        });

        if (resposta.status === 401) {
            redirecionarParaLoginCheckout(
                formatarItensCarrinho(obterCarrinho())
            );
            return;
        }

        if (!resposta.ok) {
            throw new Error('Não foi possível verificar sua sessão.');
        }

        await carregarResumoPedido();

        await Promise.all([
            carregarFormasPagamento(),
            carregarEnderecos()
        ]);

    } catch (erro) {
        console.error('Não foi possível iniciar o checkout:', erro);

        mostrarMensagem(erro.message);
    }
}


// ==========================================
// FINALIZAR COMPRA
// ==========================================

formularioFinalizar.addEventListener('submit', async event => {
    event.preventDefault();

    if (!formularioFinalizar.reportValidity()) {
        return;
    }

    const enderecoSelecionado = enderecosEntrega.querySelector(
        'input[name="enderecoEntrega"]:checked'
    );

    const formaPagamentoSelecionada = formasPagamento.querySelector(
        'input[name="formaPagamento"]:checked'
    );

    if (
        !pedidoCarregado ||
        !enderecoSelecionado ||
        !formaPagamentoSelecionada ||
        enviandoPedido ||
        pedidoConcluido
    ) {
        mostrarMensagem('Confira a sacola, o endereço e a forma de pagamento.');
        return;
    }

    const metodo = metodosPagamento.find(
        item => String(item.id) === formaPagamentoSelecionada.value
    );

    if (!metodo) {
        mostrarMensagem('Forma de pagamento inválida.');
        return;
    }

    const tipo = identificarTipoPagamento(metodo.nome);

    if (tipo === 'cartao') {
        const numero = numeroCartao.value.replace(/\D/g, '');

        if (!validarNumeroCartao(numero)) {
            erroNumero.textContent = 'Informe um número de cartão válido.';
            numeroCartao.focus();
            return;
        }

        erroNumero.textContent = '';

        if (!nomeTitular.value.trim()) {
            mostrarMensagem('Informe o nome do titular do cartão.');
            nomeTitular.focus();
            return;
        }

        if (!validarValidade()) {
            erroValidade.textContent =
                'Informe uma validade a partir de 2026 e que não esteja expirada.';
            validadeCartao.setAttribute('aria-invalid', 'true');
            validadeCartao.focus();
            return;
        }

        erroValidade.textContent = '';
        validadeCartao.setAttribute('aria-invalid', 'false');

        if (!/^\d{3,4}$/.test(cvvCartao.value)) {
            mostrarMensagem('Informe um CVV válido.');
            cvvCartao.focus();
            return;
        }

        const tipoSelecionado = obterTipoCartaoSelecionado();

        if (
            tipoSelecionado === 'credito' &&
            !parcelasCartao.value
        ) {
            mostrarMensagem('Selecione a quantidade de parcelas.');
            parcelasCartao.focus();
            return;
        }
    }

    enviandoPedido = true;

    confirmarCompra.textContent = 'PROCESSANDO...';

    atualizarBotaoCompra();

    mensagemCheckout.hidden = true;

    try {
        const resposta = await fetch(`${apiBase}/api/finalizar-compra`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enderecoId: Number(enderecoSelecionado.value),
                formaPagamentoId: Number(formaPagamentoSelecionada.value)
            })
        });

        if (resposta.status === 401) {
            window.location.href = '../login/login.html?retorno=checkout';
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível registrar o pedido.'
            );
        }

        pedidoConcluido = true;

        let mensagemSucesso =
            `Pedido #${dados.pedido.id} registrado. ` +
            `Total: ${formatarPreco(Number(dados.pedido.valor_total))}. ` +
            `Forma de pagamento: ${dados.formaPagamento}. ` +
            'O pagamento ainda não foi processado pelo site.';

        try {
            localStorage.removeItem('carrinho');
        } catch (erro) {
            console.error('Não foi possível limpar a sacola:', erro);

            mensagemSucesso +=
                ' Não foi possível limpar os itens salvos na sacola.';
        }

        mostrarMensagem(mensagemSucesso, 'sucesso');

        dadosCartao.hidden = true;
        dadosPix.hidden = true;

    } catch (erro) {
        console.error('Não foi possível confirmar a compra:', erro);

        mostrarMensagem(
            erro.message || 'Não foi possível registrar o pedido.'
        );

    } finally {
        enviandoPedido = false;

        confirmarCompra.textContent = pedidoConcluido
            ? 'PEDIDO REGISTRADO'
            : 'CONFIRMAR COMPRA';

        atualizarBotaoCompra();
    }
});

iniciarCheckout();