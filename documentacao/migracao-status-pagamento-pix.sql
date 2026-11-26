BEGIN;

ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(30)
NOT NULL DEFAULT 'aguardando_pagamento';

COMMIT;
