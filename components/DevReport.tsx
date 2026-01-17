
import React from 'react';

interface DevReportProps {
  onClose: () => void;
}

export const DevReport: React.FC<DevReportProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-2xl border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs uppercase tracking-widest border border-red-500/50">System Incident</span>
            Developer Report
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-300">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <strong className="text-indigo-400 block mb-1">ISSUE SUMMARY</strong>
            The application is encountering a persistent <code>Google OAuth 2.0 "Access Blocked" (Error 400)</code>. This prevents the retrieval of the OAuth token required for the Google Sheets API.
          </div>

          <div>
            <strong className="text-white block mb-2">TECHNICAL DIAGNOSIS</strong>
            <p className="mb-2">The error confirms that the <strong>Origin</strong> (the domain the browser is running on) does not match the <strong>Authorized JavaScript Origins</strong> allowlisted in the Google Cloud Console.</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Expected Origin:</strong> <code>{window.location.origin}</code></li>
              <li><strong>Status:</strong> Mismatch / Blocked by Security Policy</li>
            </ul>
          </div>

          <div>
            <strong className="text-white block mb-2">ENVIRONMENT FACTORS</strong>
            <p>Running in a containerized preview environment presents challenges:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 mt-2">
              <li><strong>Dynamic Subdomains:</strong> URL may change between sessions.</li>
              <li><strong>Proxy Layers:</strong> "Referrer" headers often trigger Google's anti-phishing blocks.</li>
              <li><strong>Propagation Delay:</strong> Cloud Console updates take 5–60 minutes.</li>
            </ul>
          </div>

          <div>
            <strong className="text-white block mb-2">ATTEMPTED FIXES & OUTCOMES</strong>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-red-400 font-mono text-xs border border-red-900 bg-red-950 px-1 rounded h-fit">FAILED</span>
                <span><strong>Referrer Policy:</strong> Switched to 'origin' to strip path data. Google still detected mismatch.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-emerald-400 font-mono text-xs border border-emerald-900 bg-emerald-950 px-1 rounded h-fit">PARTIAL</span>
                <span><strong>Iframe Detection:</strong> Forced new tab to avoid X-Frame-Options. Solved file access, but Auth Policy remains.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 font-mono text-xs border border-red-900 bg-red-950 px-1 rounded h-fit">FAILED</span>
                <span><strong>Manual Validation:</strong> User confirmed Origin match. Block persists due to propagation or proxy SSL issues.</span>
              </div>
            </div>
          </div>
          
          <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl">
             <strong className="text-indigo-300 block mb-1">RECOMMENDATION</strong>
             Use <strong>Demo Mode</strong> to evaluate the dashboard and AI features using local mock data. Deploy to a stable domain (Netlify/Vercel) for production authentication.
          </div>
        </div>
      </div>
    </div>
  );
};
