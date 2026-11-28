const solicitarServico = document.querySelector('#solicitar-digitalizacao');
const solicitarServicodialogLogin = document.querySelector('#dialog-login-digitalizacao');
const dialogSolicitacao = document.querySelector('#dialog-digitalizacao');
const botaoFecharSolicitacao = dialogSolicitacao.querySelector('.fechar-dialog');
const seletorEndereco = document.querySelector('#endereco-digitalizacao');
const mensagemEndereco = document.querySelector('#mensagem-endereco-digitalizacao');
const seletorServico = document.querySelector('#tipo-digitalizacao');
const botaoWhatsApp = document.querySelector('#enviar-whatsapp-digitalizacao');
const avisoWhatsApp = document.querySelector('#aviso-whatsapp-digitalizacao');
const botaoFecharLogin = solicitarServicodialogLogin.querySelector('.fechar-login-digitalizacao');
const botaoLogin = document.querySelector('#botao-login-digitalizacao');
let enviandoSolicitacao = false;

const apiBase = (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';

const loginUrl = new URL('../../login/login.html', window.location.href);

function atualizarBotaoWhatsApp() {
    const prontoParaEnviar = Boolean(
        seletorServico.value &&
        seletorEndereco.value &&
        !seletorEndereco.disabled &&
        !enviandoSolicitacao
    );

    botaoWhatsApp.disabled = !prontoParaEnviar;
    avisoWhatsApp.hidden = prontoParaEnviar;
}

async function carregarEnderecos() {
    const resposta = await fetch(`${apiBase}/api/enderecos`, {
        credentials: 'include'
    });

    if (resposta.status === 401) {
        solicitarServicodialogLogin.showModal();
        return false;
    }

    if (!resposta.ok) {
        throw new Error('Não foi possível carregar seus endereços cadastrados.');
    }

    const dados = await resposta.json();
    if (
        !dados ||
        !Array.isArray(dados.enderecos) ||
        dados.enderecos.some(endereco =>
            !endereco ||
            endereco.id === undefined ||
            typeof endereco.nome_endereco !== 'string' ||
            typeof endereco.endereco !== 'string'
        )
    ) {
        throw new Error('A lista de endereços recebida é inválida.');
    }

    const enderecos = dados.enderecos;
    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.disabled = true;
    opcaoInicial.selected = true;
    opcaoInicial.textContent = enderecos.length > 1
        ? 'Selecione o endereço para receber o serviço'
        : 'Confirme o endereço cadastrado';

    seletorEndereco.replaceChildren(opcaoInicial);
    mensagemEndereco.replaceChildren();
    mensagemEndereco.hidden = true;

    for (const endereco of enderecos) {
        const opcao = document.createElement('option');
        opcao.value = String(endereco.id);
        opcao.textContent = `${endereco.nome_endereco} — ${endereco.endereco.replace(/\s+/g, ' ').trim()}`;
        opcao.dataset.nomeEndereco = endereco.nome_endereco;
        opcao.dataset.enderecoMensagem = endereco.endereco
            .split(/\r?\n/)
            .filter(linha => !/^\s*(?:Estado|CEP)\s*:/i.test(linha))
            .map(linha => linha.trim())
            .join(', ');
        seletorEndereco.append(opcao);
    }

    seletorEndereco.disabled = enderecos.length === 0;

    if (enderecos.length === 0) {
        mensagemEndereco.textContent = 'Você ainda não cadastrou um endereço. ';
        const linkCadastro = document.createElement('a');
        linkCadastro.href = '../../minha-conta/minha-conta.html';
        linkCadastro.textContent = 'Cadastre um endereço na sua conta.';
        mensagemEndereco.append(linkCadastro);
        mensagemEndereco.hidden = false;
    } else if (enderecos.length > 1) {
        mensagemEndereco.textContent =
            `Encontramos ${enderecos.length} endereços. Escolha onde deseja receber o serviço.`;
        mensagemEndereco.hidden = false;
    }

    atualizarBotaoWhatsApp();
    return true;
}

async function verificarSessaoDigitalizacao() {
    solicitarServico.disabled = true;

    try {
        const resposta = await fetch(`${apiBase}/api/autenticacao/me`, {
            credentials: 'include'
        });

        if (resposta.status === 401) {
            solicitarServicodialogLogin.showModal();
            return;
        }

        if (!resposta.ok) {
            throw new Error('Não foi possível verificar sua sessão.');
        }

        const enderecosCarregados = await carregarEnderecos();
        if (!enderecosCarregados) {
            return;
        }

        dialogSolicitacao.showModal();
    } catch (erro) {
        console.error('Não foi possível preparar a solicitação de digitalização.', erro);
        window.alert(
            erro.message || 'Não foi possível carregar os dados para a solicitação.'
        );
    } finally {
        solicitarServico.disabled = false;
    }
}

solicitarServico.addEventListener('click', verificarSessaoDigitalizacao);

botaoFecharSolicitacao.addEventListener('click', () => {
    dialogSolicitacao.close();
});

dialogSolicitacao.addEventListener('click', evento => {
    if (evento.target === dialogSolicitacao) {
        dialogSolicitacao.close();
    }
});

seletorServico.addEventListener('change', atualizarBotaoWhatsApp);
seletorEndereco.addEventListener('change', atualizarBotaoWhatsApp);

botaoWhatsApp.addEventListener('click', async () => {
    atualizarBotaoWhatsApp();
    if (botaoWhatsApp.disabled) {
        return;
    }

    const opcaoEndereco = seletorEndereco.selectedOptions[0];
    const enderecoEscolhido =
        `${opcaoEndereco.dataset.nomeEndereco} — ${opcaoEndereco.dataset.enderecoMensagem}`;
    const mensagem = [
        'Olá! Gostaria de solicitar digitalização pela Lumière.',
        `Serviço escolhido: ${seletorServico.value}`,
        `Endereço para entrega e retirada: ${enderecoEscolhido}`
    ].join('\n');

    enviandoSolicitacao = true;
    atualizarBotaoWhatsApp();
    try {
        await window.registrarSolicitacaoEabrirWhatsApp({
            tipoServico: 'digitalizacao',
            servicoEscolhido: seletorServico.value,
            enderecoId: seletorEndereco.value,
            mensagem
        });
    } catch (erro) {
        console.error('Não foi possível registrar a solicitação de digitalização.', erro);
        window.alert(erro.message || 'Não foi possível registrar a solicitação.');
    } finally {
        enviandoSolicitacao = false;
        atualizarBotaoWhatsApp();
    }
});

botaoLogin.addEventListener('click', () => {
    window.location.href = loginUrl.href;
});

botaoFecharLogin.addEventListener('click', () => {
    solicitarServicodialogLogin.close();
});

solicitarServicodialogLogin.addEventListener('click', evento => {
    if (evento.target === solicitarServicodialogLogin) {
        solicitarServicodialogLogin.close();
    }
});
