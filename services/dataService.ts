import { Project, ProjectStatus, ProjectAnalysis, RotLevel } from '../types';

// Mock data simulating the Google Sheet
const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Website Redesign', lastTouched: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: ProjectStatus.ACTIVE, owner: 'Alice' },
  { id: '2', name: 'Q4 Marketing Campaign', lastTouched: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), status: ProjectStatus.ACTIVE, owner: 'Bob' },
  { id: '3', name: 'Legacy Server Migration', lastTouched: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), status: ProjectStatus.ON_HOLD, owner: 'Charlie' },
  { id: '4', name: 'Mobile App V2', lastTouched: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: ProjectStatus.ACTIVE, owner: 'Alice' },
  { id: '5', name: 'Internal Audit', lastTouched: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), status: ProjectStatus.COMPLETED, owner: 'Dave' },
  { id: '6', name: 'Client Portal', lastTouched: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), status: ProjectStatus.ACTIVE, owner: 'Eve' },
];

export const fetchProjects = async (): Promise<Project[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600)); 
  return [...MOCK_PROJECTS];
};

export const calculateRot = (lastTouched: string): { days: number, level: RotLevel } => {
  const touchDate = new Date(lastTouched);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - touchDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let level = RotLevel.FRESH;
  if (diffDays > 10) {
    level = RotLevel.ABANDONED;
  } else if (diffDays > 5) {
    level = RotLevel.NEGLECTED;
  }

  return { days: diffDays, level };
};

export const analyzeProjects = (projects: Project[]): ProjectAnalysis[] => {
  return projects.map(p => {
    const { days, level } = calculateRot(p.lastTouched);
    return {
      project: p,
      daysSinceTouch: days,
      rotLevel: level
    };
  });
};