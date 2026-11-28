BEGIN;

-- Os caminhos antigos de kits apontavam para uma pasta que não existe.
-- Usa a imagem do primeiro componente do kit; kits novos podem ter imagem própria.
UPDATE produtos kit
SET imagem = COALESCE((
    SELECT CASE
        WHEN componente.imagem LIKE './%' THEN '/' || SUBSTRING(componente.imagem FROM 3)
        ELSE componente.imagem
    END
    FROM kits_produto rel
    INNER JOIN produtos componente ON componente.id = rel.produto_id
    WHERE rel.kit_id = kit.id
    ORDER BY componente.id
    LIMIT 1
), '/img/CLIENTE/index/camera.jpg')
WHERE kit.categoria_id = 5
  AND kit.imagem LIKE './img/kits/%';

-- Caminhos relativos quebram nas páginas de cliente em subpastas.
-- Caminhos começando em /img funcionam tanto no Express quanto no Live Server.
UPDATE produtos
SET imagem = '/' || SUBSTRING(imagem FROM 3)
WHERE imagem LIKE './img/%';

COMMIT;
