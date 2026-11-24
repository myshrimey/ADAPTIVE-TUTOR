// v143: test accounts. A mark is a label only: it grants nothing and removes nothing. Reason is required (8 to 200 characters).
export { cleanReason } from '../view-as/logic';
export const TEST_ACCOUNT_AUDIT = { mark: 'account.test_mark', unmark: 'account.test_unmark' } as const;
export const isAccountId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
/** Parses the request. Returns null when the id or the mark flag is not valid. */
export function parseMarkRequest(body: any): { userId: string; mark: boolean; reasonRaw: unknown } | null {
  if (!body || !isAccountId(body.userId) || typeof body.mark !== 'boolean') return null;
  return { userId: body.userId, mark: body.mark, reasonRaw: body.reason };
}
