-- one line per object, for comparing the database before and after a migration
select 'table|' || table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'
union all select 'column|' || table_name || '.' || column_name from information_schema.columns where table_schema='public'
union all select 'policy|' || schemaname || '.' || tablename || '.' || policyname from pg_policies where schemaname in ('public','storage')
union all select 'trigger|' || c.relname || '.' || t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','storage')
union all select 'function|' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all select 'index|' || tablename || '.' || indexname from pg_indexes where schemaname='public'
union all select 'constraint|' || conrelid::regclass::text || '.' || conname from pg_constraint where connamespace='public'::regnamespace
union all select 'bucket|' || id from storage.buckets
order by 1;
