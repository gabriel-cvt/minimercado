DO $$
DECLARE
    existing_constraint record;
    schema_name text := current_schema();
BEGIN
    IF to_regclass(format('%I.orders', schema_name)) IS NULL THEN
        RETURN;
    END IF;

    FOR existing_constraint IN
        SELECT con.conname, nsp.nspname, rel.relname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = rel.oid
            AND att.attnum = ANY (con.conkey)
        WHERE con.contype = 'c'
          AND rel.relname = 'orders'
          AND att.attname = 'payment_method'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            existing_constraint.nspname,
            existing_constraint.relname,
            existing_constraint.conname
        );
    END LOOP;

    EXECUTE format(
        'ALTER TABLE %I.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IS NULL OR payment_method IN (''PIX'', ''DINHEIRO'', ''CARTAO''))',
        schema_name
    );
END $$;
