
import React, { useState, useEffect } from 'react';
import { handleAuthClick, validateManualToken } from '../services/authService';

interface LoginScreenProps {
  hasValidConfig: boolean;
  onSaveConfig: (clientId: string, sheetId: string) => void;
  onEnterDemo: () => void;
  currentClientId?: string;
  currentSheetId?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ hasValidConfig, onSaveConfig, onEnterDemo, currentClientId = '', currentSheetId = '' }) => {
  const [tempId, setTempId] = useState(currentClientId);
  const [tempSheetId, setTempSheetId] = useState(currentSheetId);
  
  // Environment Detection
  const currentOrigin = window.location.origin;
  const isPreviewEnv = currentOrigin.includes('googleusercontent.com') || 
                       currentOrigin.includes('web.app') || 
                       currentOrigin.includes('github.io');
                       
  // Default to MANUAL in preview envs because Standard Auth WILL fail due to Origin Mismatch
  const [authMethod, setAuthMethod] = useState<'STANDARD' | 'MANUAL'>(isPreviewEnv ? 'MANUAL' : 'STANDARD');
  const [manualToken, setManualToken] = useState('');
  const [validatingToken, setValidatingToken] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const handleManualTokenSubmit = async () => {
      if (!manualToken.trim()) return;
      setValidatingToken(true);
      const isValid = await validateManualToken(manualToken.trim());
      if (isValid) {
          window.location.reload(); 
      } else {
          alert("Token Invalid or Expired. Please follow the steps to generate a fresh one.");
          setValidatingToken(false);
      }
  };

  const handleCopyOrigin = () => {
      navigator.clipboard.writeText(currentOrigin);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 max-w-lg w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-950/50 p-8 text-center border-b border-slate-800">
           <div className="mx-auto bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
             </svg>
           </div>
           <h1 className="text-3xl font-black text-white tracking-tight mb-2">Project Watcher</h1>
           <p className="text-slate-400">Secure Dashboard Access</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800">
            <button 
                onClick={() => setAuthMethod('MANUAL')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${authMethod === 'MANUAL' ? 'bg-slate-900 text-indigo-400 border-b-2 border-indigo-500' : 'bg-slate-950 text-slate-500 hover:text-slate-300'}`}
            >
                Preview Mode (Recommended)
            </button>
            <button 
                onClick={() => setAuthMethod('STANDARD')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${authMethod === 'STANDARD' ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-500' : 'bg-slate-950 text-slate-500 hover:text-slate-300'}`}
            >
                Production Login
            </button>
        </div>

        <div className="p-8">
            {authMethod === 'MANUAL' ? (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl">
                        <h3 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" /></svg>
                            Why Manual Token?
                        </h3>
                        <p className="text-sm text-indigo-200/70 leading-relaxed">
                            Google blocks logins from dynamic preview URLs (like this one). 
                            To connect your sheet, we generate a secure token on Google's trusted developer playground and paste it here.
                        </p>
                    </div>

                    <ol className="space-y-4 text-sm text-slate-300">
                        <li className="flex gap-4 items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">1</span>
                            <div>
                                <a href="https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=unchecked&oauthEndpointSelect=Google&oauthAuthEndpointValue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth&oauthTokenEndpointValue=https%3A%2F%2Foauth2.googleapis.com%2Ftoken&includeCredentials=unchecked&accessTokenType=bearer&autoRefreshToken=unchecked&accessType=offline&forceAprovalPrompt=unchecked&response_type=code" target="_blank" className="text-indigo-400 underline hover:text-indigo-300 font-bold">Open Google OAuth Playground</a>
                                <p className="text-slate-500 text-xs mt-1">Pre-configured for Google Sheets access.</p>
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">2</span>
                            <div>
                                Click the blue <strong>Authorize APIs</strong> button and sign in.
                            </div>
                        </li>
                        <li className="flex gap-4 items-start">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">3</span>
                            <div>
                                Click <strong>Exchange authorization code for tokens</strong>.
                            </div>
                        </li>
                         <li className="flex gap-4 items-start">
                             <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">4</span>
                            <div>
                                Copy the <strong>Access Token</strong> (starts with <code>ya29...</code>).
                            </div>
                        </li>
                    </ol>

                    <div className="pt-2">
                        <textarea 
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="Paste your Access Token here..."
                            className="w-full h-20 px-4 py-3 bg-slate-950 border-2 border-slate-800 text-white rounded-xl focus:border-indigo-500 outline-none text-xs font-mono mb-4 resize-none"
                        />
                        <button
                            onClick={handleManualTokenSubmit}
                            disabled={!manualToken.trim() || validatingToken}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {validatingToken ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                            Connect Dashboard
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-6">
                     <div className="bg-emerald-900/20 border border-emerald-500/30 p-5 rounded-2xl">
                        <h3 className="text-emerald-400 font-bold mb-2 text-sm uppercase tracking-wider">Production Setup</h3>
                        <p className="text-sm text-emerald-200/70 leading-relaxed mb-4">
                            Standard Google Login only works if this EXACT URL is whitelisted in your Google Cloud Console.
                        </p>
                        
                        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-center justify-between gap-2">
                            <code className="text-xs text-slate-300 font-mono truncate">{currentOrigin}</code>
                            <button onClick={handleCopyOrigin} className="text-xs bg-slate-800 px-2 py-1 rounded text-white hover:bg-slate-700 transition-colors">
                                {copySuccess || 'Copy'}
                            </button>
                        </div>
                    </div>

                    {!hasValidConfig ? (
                        <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Client ID</label>
                                <input type="text" value={tempId} onChange={(e) => setTempId(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" placeholder="Paste Client ID" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Spreadsheet ID</label>
                                <input type="text" value={tempSheetId} onChange={(e) => setTempSheetId(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" placeholder="Paste Sheet ID" />
                            </div>
                             <button onClick={() => onSaveConfig(tempId, tempSheetId)} disabled={!tempId.trim() || !tempSheetId.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-widest mt-2">Save Configuration</button>
                        </div>
                    ) : (
                         <div className="space-y-4">
                            <button onClick={handleAuthClick} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95">
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                                <span>Sign in with Google</span>
                            </button>
                            <button onClick={() => onSaveConfig('', '')} className="block w-full text-xs text-slate-500 hover:text-white underline">Reset Client ID</button>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-center">
             <button onClick={onEnterDemo} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors px-4 py-2 rounded-lg hover:bg-slate-900">
                View Demo Version
             </button>
        </div>
      </div>
    </div>
  );
};
