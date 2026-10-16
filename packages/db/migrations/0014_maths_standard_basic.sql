-- v35: split Mathematics into "Standard" and "Basic" (CBSE offers both courses
-- for Class 10; the syllabus units are the same, Basic papers are pitched
-- easier). Re-runnable: the clone only happens once (guarded), the rename is
-- conditional.
--
-- Design:
--  * The existing subject (slug 'maths') keeps its id, its skills and every
--    student's mastery — it is only renamed "Mathematics (Standard)". Nothing
--    is re-keyed, so no existing progress is touched.
--  * A new subject 'maths-basic' is created as a COPY of the same chapters /
--    topics / skills / prerequisites (new ids; skill slugs get a '-basic'
--    suffix because seed-diagnostic.js looks skills up by slug globally), with
--    the diagnostic and practice questions of difficulty <= 3 copied across.
--    A student who takes Basic builds mastery on the Basic copy.
--  * It starts as 'pilot' with every copied question 'needs_review': whether
--    the cut-down bank is the right level for Basic has not been checked by a
--    teacher.

update subjects set name = 'Mathematics (Standard)'
  where slug = 'maths' and name = 'Mathematics';

insert into subjects (curriculum_id, name, slug, status, description)
select curriculum_id, 'Mathematics (Basic)', 'maths-basic', 'pilot',
       'Same syllabus units as Standard with easier questions (difficulty 1-3). Copied from the Standard bank; level fit still to be reviewed by a teacher.'
from subjects
where slug = 'maths'
on conflict (curriculum_id, slug) do nothing;

do $$
declare
  std uuid;
  bas uuid;
  bas_test uuid;
begin
  select id into std from subjects where slug = 'maths' order by id limit 1;
  select id into bas from subjects where slug = 'maths-basic' order by id limit 1;
  if std is null or bas is null then return; end if;
  if exists (select 1 from chapters where subject_id = bas) then return; end if; -- already cloned

  create temp table _chmap (old uuid primary key, new uuid not null) on commit drop;
  create temp table _tpmap (old uuid primary key, new uuid not null) on commit drop;
  create temp table _skmap (old uuid primary key, new uuid not null) on commit drop;

  insert into _chmap select id, gen_random_uuid() from chapters where subject_id = std;
  insert into chapters (id, subject_id, name, slug, sequence)
    select m.new, bas, c.name, c.slug, c.sequence from chapters c join _chmap m on m.old = c.id;

  insert into _tpmap select t.id, gen_random_uuid() from topics t join _chmap m on m.old = t.chapter_id;
  insert into topics (id, chapter_id, name, slug, sequence)
    select tm.new, cm.new, t.name, t.slug, t.sequence
    from topics t join _tpmap tm on tm.old = t.id join _chmap cm on cm.old = t.chapter_id;

  insert into _skmap select s.id, gen_random_uuid() from skills s join _tpmap m on m.old = s.topic_id;
  insert into skills (id, topic_id, name, slug)
    select sm.new, tm.new, s.name, s.slug || '-basic'
    from skills s join _skmap sm on sm.old = s.id join _tpmap tm on tm.old = s.topic_id;

  insert into prerequisites (skill_id, requires_skill_id, strength)
    select a.new, b.new, p.strength
    from prerequisites p join _skmap a on a.old = p.skill_id join _skmap b on b.old = p.requires_skill_id;

  insert into diagnostic_tests (subject_id, name, is_active)
    values (bas, 'CBSE Class 10 maths-basic — Initial Diagnostic', true)
    returning id into bas_test;

  insert into diagnostic_questions
    (diagnostic_test_id, skill_id, difficulty, question_type, prompt, options, expected_answer,
     misconception_tags, explanation, figure_url, figure_caption, source, validated, content_status)
  select bas_test, sm.new, q.difficulty, q.question_type, q.prompt, q.options, q.expected_answer,
         q.misconception_tags, q.explanation, q.figure_url, q.figure_caption, q.source, q.validated, 'needs_review'
  from diagnostic_questions q
  join _skmap sm on sm.old = q.skill_id
  join diagnostic_tests dt on dt.id = q.diagnostic_test_id
  where dt.subject_id = std and q.difficulty <= 3 and q.content_status <> 'rejected';

  insert into questions
    (skill_id, source, difficulty, question_type, prompt, options, expected_answer,
     misconception_tags, validated, explanation, figure_url, figure_caption, content_status)
  select sm.new, q.source, q.difficulty, q.question_type, q.prompt, q.options, q.expected_answer,
         q.misconception_tags, q.validated, q.explanation, q.figure_url, q.figure_caption, 'needs_review'
  from questions q join _skmap sm on sm.old = q.skill_id
  where q.difficulty <= 3 and q.content_status <> 'rejected';
end $$;
