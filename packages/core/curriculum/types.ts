// Curriculum tree types, mirroring packages/db/schema.sql. Implementation
// (curriculum.service.ts — load tree, resolve prerequisites) is Day 2.

export interface Skill {
  id: string;
  topicId: string;
  name: string;
  slug: string;
  requiresSkillIds: string[]; // resolved from `prerequisites`
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  slug: string;
  sequence: number;
  skills: Skill[];
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  sequence: number;
  topics: Topic[];
}

export interface Subject {
  id: string;
  curriculumId: string;
  name: string;
  slug: string;
  chapters: Chapter[];
}

export interface Curriculum {
  id: string;
  board: string;
  class: string;
  version: string;
  subjects: Subject[];
}

