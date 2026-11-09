-- v116: limits on the shared paper library bucket. The bucket is PUBLIC (anyone can open a file once uploaded) and any signed-in
-- account can upload, so the bucket itself now accepts only PDFs up to 10 MB. Additive and re-runnable: it only sets two bucket
-- settings; files already uploaded are untouched. The read/insert/delete policies from 0006 are NOT changed.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
       set file_size_limit = 10485760,
           allowed_mime_types = array['application/pdf']
     where id = 'papers';
  end if;
end $$;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-08', 'v116', 'The shared paper library accepts only PDF files up to 10 MB', 'Security: the library is public and any signed-in account can upload, so type and size are limited', '0062 papers_bucket_limits (bucket setting only; no table changes)', 'none', 'Run 0062 after v115. Existing files are unchanged.'
where not exists (select 1 from system_changelog where version = 'v116' and change like 'The shared paper library%');
