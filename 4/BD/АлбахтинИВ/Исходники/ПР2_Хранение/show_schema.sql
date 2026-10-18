\pset pager off
\pset columns 160
\dt public.*
SELECT conrelid::regclass AS "Table",
       regexp_replace(pg_get_constraintdef(oid), ' ON .*$', '') AS "Foreign key -> referenced key"
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;
