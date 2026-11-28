BEGIN;

ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS pix_txid VARCHAR(25);

CREATE UNIQUE INDEX IF NOT EXISTS pedidos_pix_txid_unico_idx
    ON pedidos (pix_txid)
    WHERE pix_txid IS NOT NULL;

COMMIT;
