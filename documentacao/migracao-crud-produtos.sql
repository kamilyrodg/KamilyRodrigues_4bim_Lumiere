-- Permite excluir produtos sem apagar as linhas históricas dos pedidos.
-- nome_item e preco_unitario guardam a descrição e o valor comprados.
BEGIN;

DO $$
DECLARE
    restricao RECORD;
BEGIN
    FOR restricao IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'itens_pedido'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%produto_id IS NOT NULL%'
    LOOP
        EXECUTE format('ALTER TABLE itens_pedido DROP CONSTRAINT %I', restricao.conname);
    END LOOP;
END;
$$;

ALTER TABLE itens_pedido
    ADD CONSTRAINT itens_pedido_produto_servico_check
    CHECK (
        (produto_id IS NOT NULL AND servico_id IS NULL)
        OR (produto_id IS NULL AND servico_id IS NOT NULL)
        OR (produto_id IS NULL AND servico_id IS NULL AND nome_item IS NOT NULL)
    );

COMMIT;
