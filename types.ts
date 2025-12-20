export enum ProjectStatus {
  ACTIVE = 'Active',
  ON_HOLD = 'On Hold',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived'
}

export enum RotLevel {
  FRESH = 'Fresh',        // <= 5 days
  NEGLECTED = 'Neglected', // > 5 days
  ABANDONED = 'Abandoned'  // > 10 days
}

export interface Project {
  id: string;
  name: string;
  lastTouched: string; // ISO Date string
  status: ProjectStatus;
  owner?: string;
}

export interface ProjectAnalysis {
  project: Project;
  daysSinceTouch: number;
  rotLevel: RotLevel;
}

export interface AIInsight {
  summary: string;
  actionItems: string[];
  priorityScore: number;
}