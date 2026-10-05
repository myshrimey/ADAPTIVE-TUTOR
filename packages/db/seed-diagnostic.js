// Loads every packages/db/seed/*-diagnostic.json file into Supabase — currently
// cbse-class10-maths-diagnostic.json and cbse-class10-science-diagnostic.json,
// picking up any future <subject>-diagnostic.json automatically. Each file
// declares its own `subject_slug` at the top level, so this loader doesn't
// need to parse filenames or be told which subjects exist.
//
// Run AFTER seed.js — this resolves skill_slug against skills already seeded
// by the curriculum loader.
//
// Run with: node packages/db/seed-diagnostic.js
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
// automatically (see load-env.js) — or from the shell environment instead.

require('./load-env');
const { fail } = require('./report-error');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedDiagnosticFile(filePath) {
  const { subject_slug: subjectSlug, questions } = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`\n--- ${path.basename(filePath)} (subject: ${subjectSlug}) ---`);

  const { data: subject, error: subjErr } = await supabase
    .from('subjects')
    .select('id, curricula!inner(board, class)')
    .eq('curricula.board', 'CBSE')
    .eq('curricula.class', '10')
    .eq('slug', subjectSlug)
    .single();
  if (subjErr || !subject) throw subjErr ?? new Error(`subject_not_found: ${subjectSlug} — run seed.js first`);

  // Idempotent: reuse an existing active diagnostic test for this subject if
  // one exists, otherwise create it.
  const { data: existing } = await supabase
    .from('diagnostic_tests')
    .select('id')
    .eq('subject_id', subject.id)
    .eq('is_active', true)
    .maybeSingle();

  let testId = existing?.id;
  if (!testId) {
    const { data: created, error: createErr } = await supabase
      .from('diagnostic_tests')
      .insert({ subject_id: subject.id, name: `CBSE Class 10 ${subjectSlug} — Initial Diagnostic`, is_active: true })
      .select()
      .single();
    if (createErr || !created) throw createErr ?? new Error('diagnostic_test_create_failed');
    testId = created.id;
  }
  console.log(`diagnostic test: ${testId}`);

  for (const q of questions) {
    const { data: skill, error: skillErr } = await supabase.from('skills').select('id').eq('slug', q.skill_slug).single();
    if (skillErr || !skill) {
      console.warn(`  ! skipping question for unresolved skill slug: ${q.skill_slug}`);
      continue;
    }

    const { data: existingQ } = await supabase
      .from('diagnostic_questions')
      .select('id')
      .eq('diagnostic_test_id', testId)
      .eq('skill_id', skill.id)
      .eq('prompt', q.prompt)
      .maybeSingle();

    if (existingQ) {
      console.log(`  already seeded: ${q.skill_slug}`);
      continue;
    }

    const { error: insertErr } = await supabase.from('diagnostic_questions').insert({
      diagnostic_test_id: testId,
      skill_id: skill.id,
      difficulty: q.difficulty,
      question_type: q.question_type,
      prompt: q.prompt,
      options: q.options ?? null,
      expected_answer: q.expected_answer,
      misconception_tags: q.misconception_tags ?? [],
      // Optional — shown on the diagnostic review screen alongside the
      // correct answer when a question's JSON authors one. Most existing
      // seed content doesn't have one yet; the review screen falls back to
      // just the correct answer in that case (see migrations/0005).
      explanation: q.explanation ?? null,
    });
    if (insertErr) throw insertErr;
    console.log(`  seeded: ${q.skill_slug} (difficulty ${q.difficulty})`);
  }
}

async function main() {
  const seedDir = path.join(__dirname, 'seed');
  const files = fs
    .readdirSync(seedDir)
    .filter((f) => f.endsWith('-diagnostic.json'))
    .sort();

  if (files.length === 0) {
    console.error('No *-diagnostic.json files found in packages/db/seed/.');
    process.exit(1);
  }

  for (const file of files) {
    await seedDiagnosticFile(path.join(seedDir, file));
  }

  console.log('\nDiagnostic seed complete.');
}

main().catch(fail);
