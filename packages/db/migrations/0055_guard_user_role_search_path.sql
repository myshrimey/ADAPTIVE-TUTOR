-- v90: closes the Supabase security warning "function_search_path_mutable" for public.guard_user_role.
-- The function (from 0049) blocks a signed-in person from changing their own role. Its behaviour is NOT changed: only its search_path is fixed,
-- so a look-alike object in another schema can never be picked up. Additive and re-runnable.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'guard_user_role') then
    alter function public.guard_user_role() set search_path = public, pg_temp;
  end if;
end $$;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-31', 'v90', 'Fixed the search path of the role-guard function', 'Supabase security advisor warning (function_search_path_mutable)', '0055 alter function guard_user_role set search_path', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v90' and change like 'Fixed the search path%');
