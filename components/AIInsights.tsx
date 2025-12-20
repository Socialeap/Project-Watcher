import React, { useState } from 'react';
import { ProjectAnalysis } from '../types';
import { generateDashboardInsights } from '../services/geminiService';

interface AIInsightsProps {
  projects: ProjectAnalysis[];
}

export const AIInsights: React.FC<AIInsightsProps> = ({ projects }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateDashboardInsights(projects);
    setInsight(result);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
             {/* Sparkles Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Project Analyst</h2>
            <p className="text-sm text-slate-500">Powered by Gemini 2.5 Flash Lite</p>
          </div>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
            loading 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Generate Health Report</span>
            </>
          )}
        </button>
      </div>

      {insight && (
        <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-100 prose prose-slate max-w-none">
          <h4 className="text-sm font-bold uppercase text-slate-400 mb-2 tracking-wider">Analysis Result</h4>
          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
            {insight}
          </div>
        </div>
      )}
    </div>
  );
};