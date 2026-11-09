import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { listPreviousPapers, addPreviousPaper, checkPaperMeta, publicError } from '@adaptive-tutor/core';

// Listing is public (no auth needed) — the shared paper library is
// reference material, same spirit as the footer's CBSE info.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId') ?? undefined;

    const supabase = await createServerClient();
    const papers = await listPreviousPapers(supabase, subjectId);
    return NextResponse.json({ data: { papers }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}

// The PDF itself is uploaded straight from the browser to Supabase Storage
// (see app/papers/page.tsx) before this is called — this route only saves
// the metadata row once that upload has already succeeded, with filePath
// pointing at the object the browser just created.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const { subjectId, title, year, filePath, solutionFilePath, notes } = body as {
      subjectId?: string;
      title?: string;
      year?: number | null;
      filePath?: string;
      solutionFilePath?: string | null;
      notes?: string | null;
    };
    if (!subjectId || !title || !filePath) {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }
    // v116: the library is public, so only rows that point at a file the page could have made, with sane text lengths.
    const meta = checkPaperMeta({ title, year, filePath, solutionFilePath, notes });
    if (!meta.ok) return NextResponse.json({ data: null, error: meta.code }, { status: 400 });

    const supabase = await createServerClient();
    const paper = await addPreviousPaper(supabase, {
      subjectId,
      uploadedBy: studentId,
      title,
      year: year ?? null,
      filePath,
      solutionFilePath: solutionFilePath ?? null,
      notes: notes ?? null,
    });
    return NextResponse.json({ data: { paper }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}
