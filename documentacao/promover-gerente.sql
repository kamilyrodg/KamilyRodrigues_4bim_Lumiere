-- Antes de executar: crie a conta pelo cadastro normal do site.
-- Substitua o e-mail abaixo pelo e-mail exato usado no cadastro.
DO $$
DECLARE
    email_gerente TEXT := 'SUBSTITUA_PELO_EMAIL_CADASTRADO';
    usuario_id_gerente INTEGER;
BEGIN
    IF email_gerente = 'SUBSTITUA_PELO_EMAIL_CADASTRADO' THEN
        RAISE EXCEPTION 'Edite o e-mail do gerente antes de executar este arquivo.';
    END IF;

    SELECT id
    INTO usuario_id_gerente
    FROM usuarios
    WHERE LOWER(email) = LOWER(email_gerente);

    IF usuario_id_gerente IS NULL THEN
        RAISE EXCEPTION 'Nenhuma conta encontrada para o e-mail informado. Cadastre a conta primeiro.';
    END IF;

    UPDATE usuarios
    SET tipo = 'gerente'
    WHERE id = usuario_id_gerente;

    INSERT INTO gerentes (usuario_id)
    VALUES (usuario_id_gerente)
    ON CONFLICT (usuario_id) DO NOTHING;

    DELETE FROM clientes
    WHERE usuario_id = usuario_id_gerente;
END;
$$;
