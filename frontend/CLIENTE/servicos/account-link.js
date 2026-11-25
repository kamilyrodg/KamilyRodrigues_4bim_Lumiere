const accountLink = document.querySelector('[data-account-link]');

if (accountLink) {
    const apiBase = (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') &&
        window.location.port !== '3000'
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : '';
    const siteRoot = new URL('../../../', window.location.href);

    accountLink.href = new URL('frontend/CLIENTE/login/login.html', siteRoot).href;

    accountLink.addEventListener('click', async event => {
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
        accountLink.setAttribute('aria-busy', 'true');

        try {
            const response = await fetch(`${apiBase}/api/autenticacao/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = new URL(
                    'frontend/CLIENTE/minha-conta/minha-conta.html',
                    siteRoot
                ).href;
                return;
            }

            if (response.status === 401) {
                window.location.href = accountLink.href;
                return;
            }

            throw new Error('Não foi possível verificar sua sessão.');
        } catch (error) {
            console.error('Não foi possível verificar a sessão da conta.', error);
            window.alert(
                'Não foi possível verificar sua sessão. Confira se o servidor está funcionando e tente novamente.'
            );
        } finally {
            accountLink.removeAttribute('aria-busy');
        }
    });
}
