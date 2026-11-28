-- Este arquivo recria o banco e apaga os dados existentes.
-- O bloco abaixo interrompe a execução antes do DROP se encontrar registros.
BEGIN;

DO $$
DECLARE
    tabela TEXT;
    possui_dados BOOLEAN;
BEGIN
    FOREACH tabela IN ARRAY ARRAY[
        'sessoes', 'clientes', 'funcionarios', 'gerentes', 'enderecos',
        'solicitacoes_servico',
        'categorias', 'produtos', 'filmes', 'caracteristicas_filme',
        'filme_caracteristicas', 'caracteristicas_lente',
        'lente_caracteristicas', 'kits_produto', 'servicos', 'carrinhos',
        'itens_carrinho', 'favoritos', 'formas_pagamento', 'pedidos',
        'itens_pedido', 'usuarios'
    ] LOOP
        IF to_regclass(format('%I.%I', current_schema(), tabela)) IS NOT NULL THEN
            EXECUTE format(
                'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
                current_schema(), tabela
            );

            EXECUTE format(
                'SELECT EXISTS (SELECT 1 FROM %I.%I LIMIT 1)',
                current_schema(), tabela
            ) INTO possui_dados;

            IF possui_dados THEN
                RAISE EXCEPTION
                    'Execução cancelada: a tabela % contém dados. Faça backup ou use uma migração que preserve os dados.',
                    tabela;
            END IF;
        END IF;
    END LOOP;
END;
$$;

DROP TABLE IF EXISTS
    sessoes,
    clientes,
    funcionarios,
    gerentes,
    enderecos,
    solicitacoes_servico,
    categorias,
    produtos,
    filmes,
    caracteristicas_filme,
    filme_caracteristicas,
    caracteristicas_lente,
    lente_caracteristicas,
    kits_produto,
    servicos,
    carrinhos,
    itens_carrinho,
    favoritos,
    formas_pagamento,
    pedidos,
    itens_pedido,
    usuarios
CASCADE;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(10) NOT NULL DEFAULT 'cliente',
    CHECK (tipo IN ('cliente', 'gerente'))
);

CREATE TABLE IF NOT EXISTS sessoes (
    token_hash CHAR(64) PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_em TIMESTAMPTZ NOT NULL,
    criada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    usuario_id INTEGER PRIMARY KEY
        REFERENCES usuarios(id) ON DELETE CASCADE,

    telefone VARCHAR(20),

    data_cadastro DATE NOT NULL DEFAULT CURRENT_DATE,

    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO clientes (usuario_id)
SELECT id
FROM usuarios
WHERE tipo = 'cliente'
ON CONFLICT (usuario_id) DO NOTHING;

CREATE OR REPLACE FUNCTION criar_registro_cliente()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'cliente' THEN
        INSERT INTO clientes (usuario_id)
        VALUES (NEW.id)
        ON CONFLICT (usuario_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_criar_cliente
AFTER INSERT ON usuarios
FOR EACH ROW
EXECUTE FUNCTION criar_registro_cliente();

CREATE TABLE gerentes (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id)
);

CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,

    nome VARCHAR(150) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    telefone VARCHAR(20),

    cargo VARCHAR(100) NOT NULL,

    data_cadastro DATE NOT NULL DEFAULT CURRENT_DATE,

    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE enderecos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    nome_endereco VARCHAR(50) NOT NULL,
    endereco TEXT NOT NULL
);

CREATE TABLE solicitacoes_servico (
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

CREATE INDEX solicitacoes_servico_criada_em_idx
    ON solicitacoes_servico (criada_em DESC, id DESC);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
	preco_pix NUMERIC(10,2) NOT NULL CHECK (preco_pix >=0),
    imagem VARCHAR(255)
);

CREATE TABLE filmes (
    produto_id INTEGER PRIMARY KEY REFERENCES produtos(id),
    iso INTEGER CHECK (iso IS NULL OR iso > 0),
    quantidade_poses INTEGER
        CHECK (quantidade_poses IS NULL OR quantidade_poses > 0)
);

CREATE TABLE caracteristicas_filme (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE filme_caracteristicas (
    filme_id INTEGER NOT NULL REFERENCES filmes(produto_id),
    caracteristica_id INTEGER NOT NULL
        REFERENCES caracteristicas_filme(id),
    PRIMARY KEY (filme_id, caracteristica_id)
);

CREATE TABLE caracteristicas_lente (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

CREATE TABLE lente_caracteristicas (
    lente_id INTEGER NOT NULL REFERENCES produtos(id),
    caracteristica_id INTEGER NOT NULL REFERENCES caracteristicas_lente(id),
    PRIMARY KEY (lente_id, caracteristica_id)
);

CREATE TABLE kits_produto (
    kit_id INTEGER NOT NULL REFERENCES produtos(id),
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    PRIMARY KEY (kit_id, produto_id),
    CHECK (kit_id <> produto_id)
);

CREATE TABLE servicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    imagem VARCHAR(255)
);

CREATE TABLE carrinhos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id)
);

CREATE TABLE itens_carrinho (
    id SERIAL PRIMARY KEY,
    carrinho_id INTEGER NOT NULL REFERENCES carrinhos(id),
    produto_id INTEGER REFERENCES produtos(id),
    servico_id INTEGER REFERENCES servicos(id),
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    CHECK (
        (produto_id IS NOT NULL AND servico_id IS NULL)
        OR
        (produto_id IS NULL AND servico_id IS NOT NULL)
    )
);

CREATE TABLE favoritos (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    PRIMARY KEY (usuario_id, produto_id)
);

CREATE TABLE formas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    endereco_id INTEGER NOT NULL REFERENCES enderecos(id),
    forma_pagamento_id INTEGER NOT NULL
        REFERENCES formas_pagamento(id),
    data_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status_pedido VARCHAR(30) NOT NULL DEFAULT 'recebido'
        CHECK (status_pedido IN (
            'recebido',
            'confirmado',
            'em_preparacao',
            'enviado',
            'cancelado'
        )),

    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (valor_total >= 0),

    status_pagamento VARCHAR(30) NOT NULL DEFAULT 'aguardando_pagamento',
    pix_txid VARCHAR(25) UNIQUE
);

CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
    produto_id INTEGER REFERENCES produtos(id),
    servico_id INTEGER REFERENCES servicos(id),
    nome_item VARCHAR(150) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL
        CHECK (preco_unitario >= 0),
    CHECK (
        (produto_id IS NOT NULL AND servico_id IS NULL)
        OR
        (produto_id IS NULL AND servico_id IS NOT NULL)
    )
);

INSERT INTO categorias VALUES
(1, 'Câmeras Analógicas'),
(2, 'Câmeras Digitais'),
(3, 'Filmes'),
(4, 'Lentes'),
(5, 'Kits');

INSERT INTO caracteristicas_filme VALUES
(6, 'Colorido'),
(7, 'Preto e branco'),
(8, 'Efeito retrô'),
(9, 'Instantâneo');

INSERT INTO caracteristicas_lente (id, nome) VALUES
(1, 'Fixa'),
(2, 'Zoom'),
(3, 'Grande angular'),
(4, 'Teleobjetiva'),
(5, 'Macro'),
(6, 'Retrato');

INSERT INTO formas_pagamento VALUES
(10, 'Pix'),
(11, 'Cartão de crédito'),
(12, 'Cartão de débito'),
(13, 'Boleto');


INSERT INTO produtos VALUES
(1, 1, 'Câmera 35mm - Nikon FM (9/10)', 2190.00, 2058.00, './img/CLIENTE/cameras/Câmera 35mm - Nikon FM (910).webp'),
(2, 1, 'Câmera 35mm - Canon Prima Quick Super (9/10)', 2549.90, 2529.90, './img/CLIENTE/cameras/Câmera 35mm - Canon Prima Quick Super (910).webp'),
(3, 1, 'Câmera 35mm - Olympus 35SP', 2190.00, 2058.60, './img/CLIENTE/cameras/Câmera 35mm - Olympus 35SP.webp'),
(4, 1, 'Câmera 35mm - Pentax K1000', 1615.90, 1500.70, './img/CLIENTE/cameras/Câmera 35mm - Pentax K1000.png'),
(5, 1, 'Câmera 35mm - Nikon Lite Touch Zoom 130 ED (9.4/10)', 1390.80, 1290.00, './img/CLIENTE/cameras/Câmera 35mm - Nikon Lite Touch Zoom 130 ED (9.410).webp'),
(6, 1, 'Câmera 35mm - Kodak Ultra F9 (9.5/10)', 1050.90, 1000.45, './img/CLIENTE/cameras/Câmera 35mm - Kodak Ultra F9 (9.510).webp'),
(7, 1, 'Câmera 35mm - Canon EOS 630', 1750.00, 1600.00, './img/CLIENTE/cameras/Câmera 35mm - Canon EOS 630.webp'),
(8, 1, 'Câmera 35mm - Olympus IZM220 Zomm Panorama', 1050.00, 1000.30, './img/CLIENTE/cameras/Câmera 35mm - Olympus IZM220 Zomm Panorama.webp'),
(9, 1, 'Câmera 35mm - Olympus Stylus MJU 115', 1120.00, 1118.70, './img/CLIENTE/cameras/Câmera 35mm - Olympus Stylus MJU 115.webp'),
(10, 1, 'Câmera 35mm - Olympus Pen EE3', 1080.50, 1065.75, './img/CLIENTE/cameras/Câmera 35mm - Olympus Pen EE3.png'),
(11, 1, 'Câmera 35mm - Yashica MG - Motor Direct Flash Champagne (7/10)', 1300.45, 1250.00, './img/CLIENTE/cameras/Câmera 35mm - Yashica MG - Motor Direct Flash Champagne (710).webp'),
(12, 1, 'Câmera 35mm - Yashica Minister III', 1400.00, 1380.50, './img/CLIENTE/cameras/Câmera 35mm - Yashica Minister III.webp'),
(13, 1, 'Câmera 35mm - Tron BV 100 (9.5/10)', 1200.50, 1185.900, './img/CLIENTE/cameras/Câmera 35mm - Tron BV 100 (9.510).webp'),
(14, 1, 'Câmera 35mm - Samsung Fini 1050XL (9.5/10)', 1050.76, 1020.67, './img/CLIENTE/cameras/Câmera 35mm - Samsung Fini 1050XL (9.510).webp'),
(15, 1, 'Câmera 35mm - Mirax Z-60W', 1500.00, 1450.00, './img/CLIENTE/cameras/Câmera 35mm - Mirax Z-60W.webp');

INSERT INTO produtos VALUES
(16, 2, 'Câmera Digital Nikon D7500', 5790.00, 5500.90, './img/CLIENTE/cameras/Câmera Digital Nikon D7500.webp'),
(17, 2, 'Câmera Digital Fujifilm X-M5', 3800.90, 3790.40, './img/CLIENTE/cameras/Câmera Digital Fujifilm X-M5.webp'),
(18, 2, 'Câmera Digital Canon EOS Rebel SL3 18-55mm IS STM', 5920.00, 5600.50, './img/CLIENTE/cameras/Câmera Digital Canon EOS Rebel SL3 18-55mm IS STM.webp'),
(19, 2, 'Câmera Digital Nikon D800 (99.000 disparos)', 5200.00, 5108.00, './img/CLIENTE/cameras/Câmera Digital Nikon D800 (99.000 disparos).jpg'),
(20, 2, 'Câmera Digital Sony Alpha 900 com objetiva 50mm', 4100.00, 4055.60, './img/CLIENTE/cameras/Câmera Digital Sony Alpha 900 com objetiva 50mm.webp'),
(21, 2, 'Câmera Digital Panasonic DC-G100D com 12-32mm', 3400.70, 3270.50, './img/CLIENTE/cameras/Câmera Digital Panasonic DC-G100D com 12-32mm.webp'),
(22, 2, 'Câmera Digital Nikon Z6 (54.000 disparos)', 3860.90, 3560.80, './img/CLIENTE/cameras/Câmera Digital Nikon Z6 (54.000 disparos).jpg'),
(23, 2, 'Câmera Canon EOS Rebel T7+', 4150.90, 4000.60, './img/CLIENTE/cameras/Câmera Canon EOS Rebel T7+.webp'),
(24, 2, 'Câmera Digital Canon EOS 5D Mark II (31.100 disparos)', 3040.90, 2990.60, './img/CLIENTE/cameras/Câmera Digital Canon EOS 5D Mark II (31.100 disparos).webp'),
(25, 2, 'Câmera Digital Minox DCC 5.1', 2100.80, 2080.00, './img/CLIENTE/cameras/Câmera Digital Minox DCC 5.1.jpg'),
(26, 2, 'Câmera Nikon D850 (52.100 disparos)', 5900.00, 5750.80, './img/CLIENTE/cameras/Câmera Nikon D850 (52.100 disparos).webp'), 
(27, 2, 'Câmera Digital EOS R100', 4619.00, 4390.90, './img/CLIENTE/cameras/Câmera Digital EOS R100.webp'),
(28, 2, 'Câmera Digital Kodak PixPro FZ55', 2025.00, 1959.00, './img/CLIENTE/cameras/Câmera Digital Kodak PixPro FZ55.webp'),
(29, 2, 'Câmera Canon EOS R50V IS STM', 4800.00, 4600.60, './img/CLIENTE/cameras/Câmera Canon EOS R50V IS STM.webp'),
(30, 2, 'Câmera Digital Sony ZV-E10 Mark II', 6890.90, 6700.80, './img/CLIENTE/cameras/Câmera Digital Sony ZV-E10 Mark II.webp');

INSERT INTO produtos VALUES
(31, 3, 'Filme Kodak gold 200 35mm', 150.00, 150.00, './img/CLIENTE/filmes/Filme Kodak gold 200 35mm.jpg'),
(32, 3, 'Filme Kodak ColorPlus 200 35mm', 180.00, 180.00, './img/CLIENTE/filmes/Filme Kodak ColorPlus 200 35mm.jpg'),
(33, 3, 'Filme Kodak UltraMax 400 35mm', 165.00, 165.00, './img/CLIENTE/filmes/Filme Kodak UltraMax 400 35mm.jpg'),
(34, 3, 'Filme Kodak Portra 400 35mm', 300.00, 300.00, './img/CLIENTE/filmes/Filme Kodak Portra 400 35mm.jpg'),
(35, 3, 'Filme Kodak Ektar 100 35mm', 160.00, 160.00, './img/CLIENTE/filmes/Filme Kodak Ektar 100 35mm.jpg'),
(36, 3, 'Filme Fujifilm 200 35mm', 150.00, 150.00, './img/CLIENTE/filmes/Filme Fujifilm 200 35mm.jpg'),
(37, 3, 'Filme Lomography Color Negative 400 35mm', 80.00, 80.00, './img/CLIENTE/filmes/Filme Lomography Color Negative 400 35mm.jpg'),
(38, 3, 'Filme CineStill 400D 35mm', 150.00, 150.00, './img/CLIENTE/filmes/Filme CineStill 400D 35mm.jpg'),
(39, 3, 'Filme Portra 160 35mm', 250.00, 250.00, './img/CLIENTE/filmes/Filme Portra 160 35mm.jpg'),
(40, 3, 'Filme Kodak Pro Image 100 35mm', 130.00, 130.00, './img/CLIENTE/filmes/Filme Kodak Pro Image 1<PASSWORD>mm.jpg'),

(41, 3, 'Filme Kodak Tri-X 400 35mm', 140.00, 140.00, './img/CLIENTE/filmes/Filme Kodak Tri-X 400 35mm.jpg'),
(42, 3, 'Filme Ilford HP5 Plus 400 35mm', 150.00, 150.00, './img/CLIENTE/filmes/Filme Ilford HP5 Plus 400 35mm.jpg'),
(43, 3, 'Filme Ilford FP4 Plus 125 35mm', 70.00, 70.00, './img/CLIENTE/filmes/Filme Ilford FP4 Plus 125 35mm.jpg'),
(44, 3, 'Filme Ilford IPAN F Plus 50 35mm', 150.00, 150.00, './img/CLIENTE/filmes/Filme Ilford IPAN F Plus 50 35mm.jpg'),
(45, 3, 'Filme Ilford Delta 100 35mm', 250.00, 250.00, './img/CLIENTE/filmes/Filme Ilford Delta 100 35mm.jpg'),
(46, 3, 'Ilford Delta 400 35mm', 700.00, 700.00, './img/CLIENTE/filmes/Ilford Delta 400 35mm.jpg'),
(47, 3, 'Ilford Delta 3200 35mm', 170.00, 170.00, './img/CLIENTE/filmes/Ilford Delta 3200 35mm.jpg'),
(48, 3, 'Filme Kentmere Pan 100 35mm', 120.00, 120.00, './img/CLIENTE/filmes/Filme Kentmere Pan 100 35mm.jpg'),
(49, 3, 'Kentmere Pan 400 35mm', 100.00, 100.00, './img/CLIENTE/filmes/Kentmere Pan 400 35mm.jpg'),
(50, 3, 'Filme Fomapan 400 Action 35mm', 100.00, 100.00, './img/CLIENTE/filmes/Filme Fomapan 4<PASSWORD> Action <PASSWORD>mm.jpg'),

(51, 3, 'Filme Lomography Redscale XR 35mm', 220.00, 220.00, './img/CLIENTE/filmes/Filme Lomography Redscale XR 35mm.jpg'),
(52, 3, 'Filme Lomography Metropolis 35mm', 250.00, 250.00, './img/CLIENTE/filmes/Filme Lomography Metropolis 35mm.jpg'),
(53, 3, 'Filme Lomography Color 35mm', 180.00, 180.00, './img/CLIENTE/filmes/Filme Lomography Color 35mm.jpg'),
(54, 3, 'Filme Lomography LomoChrome Purple 35mm', 140.00, 140.00, './img/CLIENTE/filmes/Filme Lomography LomoChrome Purple 35mm.jpg'),
(55, 3, 'Filme Lomography Turquoise 35mm', 200.00, 200.00, './img/CLIENTE/filmes/Filme Lomography Turquoise 35mm.jpg'),
(56, 3, 'Filme Lomography Berlin Kino 35mm', 100.00, 100.00, './img/CLIENTE/filmes/Filme Lomography Berlin Kino 35mm.jpg'),
(57, 3, 'Filme Lomography Potsdam Kino 35mm', 60.00, 60.00, './img/CLIENTE/filmes/Filme Lomography Potsdam Kino 35mm.jpg'),
(58, 3, 'Filme Lomography Fantôme Kino 35mm', 90.00, 90.00, './img/CLIENTE/filmes/Filme Lomography Fantôme Kino 35mm.jpg'),
(59, 3, 'Filme CineStill 800T 35mm', 195.00, 195.00, './img/CLIENTE/filmes/Filme CineStill 800T 35mm.jpg'),
(60, 3, 'Filme Lomography Earl Grey 800 35mm', 250.00, 250.00, './img/CLIENTE/filmes/Filme Lomography Earl Grey 800 35mm.jpg'),

(61, 3, 'Filme Fujifilm Instax Mini Color', 120.00, 120.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Color.jpg'),
(62, 3, 'Filme Fujifilm Instax Mini Color - Pacote duplo', 500.00, 500.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Color - Pacote duplo.jpg'),
(63, 3, 'Filme Fujifilm Instax Mini Monochrome', 80.00, 80.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Monochrome.jpg'),
(64, 3, 'Filme Fujifilm Instax Mini Contact Sheet', 70.00, 70.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Contact Sheet.jpg'),
(65, 3, 'Filme Fujfilm Instax Square Color', 100.00, 100.00, './img/CLIENTE/filmes/Filme Fujfilm Instax Square Color.jpg'),
(66, 3, 'Filme Fujifilm Instax Square Monochrome', 100.00, 100.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Square Monochrome.jpg'),
(67, 3, 'Filme Fujifilm Instax Wide Color', 120.00, 120.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Wide Color.jpg'),
(68, 3, 'Filme Fujifilm Instax Wide Monochrome', 120.00, 120.00, './img/CLIENTE/filmes/Filme Fujifilm Instax Wide Monochrome.jpg'),
(69, 3, 'Filme Polaroid Originals Color i-Type', 240.00, 240.00, './img/CLIENTE/filmes/Filme Polaroid Originals Color i-Type.jpg'),
(70, 3, 'Filme Polaroid Originals B&W i-Type', 140.00, 140.00, './img/CLIENTE/filmes/Filme Polaroid Originals B&W i-Type.jpg');

INSERT INTO filmes VALUES
(31, 200, 36),
(32, 200, 36),
(33, 400, 36),
(34, 400, 36),
(35, 100, 36),
(36, 200, 36),
(37, 400, 36),
(38, 400, 36),
(39, 160, 36),
(40, 100, 36),

(41, 400, 36),
(42, 400, 36),
(43, 125, 36),
(44, 50, 36),
(45, 100, 36),
(46, 400, 36),
(47, 3200, 36),
(48, 100, 36),
(49, 400, 36),
(50, 400, 36),

(51, 100, 36),
(52, 100, 36),
(53, 400, 36),
(54, 400, 36),
(55, 400, 36),
(56, 400, 36),
(57, 100, 36),
(58, 8, 36),
(59, 13, 36),
(60, 800, 36),

(61, NULL, 10),
(62, NULL, 20),
(63, NULL, 10),
(64, NULL, 10),
(65, NULL, 10),
(66, NULL, 10),
(67, NULL, 10),
(68, NULL, 10),
(69, NULL, 8),
(70, NULL, 8);

INSERT INTO filme_caracteristicas VALUES
(31, 6),
(32, 6),
(33, 6),
(34, 6),
(35, 6),
(36, 6),
(37, 6),
(38, 6),
(39, 6),
(40, 6),

(41, 7),
(42, 7),
(43, 7),
(44, 7),
(45, 7),
(46, 7),
(47, 7),
(48, 7),
(49, 7),
(50, 7),

(51, 8),
(52, 8),
(53, 8),
(54, 8),
(55, 8),
(56, 8),
(57, 8),
(58, 8),
(59, 8),
(60, 8),

(61, 9),
(62, 9),
(63, 9),
(64, 9),
(65, 9),
(66, 9),
(67, 9),
(68, 9),
(69, 9),
(70, 9);

INSERT INTO produtos VALUES

(71, 4, 'Canon EF 50mm f/1.8 STM', 850.00, 850.00, './img/CLIENTE/lentes/Canon EF 50mm f1.8 STM.jpg'),
(72, 4, 'Canon EF 24-105mm f/4L IS', 1050.00, 1050.00, './img/CLIENTE/index/lentes.jpg'),
(73, 4, 'Sony FE 50mm f/1.8', 1450.00, 1450.00, './img/CLIENTE/lentes/Sony FE 50mm f1.8.jpg'),
(74, 4, 'Fujifilm XF 35mm f/2 R WR', 2800.00, 2800.00, './img/CLIENTE/lentes/Fujifilm XF 35mm f2 R WR.jpg'),
(75, 4, 'Sigma 30mm f/1.4 DC DN', 2100.00, 2100.00, './img/CLIENTE/lentes/Sigma 30mm f1.4 DC DN.jpg'),
(76, 4, 'Canon EF-S 24mm f/2.8 STM', 950.00, 950.00, './img/CLIENTE/lentes/Canon EF-S 24mm f2.8 STM.jpg'),
(77, 4, 'Nikon AF-P DX 10-20mm f/4.5-5.6G VR', 1900.00, 1900.00, './img/CLIENTE/lentes/Nikon AF-P DX 10-20mm f4.5-5.6G VR.jpg'),
(78, 4, 'Canon RF 16mm f/2.8 STM', 1650.00, 1650.00, './img/CLIENTE/lentes/Canon RF 16mm f2.8 STM.jpg'),
(79, 4, 'Sony E 10-18mm f/4 OSS', 3200.00, 3200.00, './img/CLIENTE/lentes/Sony E 10-18mm f4 OSS.jpg'),
(80, 4, 'Tamron 17-70mm f/2.8 Di III-A VC RXD', 4500.00, 4500.00, './img/CLIENTE/lentes/Tamron 17-70mm f2.8 Di III-A VC RXD.jpg'),
(81, 4, 'Canon EF 70-200mm f/4L USM', 3800.00, 3800.00, './img/CLIENTE/lentes/Canon EF 70-200mm f4L USM.jpg'),
(82, 4, 'Nikon AF-S 70-300mm f/4.5-5.6G VR', 2400.00, 2400.00, './img/CLIENTE/lentes/Nikon AF-S 70-300mm f4.5-5.6G VR.jpg'),
(83, 4, 'Sony FE 70-200mm f/4 G OSS', 6500.00, 6500.00, './img/CLIENTE/lentes/Sony FE 70-200mm f4 G OSS.jpg'),
(84, 4, 'Sigma 150-600mm f/5-6.3 DG OS HSM Contemporary', 6900.00, 6900.00, './img/CLIENTE/lentes/Sigma 150-600mm f5-6.3 DG OS HSM Contemporary.jpg'),
(85, 4, 'Canon EF 100mm f/2.8 Macro USM', 3100.00, 3100.00, './img/CLIENTE/lentes/Canon EF 100mm f2.8 Macro USM.jpg'),
(86, 4, 'Nikon AF-S Micro 105mm f/2.8G VR', 4300.00, 4300.00, './img/CLIENTE/lentes/Nikon AF-S Micro 105mm f2.8G VR.jpg'),
(87, 4, 'Sigma 105mm f/2.8 DG DN Macro Art', 5200.00, 5200.00, './img/CLIENTE/lentes/Sigma 105mm f2.8 DG DN Macro Art.jpg'),
(88, 4, 'Canon EF 85mm f/1.8 USM', 1900.00, 1900.00, './img/CLIENTE/lentes/Canon EF 85mm f1.8 USM.jpg'),
(89, 4, 'Nikon AF-S 85mm f/1.8G', 2300.00, 2300.00, './img/CLIENTE/lentes/Nikon AF-S 85mm f1.8G.jpg'),
(90, 4, 'Fujifilm XF 56mm f/1.2 R', 4800.00, 4800.00, './img/CLIENTE/lentes/Fujifilm XF 56mm f1.2 R.jpg');

INSERT INTO lente_caracteristicas (lente_id, caracteristica_id) VALUES
(71, 1),
(71, 6),
(72, 2),
(73, 1),
(73, 6),
(74, 1),
(74, 6),
(75, 1),
(76, 1),
(76, 3),
(77, 2),
(77, 3),
(78, 1),
(78, 3),
(79, 2),
(79, 3),
(80, 2),
(81, 2),
(81, 4),
(82, 2),
(82, 4),
(83, 2),
(83, 4),
(84, 2),
(84, 4),
(85, 1),
(85, 5),
(86, 1),
(86, 5),
(87, 1),
(87, 5),
(88, 1),
(88, 6),
(89, 1),
(89, 6),
(90, 1),
(90, 6);


INSERT INTO produtos
(id, categoria_id, nome, preco, preco_pix, imagem)
VALUES
(91, 5, 'Kit Analógico Essencial', 1149.90, 1099.90, './img/kits/kit-analogico-essencial.jpg'),
(92, 5, 'Kit Analógico Preto e Branco', 2249.90, 2190.00, './img/kits/kit-analogico-preto-branco.jpg'),
(93, 5, 'Kit Analógico Criativo', 1179.90, 1149.90, './img/kits/kit-analogico-criativo.jpg'),
(94, 5, 'Kit Digital Criador de Conteúdo', 7990.00, 7790.00, './img/kits/kit-digital-criador.jpg'),
(95, 5, 'Kit Digital Fotografia e Retrato', 6590.00, 6390.00, './img/kits/kit-digital-retrato.jpg'),
(96, 5, 'Kit Experimentação de Filmes', 419.90, 399.90, './img/kits/kit-experimentacao-filmes.jpg');

INSERT INTO kits_produto (kit_id, produto_id, quantidade)
VALUES
(91, 6, 1),
(91, 31, 1),

(92, 1, 1),
(92, 42, 1),

(93, 10, 1),
(93, 54, 1),

(94, 30, 1),
(94, 73, 1),

(95, 18, 1),
(95, 76, 1),

(96, 31, 1),
(96, 42, 1),
(96, 54, 1);

UPDATE produtos
SET imagem = CASE id
    WHEN 31 THEN './img/CLIENTE/filmes/Filme Kodak gold 200 35mm.png'
    WHEN 32 THEN './img/CLIENTE/filmes/Filme Kodak ColorPlus 200 35mm.png'
    WHEN 33 THEN './img/CLIENTE/filmes/Filme Kodak UltraMax 400 35mm.png'
    WHEN 34 THEN './img/CLIENTE/filmes/Filme Kodak Portra 400 35mm.png'
    WHEN 35 THEN './img/CLIENTE/filmes/Filme Kodak Ektar 100 35mm.png'
    WHEN 36 THEN './img/CLIENTE/filmes/Filme Fujifilm 200 35mm.png'
    WHEN 37 THEN './img/CLIENTE/filmes/Filme Lomography Color Negative 400 35mm.png'
    WHEN 38 THEN './img/CLIENTE/filmes/Filme CineStill 400D 35mm.png'
    WHEN 39 THEN './img/CLIENTE/filmes/Filme Portra 16 35mm.png'
    WHEN 40 THEN './img/CLIENTE/filmes/Filme Kodak Pro Image 100 35mm.png'
    WHEN 41 THEN './img/CLIENTE/filmes/Filme Kodak Tri-X 400 35mm.png'
    WHEN 42 THEN './img/CLIENTE/filmes/Filme Ilford HP5 Plus 400 35mm.png'
    WHEN 43 THEN './img/CLIENTE/filmes/Filme Ilford FP4 Plus 125 35mm.png'
    WHEN 44 THEN './img/CLIENTE/filmes/Ilfors IPAN F Plus 50 35mm.png'
    WHEN 45 THEN './img/CLIENTE/filmes/Ilford Delta 100 35mm.png'
    WHEN 46 THEN './img/CLIENTE/filmes/Ilford Delta 400 35mm.png'
    WHEN 47 THEN './img/CLIENTE/filmes/Ilford Delta 3200 35mm.png'
    WHEN 48 THEN './img/CLIENTE/filmes/Filme Kentmere Pan 100 35mm.png'
    WHEN 49 THEN './img/CLIENTE/filmes/Kentmere Pan 400 35mm.png'
    WHEN 50 THEN './img/CLIENTE/filmes/Filme Fomapan 400 Action 35mm.png'
    WHEN 51 THEN './img/CLIENTE/filmes/Filme Lomography Redscale XR 35mm.png'
    WHEN 52 THEN './img/CLIENTE/filmes/Filme Lomography Metropolis 35mm.png'
    WHEN 53 THEN './img/CLIENTE/filmes/Filme Lomography Color 92 35mm.png'
    WHEN 54 THEN './img/CLIENTE/filmes/Filme Lomography Purple 35mm.png'
    WHEN 55 THEN './img/CLIENTE/filmes/Filme Lomography Turquoise 35mm.png'
    WHEN 56 THEN './img/CLIENTE/filmes/Filme Lomography Berlin Kino 35mm.png'
    WHEN 57 THEN './img/CLIENTE/filmes/Filme Lomography Potsdam Kino 35mm.png'
    WHEN 58 THEN './img/CLIENTE/filmes/Filme Lomography Fantôme Kino 35mm.png'
    WHEN 59 THEN './img/CLIENTE/filmes/Filme CineStill 800T 35mm.png'
    WHEN 60 THEN './img/CLIENTE/index/filme.jpg'
    WHEN 61 THEN './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Color.png'
    WHEN 62 THEN './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Color - Pacote duplo.png'
    WHEN 63 THEN './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Monochrome.png'
    WHEN 64 THEN './img/CLIENTE/filmes/Filme Fujifilm Instax Mini Contact Sheet.png'
    WHEN 65 THEN './img/CLIENTE/filmes/Filme Fujfilm Instax Square Color.png'
    WHEN 66 THEN './img/CLIENTE/filmes/Filme Fujfilm Instax Square monochrome.png'
    WHEN 67 THEN './img/CLIENTE/filmes/Filme Fujifilm Instax Wide Color.png'
    WHEN 68 THEN './img/CLIENTE/filmes/Filme Fujifilm Instax Wide Monochrome.png'
    WHEN 69 THEN './img/CLIENTE/filmes/Filme Polaroid Color i-Type.png'
    WHEN 70 THEN './img/CLIENTE/filmes/Filme Polaroid B&W i-Type.png'
END
WHERE id BETWEEN 31 AND 70;

SELECT setval(
    pg_get_serial_sequence('produtos', 'id'),
    (SELECT MAX(id) FROM produtos)
);

-- Para atualizar um banco já preenchido no PgAdmin, execute este bloco.
UPDATE produtos
SET imagem = REPLACE(imagem, 'img/cameras/', 'img/CLIENTE/cameras/')
WHERE imagem LIKE '%img/cameras/%';

UPDATE produtos
SET imagem = REPLACE(imagem, 'img/filmes/', 'img/CLIENTE/filmes/')
WHERE imagem LIKE '%img/filmes/%';

UPDATE produtos
SET imagem = REPLACE(imagem, 'img/lentes/', 'img/CLIENTE/lentes/')
WHERE imagem LIKE '%img/lentes/%';

UPDATE produtos
SET imagem = REPLACE(imagem, 'img/filme.jpg', 'img/CLIENTE/index/filme.jpg')
WHERE imagem LIKE '%img/filme.jpg';

UPDATE produtos
SET imagem = REPLACE(imagem, 'img/lentes.jpg', 'img/CLIENTE/index/lentes.jpg')
WHERE imagem LIKE '%img/lentes.jpg';

COMMIT;
