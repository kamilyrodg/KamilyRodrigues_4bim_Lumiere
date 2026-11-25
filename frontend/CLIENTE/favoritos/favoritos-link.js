const linkFavoritos = document.querySelector('[data-favorites-link]');

if (linkFavoritos) {
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
    const favoritosUrl = new URL('index.html?mostrarFavoritos=1', siteRoot);

    linkFavoritos.href = favoritosUrl.href;
    linkFavoritos.addEventListener('click', async event => {
        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        event.preventDefault();

        try {
            const response = await fetch(`${apiBase}/api/autenticacao/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = favoritosUrl.href;
                return;
            }

            if (response.status === 401) {
                window.location.href = loginUrl.href;
                return;
            }

            throw new Error('Não foi possível verificar sua sessão.');
        } catch (error) {
            console.error('Não foi possível verificar a sessão dos favoritos.', error);
            window.alert(
                'Não foi possível verificar sua sessão. Confira se o servidor está funcionando e tente novamente.'
            );
        }
    });
}
