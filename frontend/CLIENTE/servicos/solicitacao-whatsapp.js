(function () {
    const apiBase = (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') &&
        window.location.port !== '3000'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : '';

    window.registrarSolicitacaoEabrirWhatsApp = async function ({
        tipoServico,
        servicoEscolhido,
        enderecoId,
        mensagem
    }) {
        // Abre a aba durante o clique para evitar bloqueio de pop-up enquanto a API responde.
        const abaWhatsApp = window.open('about:blank', '_blank');

        try {
            const resposta = await fetch(`${apiBase}/api/solicitacoes-servico`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo_servico: tipoServico,
                    servico_escolhido: servicoEscolhido,
                    endereco_id: enderecoId
                })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) {
                throw new Error(dados.erro || 'Não foi possível registrar a solicitação.');
            }

            const urlWhatsApp = `https://wa.me/5544999176182?text=${encodeURIComponent(mensagem)}`;
            if (abaWhatsApp) {
                abaWhatsApp.location.href = urlWhatsApp;
            } else {
                window.location.href = urlWhatsApp;
            }
        } catch (erro) {
            if (abaWhatsApp && !abaWhatsApp.closed) abaWhatsApp.close();
            throw erro;
        }
    };
})();
