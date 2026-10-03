// Loads every curriculum subject file in packages/db/seed/ into Supabase —
// currently cbse-class10-maths.json and cbse-class10-science.json, and
// picking up any future cbse-class10-<subject>.json file automatically with
// no changes needed here (matches the PRD's "support other subjects without
// redesigning the core architecture" requirement — adding a subject is
// "drop a seed file," not "edit the loader").
//
// A file is a curriculum subject seed if it matches cbse-class10-*.json and
// does NOT end in -diagnostic.json (those are loaded separately by
// seed-diagnostic.js, after this script has run).
//
// Run with: node packages/db/seed.js
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
// automatically (see load-env.js) — or from the shell environment instead.
// (service role bypasses RLS, which is what you want for seeding curriculum content).

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

async function seedSubjectFile(seedPath) {
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  console.log(`\n--- ${path.basename(seedPath)} ---`);

  // 1. Curriculum (idempotent — multiple subject files share the same
  // board/class/version row; upsert just no-ops on repeat).
  const { data: curriculum, error: curErr } = await supabase
    .from('curricula')
    .upsert(data.curriculum, { onConflict: 'board,class,version' })
    .select()
    .single();
  if (curErr) throw curErr;
  console.log(`curriculum: ${curriculum.board} ${curriculum.class} (${curriculum.id})`);

  // 2. Subject
  const { data: subject, error: subErr } = await supabase
    .from('subjects')
    .upsert({ curriculum_id: curriculum.id, ...data.subject }, { onConflict: 'curriculum_id,slug' })
    .select()
    .single();
  if (subErr) throw subErr;
  console.log(`subject: ${subject.name} (${subject.id})`);

  // Map of skill slug -> skill id, filled in as we go, used to resolve prerequisites
  // in a second pass (a skill can require a skill defined earlier in the same file).
  // Scoped per-file — prerequisites only ever point within the same subject.
  const skillIdBySlug = {};
  const pendingPrereqs = []; // { skillSlug, requiresSlug }

  for (const chapter of data.chapters) {
    const { data: chapterRow, error: chErr } = await supabase
      .from('chapters')
      .upsert(
        { subject_id: subject.id, name: chapter.name, slug: chapter.slug, sequence: chapter.sequence },
        { onConflict: 'subject_id,slug' }
      )
      .select()
      .single();
    if (chErr) throw chErr;
    console.log(`  chapter: ${chapterRow.name}`);

    for (const topic of chapter.topics) {
      const { data: topicRow, error: tErr } = await supabase
        .from('topics')
        .upsert(
          { chapter_id: chapterRow.id, name: topic.name, slug: topic.slug, sequence: topic.sequence },
          { onConflict: 'chapter_id,slug' }
        )
        .select()
        .single();
      if (tErr) throw tErr;
      console.log(`    topic: ${topicRow.name}`);

      for (const skill of topic.skills) {
        const { data: skillRow, error: sErr } = await supabase
          .from('skills')
          .upsert(
            { topic_id: topicRow.id, name: skill.name, slug: skill.slug },
            { onConflict: 'topic_id,slug' }
          )
          .select()
          .single();
        if (sErr) throw sErr;
        skillIdBySlug[skill.slug] = skillRow.id;
        console.log(`      skill: ${skillRow.name}`);

        for (const requiresSlug of skill.requires || []) {
          pendingPrereqs.push({ skillSlug: skill.slug, requiresSlug });
        }
      }
    }
  }

  // 3. Prerequisites — resolved now that every skill in the file has an id.
  for (const { skillSlug, requiresSlug } of pendingPrereqs) {
    const skillId = skillIdBySlug[skillSlug];
    const requiresId = skillIdBySlug[requiresSlug];
    if (!skillId || !requiresId) {
      console.warn(`  ! skipping prerequisite ${skillSlug} -> ${requiresSlug} (unresolved slug)`);
      continue;
    }
    const { error: pErr } = await supabase
      .from('prerequisites')
      .upsert(
        { skill_id: skillId, requires_skill_id: requiresId, strength: 'hard' },
        { onConflict: 'skill_id,requires_skill_id' }
      );
    if (pErr) throw pErr;
  }
  console.log(`prerequisites: ${pendingPrereqs.length} edges`);
}

async function main() {
  const seedDir = path.join(__dirname, 'seed');
  const files = fs
    .readdirSync(seedDir)
    .filter((f) => /^cbse-class10-.*\.json$/.test(f) && !f.endsWith('-diagnostic.json'))
    .sort();

  if (files.length === 0) {
    console.error('No curriculum subject seed files found in packages/db/seed/.');
    process.exit(1);
  }

  for (const file of files) {
    await seedSubjectFile(path.join(seedDir, file));
  }

  console.log('\nSeed complete.');
}

main().catch(fail);
