(function () {
    const apiBase = (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') &&
        window.location.port !== '3000'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : '';
    const siteRoot = new URL('../../../', document.currentScript.src);
    const loginUrl = new URL(
        'frontend/CLIENTE/login/login.html?retorno=favoritos',
        siteRoot
    );

    async function listar() {
        const resposta = await fetch(`${apiBase}/api/favoritos`, {
            credentials: 'include'
        });

        if (resposta.status === 401) {
            return [];
        }

        if (!resposta.ok) {
            throw new Error('Não foi possível carregar seus favoritos.');
        }

        const favoritos = await resposta.json();

        if (!Array.isArray(favoritos)) {
            throw new Error('Formato de favoritos inválido.');
        }

        return favoritos;
    }

    async function alternar(produtoId, favoritado) {
        const resposta = await fetch(
            `${apiBase}/api/favoritos/${encodeURIComponent(produtoId)}`,
            {
                method: favoritado ? 'DELETE' : 'POST',
                credentials: 'include'
            }
        );

        if (resposta.status === 401) {
            window.location.href = loginUrl.href;
            return null;
        }

        if (!resposta.ok) {
            let mensagem = 'Não foi possível atualizar seus favoritos.';

            try {
                const dados = await resposta.json();
                mensagem = dados.mensagem || dados.erro || mensagem;
            } catch (erro) {
                console.error('Não foi possível ler o erro dos favoritos.', erro);
            }

            throw new Error(mensagem);
        }

        return !favoritado;
    }

    window.LumiereFavoritos = { listar, alternar };
})();
