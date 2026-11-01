// A richer in-memory stand-in for the Supabase client, enough to run the engagement engine end to end.
// Supports: select (with embedded relations via a relation map), eq/neq/gt/gte/lt/lte/in/like/not-is-null, order, limit, count+head,
// insert/upsert/update/delete, single/maybeSingle, unique constraints (returns an error like Postgres), and nested dotted filters.
type Rel = Record<string, { table: string; fk: string }>; // relation name -> { table, fk column on the row }
export function fakeDb(tables: Record<string, any[]>, opts: { rels?: Record<string, Rel>; unique?: Record<string, string[][]>; defaults?: Record<string, Record<string, any>> } = {}) {
  const T = (n: string) => (tables[n] ??= []);
  let seq = 0;
  const getPath = (r: any, c: string) => c.split('.').reduce((o, k) => (o == null ? o : o[k]), r);
  function attach(name: string, rows: any[], sel: string) {
    const rels = opts.rels?.[name] ?? {}; const out = rows.map((r) => ({ ...r }));
    for (const m of sel.matchAll(/([a-z_]+)(!inner)?\(([^)]*)\)/g)) {
      const rel = rels[m[1]]; if (!rel) continue;
      for (const r of out) r[m[1]] = T(rel.table).find((x) => x.id === r[rel.fk]) ?? null;
    }
    return out;
  }
  function builder(name: string) {
    let op: 'select' | 'update' | 'delete' | 'insert' | 'upsert' = 'select';
    const filters: ((r: any) => boolean)[] = []; let payload: any; let conflict: string[] | null = null; let ignoreDup = false;
    let orderBy: { c: string; asc: boolean }[] = []; let lim = Infinity; let skip = 0; let sel = '*'; let head = false; let wantCount = false; let wantSel = false;
    const b: any = {
      select: (s?: string, o?: any) => { wantSel = true; if (typeof s === 'string') sel = s; if (o?.count) wantCount = true; if (o?.head) head = true; return b; },
      eq: (c: string, v: any) => (filters.push((r) => getPath(r, c) === v), b),
      neq: (c: string, v: any) => (filters.push((r) => getPath(r, c) !== v), b),
      gt: (c: string, v: any) => (filters.push((r) => getPath(r, c) > v), b),
      gte: (c: string, v: any) => (filters.push((r) => getPath(r, c) >= v), b),
      lt: (c: string, v: any) => (filters.push((r) => getPath(r, c) < v), b),
      lte: (c: string, v: any) => (filters.push((r) => getPath(r, c) <= v), b),
      in: (c: string, vs: any[]) => (filters.push((r) => vs.includes(getPath(r, c))), b),
      like: (c: string, p: string) => { const re = new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$'); filters.push((r) => re.test(String(getPath(r, c) ?? ''))); return b; },
      not: (c: string, o: string, v: any) => { if (o === 'is' && v === null) filters.push((r) => getPath(r, c) !== null && getPath(r, c) !== undefined); return b; },
      is: (c: string, v: any) => (filters.push((r) => (getPath(r, c) ?? null) === v), b),
      order: (c: string, o?: any) => (orderBy.push({ c, asc: o?.ascending !== false }), b),
      limit: (n: number) => ((lim = n), b),
      range: (a: number, z: number) => ((skip = a), (lim = z - a + 1), b),
      insert: (p: any) => ((op = 'insert'), (payload = p), b),
      upsert: (p: any, o?: any) => ((op = 'upsert'), (payload = p), (conflict = o?.onConflict?.split(',') ?? null), (ignoreDup = !!o?.ignoreDuplicates), b),
      update: (p: any) => ((op = 'update'), (payload = p), b),
      delete: () => ((op = 'delete'), b),
      single: () => exec(true, true), maybeSingle: () => exec(true, false),
      then: (res: any, rej: any) => exec(false, false).then(res, rej),
    };
    const violates = (rows: any[], p: any) => (opts.unique?.[name] ?? []).some((cols) => rows.some((r) => cols.every((c) => r[c] === p[c] && p[c] !== undefined && p[c] !== null)));
    async function exec(one: boolean, must: boolean) {
      const rows = T(name); const match = (r: any) => filters.every((f) => f(r));
      let out: any[] = []; let error: any = null;
      if (op === 'insert' || op === 'upsert') {
        const ps = Array.isArray(payload) ? payload : [payload];
        for (const p of ps) {
          const ex = op === 'upsert' && conflict ? rows.find((r) => conflict!.every((c) => r[c] === p[c])) : null;
          if (ex) { if (!ignoreDup) Object.assign(ex, p); out.push(ex); continue; }
          if (violates(rows, p)) { if (op === 'upsert' && ignoreDup) continue; error = { message: 'duplicate key value violates unique constraint', code: '23505' }; break; }
          const r = { id: p.id ?? 'id' + ++seq, created_at: new Date().toISOString(), ...Object.fromEntries(Object.entries(opts.defaults?.[name] ?? {}).map(([k, v]) => [k, typeof v === 'function' ? v() : JSON.parse(JSON.stringify(v))])), ...p }; rows.push(r); out.push(r);
        }
      } else if (op === 'update') { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, payload)); out = hit; }
      else if (op === 'delete') { tables[name] = rows.filter((r) => !match(r)); }
      else {
        out = attach(name, rows, sel).filter(match);
        orderBy.forEach((o) => out.sort((a, c) => { const x = getPath(a, o.c), y = getPath(c, o.c); return (x > y ? 1 : x < y ? -1 : 0) * (o.asc ? 1 : -1); }));
        out = out.slice(skip, skip + lim);
      }
      if (error) return { data: null, error, count: null };
      const count = wantCount ? out.length : null;
      if (head) return { data: null, error: null, count };
      if (one) { if (!out[0] && must) return { data: null, error: { message: 'not found' }, count }; return { data: out[0] ?? null, error: null, count }; }
      return { data: out, error: null, count };
    }
    return b;
  }
  return { from: (n: string) => builder(n), _tables: tables } as any;
}
