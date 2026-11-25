const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();

const origensPermitidas = (process.env.FRONTEND_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map(origem => origem.trim());

function origemLocalDeDesenvolvimento(origem) {
    if (process.env.NODE_ENV === 'production') {
        return false;
    }

    try {
        const url = new URL(origem);

        return url.protocol === 'http:' &&
            (
                url.hostname === 'localhost' ||
                url.hostname === '127.0.0.1'
            );
    } catch {
        return false;
    }
}

// CORS
app.use(cors({
    origin: (origem, callback) => {
        if (
            !origem ||
            origensPermitidas.includes(origem) ||
            origemLocalDeDesenvolvimento(origem)
        ) {
            return callback(null, true);
        }

        return callback(new Error('Origem não permitida pelo CORS.'));
    },
    credentials: true
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/img', express.static(path.join(__dirname, '../img')));

// Rotas da API
app.use('/api/autenticacao', require('./CLIENTE/routes/autenticacaoRoutes'));
app.use('/api/cameras', require('./CLIENTE/routes/camerasRoutes'));
app.use('/api/filmes', require('./CLIENTE/routes/filmesRoutes'));
app.use('/api/lentes', require('./CLIENTE/routes/lentesRoutes'));
app.use('/api/kits', require('./CLIENTE/routes/kitsRoutes'))
app.use('/api/favoritos', require('./CLIENTE/routes/favoritosRoutes'));
app.use('/api/finalizar-compra', require('./CLIENTE/routes/finalizarCompraRoutes'));
app.use('/api/enderecos', require('./CLIENTE/routes/enderecosRoutes'));

// Página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Teste da API
app.get('/api', (req, res) => {
    res.status(200).json({
        mensagem: 'API da LUMIÈRE funcionando!'
    });
});

// Teste da conexão com o banco de dados
app.get('/api/teste-banco', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW()');

        res.status(200).json({
            mensagem: 'Conexão com o banco estabelecida!',
            horario: resultado.rows[0].now
        });
    } catch (erro) {
        console.error('Erro ao testar o banco de dados:', erro);

        res.status(500).json({
            erro: 'Não foi possível conectar ao banco de dados.'
        });
    }
});

// Tratamento de rotas inexistentes da API
app.use('/api', (req, res) => {
    res.status(404).json({
        mensagem: 'Rota da API não encontrada.'
    });
});

// Tratamento de erros
app.use((erro, req, res, next) => {
    console.error('Erro no servidor:', erro.message);

    if (res.headersSent) {
        return next(erro);
    }

    res.status(500).json({
        mensagem: 'Ocorreu um erro interno no servidor.'
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        await pool.query('SELECT 1');

        app.listen(PORT, () => {
            console.log(`Servidor LUMIÈRE rodando na porta ${PORT}`);
            console.log(`Site: http://localhost:${PORT}`);
            console.log(`API: http://localhost:${PORT}/api`);
            console.log(`Câmeras: http://localhost:${PORT}/api/cameras`);
            console.log(`Lentes: http://localhost:${PORT}/api/lentes`);
        });
    } catch (erro) {
        console.error(
            'Não foi possível iniciar o servidor. Verifique a conexão e a configuração do banco de dados.',
            erro
        );

        process.exitCode = 1;
    }
}

iniciarServidor();