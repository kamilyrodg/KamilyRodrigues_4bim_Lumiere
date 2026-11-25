CREATE TABLE IF NOT EXISTS solicitacoes_manutencao (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id) ON DELETE CASCADE,
    modelo_camera VARCHAR(150) NOT NULL,
    tipo_servico VARCHAR(100) NOT NULL
        CHECK (tipo_servico IN (
            'Limpeza interna e externa',
            'Limpeza de lente',
            'Avaliação do obturador',
            'Manutenção preventiva',
            'Avaliação do sistema de avanço do filme',
            'Avaliação técnica geral'
        )),
    agencia VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    criada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
