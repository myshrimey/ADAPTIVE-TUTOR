import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { runOrchestratorTurn, publicError, checkTutorMessage } from '@adaptive-tutor/core';
import { aiForStudent } from '@/lib/ai';
import { wantsStream, withTokens, ndjsonResponse } from '@/lib/stream-turn';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json();
    const { sessionId, message: rawMessage } = body as { sessionId: string; message: unknown };
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }
    // v120: size and shape are checked before the tutor (and its AI cost) is touched.
    const checked = checkTutorMessage(rawMessage);
    if (!checked.ok) return NextResponse.json({ data: null, error: checked.code }, { status: 400 });
    const message = checked.text;

    const supabase = await createServerClient();
    const ai = await aiForStudent(studentId, { tutor: true });
    if (wantsStream(request)) {
      await supabase.auth.getSession(); // read the sign-in cookie now, while the request is still open, before the reply starts streaming
      return ndjsonResponse((emit) => runOrchestratorTurn(supabase, { studentId, sessionId, studentMessage: message }, withTokens(ai, (v) => emit({ t: 'token', v }), () => emit({ t: 'restart' }))));
    }
    const turn = await runOrchestratorTurn(supabase, { studentId, sessionId, studentMessage: message }, ai);

    return NextResponse.json({ data: turn, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}
