import React from 'react';
import { ProjectAnalysis, RotLevel, ProjectStatus } from '../types';

interface ProjectCardProps {
  analysis: ProjectAnalysis;
  onStatusChange: (id: string, newStatus: ProjectStatus) => void;
}

const getRotColor = (level: RotLevel) => {
  switch (level) {
    case RotLevel.ABANDONED:
      return 'bg-red-100 border-red-200 text-red-800';
    case RotLevel.NEGLECTED:
      return 'bg-amber-100 border-amber-200 text-amber-800';
    case RotLevel.FRESH:
      return 'bg-emerald-100 border-emerald-200 text-emerald-800';
    default:
      return 'bg-slate-100 border-slate-200 text-slate-800';
  }
};

const getRotBadge = (level: RotLevel) => {
   switch (level) {
    case RotLevel.ABANDONED:
      return 'bg-red-500 text-white';
    case RotLevel.NEGLECTED:
      return 'bg-amber-500 text-white';
    case RotLevel.FRESH:
      return 'bg-emerald-500 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ analysis, onStatusChange }) => {
  const { project, daysSinceTouch, rotLevel } = analysis;

  return (
    <div className={`relative p-5 rounded-xl border-2 transition-all hover:shadow-md ${getRotColor(rotLevel)}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg leading-tight">{project.name}</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getRotBadge(rotLevel)}`}>
          {rotLevel}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="opacity-75">Last Touched:</span>
          <span className="font-medium">{new Date(project.lastTouched).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-75">Days Inactive:</span>
          <span className="font-mono font-bold">{daysSinceTouch}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="opacity-75">Owner:</span>
          <span className="font-medium">{project.owner || 'Unassigned'}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-black/10">
        <label className="block text-xs uppercase tracking-wide opacity-60 mb-1">Status</label>
        <select
          value={project.status}
          onChange={(e) => onStatusChange(project.id, e.target.value as ProjectStatus)}
          className="w-full bg-white/50 border border-black/10 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors"
        >
          {Object.values(ProjectStatus).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
    </div>
  );
};