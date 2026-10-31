import { CSV_TEMPLATE } from '@adaptive-tutor/core';
// A header-only file the founder fills in. Public text, no data in it.
export async function GET() {
  return new Response(CSV_TEMPLATE + 'EXAMPLE unit (delete this row),EXAMPLE chapter,EXAMPLE topic,EXAMPLE learning outcome,,1\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sahayak-curriculum-template.csv"' } });
}
