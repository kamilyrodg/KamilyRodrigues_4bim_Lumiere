BEGIN;

CREATE TABLE IF NOT EXISTS caracteristicas_lente (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS lente_caracteristicas (
    lente_id INTEGER NOT NULL REFERENCES produtos(id),
    caracteristica_id INTEGER NOT NULL REFERENCES caracteristicas_lente(id),
    PRIMARY KEY (lente_id, caracteristica_id)
);

INSERT INTO caracteristicas_lente (id, nome) VALUES
(1, 'Fixa'),
(2, 'Zoom'),
(3, 'Grande angular'),
(4, 'Teleobjetiva'),
(5, 'Macro'),
(6, 'Retrato')
ON CONFLICT (id) DO UPDATE
SET nome = EXCLUDED.nome;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM produtos
        WHERE id BETWEEN 71 AND 90
          AND categoria_id <> 4
    ) THEN
        RAISE EXCEPTION 'Os IDs 71 a 90 já pertencem a produtos que não são lentes.';
    END IF;
END
$$;

INSERT INTO produtos VALUES
(71, 4, 'Canon EF 50mm f/1.8 STM', 850.00, 850.00, './img/lentes/Canon EF 50mm f1.8 STM.jpg'),
(72, 4, 'Canon EF 24-105mm f/4L IS', 1050.00, 1050.00, './img/lentes.jpg'),
(73, 4, 'Sony FE 50mm f/1.8', 1450.00, 1450.00, './img/lentes/Sony FE 50mm f1.8.jpg'),
(74, 4, 'Fujifilm XF 35mm f/2 R WR', 2800.00, 2800.00, './img/lentes/Fujifilm XF 35mm f2 R WR.jpg'),
(75, 4, 'Sigma 30mm f/1.4 DC DN', 2100.00, 2100.00, './img/lentes/Sigma 30mm f1.4 DC DN.jpg'),
(76, 4, 'Canon EF-S 24mm f/2.8 STM', 950.00, 950.00, './img/lentes/Canon EF-S 24mm f2.8 STM.jpg'),
(77, 4, 'Nikon AF-P DX 10-20mm f/4.5-5.6G VR', 1900.00, 1900.00, './img/lentes/Nikon AF-P DX 10-20mm f4.5-5.6G VR.jpg'),
(78, 4, 'Canon RF 16mm f/2.8 STM', 1650.00, 1650.00, './img/lentes/Canon RF 16mm f2.8 STM.jpg'),
(79, 4, 'Sony E 10-18mm f/4 OSS', 3200.00, 3200.00, './img/lentes/Sony E 10-18mm f4 OSS.jpg'),
(80, 4, 'Tamron 17-70mm f/2.8 Di III-A VC RXD', 4500.00, 4500.00, './img/lentes/Tamron 17-70mm f2.8 Di III-A VC RXD.jpg'),
(81, 4, 'Canon EF 70-200mm f/4L USM', 3800.00, 3800.00, './img/lentes/Canon EF 70-200mm f4L USM.jpg'),
(82, 4, 'Nikon AF-S 70-300mm f/4.5-5.6G VR', 2400.00, 2400.00, './img/lentes/Nikon AF-S 70-300mm f4.5-5.6G VR.jpg'),
(83, 4, 'Sony FE 70-200mm f/4 G OSS', 6500.00, 6500.00, './img/lentes/Sony FE 70-200mm f4 G OSS.jpg'),
(84, 4, 'Sigma 150-600mm f/5-6.3 DG OS HSM Contemporary', 6900.00, 6900.00, './img/lentes/Sigma 150-600mm f5-6.3 DG OS HSM Contemporary.jpg'),
(85, 4, 'Canon EF 100mm f/2.8 Macro USM', 3100.00, 3100.00, './img/lentes/Canon EF 100mm f2.8 Macro USM.jpg'),
(86, 4, 'Nikon AF-S Micro 105mm f/2.8G VR', 4300.00, 4300.00, './img/lentes/Nikon AF-S Micro 105mm f2.8G VR.jpg'),
(87, 4, 'Sigma 105mm f/2.8 DG DN Macro Art', 5200.00, 5200.00, './img/lentes/Sigma 105mm f2.8 DG DN Macro Art.jpg'),
(88, 4, 'Canon EF 85mm f/1.8 USM', 1900.00, 1900.00, './img/lentes/Canon EF 85mm f1.8 USM.jpg'),
(89, 4, 'Nikon AF-S 85mm f/1.8G', 2300.00, 2300.00, './img/lentes/Nikon AF-S 85mm f1.8G.jpg'),
(90, 4, 'Fujifilm XF 56mm f/1.2 R', 4800.00, 4800.00, './img/lentes/Fujifilm XF 56mm f1.2 R.jpg')
ON CONFLICT (id) DO NOTHING;

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
(90, 6)
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('produtos', 'id'),
    GREATEST((SELECT MAX(id) FROM produtos), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('caracteristicas_lente', 'id'),
    GREATEST((SELECT MAX(id) FROM caracteristicas_lente), 1),
    true
);

COMMIT;
