// v90: Development Control Centre (SAH-PROMPT-0009). Pure types and constants. No database, safe for the browser.
export const CONTROL_STATUSES = ['RECEIVED', 'REGISTERED', 'ANALYSED', 'NOT STARTED', 'IN PROGRESS', 'PARTIALLY COMPLETED', 'BLOCKED', 'READY FOR TESTING', 'TESTING', 'COMPLETED', 'ACCEPTED BY FOUNDER', 'DEFERRED', 'CANCELLED'] as const;
export type ControlStatus = (typeof CONTROL_STATUSES)[number];
export const CONTROL_ACCEPTANCE = ['pending', 'accepted', 'rejected'] as const;
export type ControlAcceptance = (typeof CONTROL_ACCEPTANCE)[number];
export const CONTROL_PRIORITIES = ['now', 'next', 'later', 'hold'] as const;
export type ControlPriority = (typeof CONTROL_PRIORITIES)[number];

export interface ControlPrompt { id: string; title: string; received_on: string | null; original_kept: boolean; original_text?: string | null; objective: string; status: ControlStatus; category: string; related_to: string | null; requirement_level: boolean; note: string; founder_priority: ControlPriority | null }
export interface ControlObjective { id: string; prompt_id: string; code: string; title: string }
export interface ControlRequirement { id: string; prompt_id: string; objective_code: string; code: string; text: string; status: ControlStatus; note: string; founder_acceptance: ControlAcceptance }
export interface ControlTask { id: string; prompt_id: string; phase: string; title: string; objective_code: string; requirements: string; depends_on: string; size: string; status: ControlStatus; verification: string; note: string; founder_next: boolean; founder_rank: number | null }
export interface ControlDecision { id: string; kind: 'made' | 'waiting'; decided_on: string | null; decision: string; source: string; affects: string; status: string; recommendation: string | null }
export interface ControlExecution { id: string; executed_on: string; prompt_id: string | null; summary: string; files: string; db_changes: string; tests: string; open_problems: string }
export interface ControlRegistry { prompts: ControlPrompt[]; objectives: ControlObjective[]; requirements: ControlRequirement[]; tasks: ControlTask[]; decisions: ControlDecision[]; executions: ControlExecution[] }

export function isControlStatus(s: unknown): s is ControlStatus { return typeof s === 'string' && (CONTROL_STATUSES as readonly string[]).includes(s); }
