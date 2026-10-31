import { makeExportMeta, exportHeaders, safeFileName, metaText, type PrivacyClass } from '@adaptive-tutor/core';

// v81: the one way a server route sends a downloadable file. It sets the shared branding headers and a safe file name;
// the file body is NOT changed (a CSV stays a plain CSV with one header row).
export function fileResponse(body: string, o: { kind: string; ext: string; contentType: string; title: string; classification?: PrivacyClass; filename?: string; bom?: boolean; curriculum?: string | null }): Response {
  const meta = makeExportMeta({ title: o.title, kind: o.kind, classification: o.classification, curriculum: o.curriculum });
  const file = o.filename ?? safeFileName(o.kind, o.ext);
  return new Response((o.bom ? '﻿' : '') + body, { headers: exportHeaders(meta, file, o.contentType) });
}
export const csvResponse = (csv: string, o: { kind: string; title: string; classification?: PrivacyClass; filename?: string; bom?: boolean }) => fileResponse(csv, { ...o, ext: 'csv', contentType: 'text/csv; charset=utf-8' });
export { metaText, makeExportMeta };
