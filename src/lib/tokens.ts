export const GROUP_IDS = ["intent", "inputs", "judgment", "conclusion", "governance"] as const;
export const GRADER_KINDS = ["code", "similarity", "llm-judge", "human", "user-signal"] as const;

export type GroupId = (typeof GROUP_IDS)[number];
export type GraderKind = (typeof GRADER_KINDS)[number];

export const groupVar = (id: GroupId) => `var(--group-${id})`;
export const graderVar = (kind: GraderKind) => `var(--grader-${kind})`;
