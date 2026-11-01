import { createServiceClient } from '@/lib/supabase-server';
import { loadRegistry, type ControlRegistry } from '@adaptive-tutor/core';
import { REGISTRY } from '@adaptive-tutor/core/control-centre/registry-data';

/** The registry for the screens: the database copy when it exists, otherwise the copy shipped with this version (read only; the page says so). */
export async function getControl(): Promise<{ reg: ControlRegistry; source: 'database' | 'bundled' }> {
  try { const db = await loadRegistry(createServiceClient()); if (db) return { reg: db, source: 'database' }; } catch { /* fall through to the shipped copy */ }
  return { reg: REGISTRY, source: 'bundled' };
}
