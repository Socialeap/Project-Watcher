import React, { useEffect, useState } from 'react';
import { Project, ProjectAnalysis, ProjectStatus, RotLevel } from './types';
import { fetchProjects, analyzeProjects } from './services/dataService';
import { ProjectCard } from './components/ProjectCard';
import { AIInsights } from './components/AIInsights';

const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawProjects = await fetchProjects();
        const analyzed = analyzeProjects(rawProjects);
        setProjects(analyzed);
      } catch (err) {
        setError("Failed to load project data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStatusChange = (id: string, newStatus: ProjectStatus) => {
    setProjects(prev => prev.map(p => {
      if (p.project.id === id) {
        // Optimistic update
        return { ...p, project: { ...p.project, status: newStatus } };
      }
      return p;
    }));
  };

  // Metrics
  const totalProjects = projects.length;
  const abandonedCount = projects.filter(p => p.rotLevel === RotLevel.ABANDONED).length;
  const neglectedCount = projects.filter(p => p.rotLevel === RotLevel.NEGLECTED).length;
  const freshCount = projects.filter(p => p.rotLevel === RotLevel.FRESH).length;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Watcher</h1>
          <p className="text-slate-500 mt-2">Visualizing project health & decay from Google Sheets</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-center">
                <div className="text-xs text-slate-400 font-bold uppercase">Abandoned</div>
                <div className="text-xl font-bold text-red-600">{abandonedCount}</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-center">
                <div className="text-xs text-slate-400 font-bold uppercase">Neglected</div>
                <div className="text-xl font-bold text-amber-500">{neglectedCount}</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-center">
                <div className="text-xs text-slate-400 font-bold uppercase">Fresh</div>
                <div className="text-xl font-bold text-emerald-500">{freshCount}</div>
            </div>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <svg className="animate-spin h-8 w-8 mb-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            <p>Syncing with Google Sheets...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            {error}
          </div>
        ) : (
          <>
            <AIInsights projects={projects} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((analysis) => (
                <ProjectCard 
                  key={analysis.project.id} 
                  analysis={analysis} 
                  onStatusChange={handleStatusChange} 
                />
              ))}
            </div>
          </>
        )}
      </main>
      
      <footer className="mt-12 text-center text-sm text-slate-400 pb-8">
        <p>Connected to Google Sheet ID: 1r2Gr_t_aGKSayoNCoYRHW...</p>
      </footer>
    </div>
  );
};

export default App;