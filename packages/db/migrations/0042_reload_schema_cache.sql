-- v66: ask the Supabase API layer (PostgREST) to reload its table list, so tables added by 0040 and 0041 are visible to the website straight away.
-- Safe to run any number of times.
notify pgrst, 'reload schema';
