// Minimal in-memory stand-in for the Supabase client (select/eq/in/order/limit/single/maybeSingle/insert/upsert/update/delete + storage).
export function fakeSupabase(tables: Record<string, any[]>) {
  const files = new Map<string, Buffer>();
  const T = (n: string) => (tables[n] ??= []);
  function builder(name: string) {
    let op: 'select' | 'update' | 'delete' | 'insert' | 'upsert' = 'select';
    let filters: ((r: any) => boolean)[] = [];
    let payload: any; let conflict: string[] | null = null; let orderBy: string | null = null; let lim = Infinity;
    const b: any = {
      select: () => b,
      eq: (c: string, v: any) => (filters.push((r) => r[c] === v), b),
      in: (c: string, vs: any[]) => (filters.push((r) => vs.includes(r[c])), b),
      gte: (c: string, v: any) => (filters.push((r) => r[c] >= v), b),
      neq: (c: string, v: any) => (filters.push((r) => r[c] !== v), b),
      order: (c: string) => ((orderBy = c), b),
      limit: (n: number) => ((lim = n), b),
      insert: (p: any) => ((op = 'insert'), (payload = p), b),
      upsert: (p: any, o?: any) => ((op = 'upsert'), (payload = p), (conflict = o?.onConflict?.split(',') ?? null), b),
      update: (p: any) => ((op = 'update'), (payload = p), b),
      delete: () => ((op = 'delete'), b),
      single: () => exec(true, true),
      maybeSingle: () => exec(true, false),
      then: (res: any, rej: any) => exec(false, false).then(res, rej),
    };
    async function exec(one: boolean, must: boolean) {
      const rows = T(name);
      const match = (r: any) => filters.every((f) => f(r));
      let out: any[] = [];
      if (op === 'insert') { const ps = Array.isArray(payload) ? payload : [payload]; ps.forEach((p) => { const r = { id: p.id ?? 'id' + Math.random().toString(36).slice(2), created_at: new Date().toISOString(), ...p }; rows.push(r); out.push(r); }); }
      else if (op === 'upsert') {
        const ps = Array.isArray(payload) ? payload : [payload];
        for (const p of ps) { const ex = conflict ? rows.find((r) => conflict!.every((c) => r[c] === p[c])) : null; if (ex) Object.assign(ex, p); else rows.push({ id: p.id ?? 'id' + Math.random().toString(36).slice(2), ...p }); }
      } else if (op === 'update') rows.filter(match).forEach((r) => Object.assign(r, payload));
      else if (op === 'delete') tables[name] = rows.filter((r) => !match(r));
      else { out = rows.filter(match); if (orderBy) out.sort((a, c) => (a[orderBy!] > c[orderBy!] ? 1 : -1)); out = out.slice(0, lim); }
      if (one) { if (!out[0] && must) return { data: null, error: { message: 'not found' } }; return { data: out[0] ?? null, error: null }; }
      return { data: out, error: null };
    }
    return b;
  }
  return {
    from: (n: string) => builder(n),
    storage: { from: () => ({
      upload: async (p: string, buf: Buffer) => (files.set(p, buf), { error: null }),
      download: async (p: string) => (files.has(p) ? { data: new Blob([files.get(p)!]), error: null } : { data: null, error: { message: 'missing' } }),
      remove: async (ps: string[]) => (ps.forEach((p) => files.delete(p)), { error: null }),
      copy: async (a: string, b: string) => (files.set(b, files.get(a)!), { error: null }),
      createSignedUrl: async (p: string) => ({ data: { signedUrl: 'https://signed.example/' + p }, error: null }),
    }) },
    _files: files, _tables: tables,
  } as any;
}
