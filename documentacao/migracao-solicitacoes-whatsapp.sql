BEGIN;

CREATE TABLE IF NOT EXISTS solicitacoes_servico (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endereco_id INTEGER REFERENCES enderecos(id) ON DELETE SET NULL,
    tipo_servico VARCHAR(30) NOT NULL
        CHECK (tipo_servico IN ('manutencao', 'revelacao', 'digitalizacao')),
    servico_escolhido VARCHAR(150) NOT NULL,
    nome_endereco VARCHAR(50) NOT NULL,
    endereco TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'solicitado'
        CHECK (status IN ('solicitado', 'em_atendimento', 'concluido', 'cancelado')),
    criada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS solicitacoes_servico_criada_em_idx
    ON solicitacoes_servico (criada_em DESC, id DESC);

COMMIT;
