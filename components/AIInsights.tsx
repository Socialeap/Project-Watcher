
import React, { useState, useEffect, useRef } from 'react';
import { ProjectAnalysis, ChatMessage } from '../types';
import { 
  createProjectChatSession, 
  sendChatMessage, 
  connectToLiveAnalyst,
  encode,
  decodeBase64,
  decodeAudioData
} from '../services/geminiService';
import { searchProjectsInSheet } from '../services/dataService';
import { Chat } from "@google/genai";

interface AIInsightsProps {
  projects: ProjectAnalysis[];
}

// Helper to smooth visualizer values
const interpolate = (start: number, end: number, factor: number) => start + (end - start) * factor;

export const AIInsights: React.FC<AIInsightsProps> = ({ projects }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [liveTranscription, setLiveTranscription] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>(''); 
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Visualizer State
  const [vizBars, setVizBars] = useState<number[]>([10, 10, 10, 10, 10]);
  const [activeSpeaker, setActiveSpeaker] = useState<'user' | 'ai' | 'idle'>('idle');

  // Mic Test State
  const [isMicCheckActive, setIsMicCheckActive] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Refs for Audio components
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null); 
  const testContextRef = useRef<AudioContext | null>(null);
  
  // Analysers for Visuals
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveSessionRef = useRef<any>(null);
  const isManuallyClosingRef = useRef(false);

  useEffect(() => {
    if (projects.length > 0) {
      const session = createProjectChatSession(projects);
      setChatSession(session);
      setMessages([{ role: 'model', text: 'Health assessment complete. Ask me anything about project status or archived history.', timestamp: new Date() }]);
    }
  }, [projects]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isManuallyClosingRef.current = true;
      stopLiveMode();
      stopMicCheck();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // --- Visualizer Loop ---
  const startVisualizerLoop = () => {
    const bufferLength = 16; // Small FFT size for 5 bars
    const dataArrayInput = new Uint8Array(bufferLength);
    const dataArrayOutput = new Uint8Array(bufferLength);
    
    // Maintain current heights for smoothing
    let currentHeights = [10, 10, 10, 10, 10];

    const loop = () => {
      let inputSum = 0;
      let outputSum = 0;

      // 1. Get Input (User) Data
      if (inputAnalyserRef.current) {
        inputAnalyserRef.current.getByteFrequencyData(dataArrayInput);
        inputSum = dataArrayInput.reduce((a, b) => a + b, 0) / bufferLength;
      }

      // 2. Get Output (AI) Data
      if (outputAnalyserRef.current) {
        outputAnalyserRef.current.getByteFrequencyData(dataArrayOutput);
        outputSum = dataArrayOutput.reduce((a, b) => a + b, 0) / bufferLength;
      }

      // 3. Determine Dominant Source & Color
      let targetData = dataArrayInput;
      let speaker: 'user' | 'ai' | 'idle' = 'idle';

      // Prioritize AI output visual if it's making sound (> 5 to filter noise)
      if (outputSum > 5) {
        speaker = 'ai';
        targetData = dataArrayOutput;
      } else if (inputSum > 5) {
        speaker = 'user';
        targetData = dataArrayInput;
      }

      setActiveSpeaker(speaker);

      // 4. Map Frequency Bands to 5 Bars
      // We pick specific indices from the FFT array to represent Bass -> Treble
      // FFT Size 32 -> ~16 bins. 
      // Indices: 0 (Bass), 2, 4, 7, 10 (Treble)
      const indices = [0, 2, 4, 7, 10];
      const targetHeights = indices.map(i => {
         const val = targetData[i] || 0;
         // Normalize 0-255 to 10-100%
         return Math.max(10, (val / 255) * 100);
      });

      // 5. Smooth Transition
      currentHeights = currentHeights.map((h, i) => interpolate(h, targetHeights[i], 0.3));
      
      setVizBars([...currentHeights]);

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  };

  const stopLiveMode = () => {
    setIsLiveActive(false);
    if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }
    setVizBars([10, 10, 10, 10, 10]);
    setActiveSpeaker('idle');

    if (liveSessionRef.current) {
        try { liveSessionRef.current.close(); } catch(e) {}
        liveSessionRef.current = null;
    }
    
    if (processorRef.current) {
        try { 
            processorRef.current.disconnect(); 
            processorRef.current.onaudioprocess = null;
        } catch (e) {}
        processorRef.current = null;
    }

    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    
    activeSourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    setLiveTranscription('');
  };

  const stopMicCheck = () => {
      if (testContextRef.current) {
          testContextRef.current.close();
          testContextRef.current = null;
      }
      setIsMicCheckActive(false);
      setMicTestLevel(0);
  };

  const toggleMicCheck = async () => {
    if (isMicCheckActive) {
      stopMicCheck();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      testContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      setIsMicCheckActive(true);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!testContextRef.current || testContextRef.current.state === 'closed') return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicTestLevel(average); 
        requestAnimationFrame(draw);
      };
      draw();
      setTimeout(() => { if (testContextRef.current) stopMicCheck(); }, 15000);
    } catch (e) {
      console.error(e);
      alert("Microphone access failed. Please check system permissions.");
    }
  };

  const handleToolCall = async (fc: any) => {
    if (fc.name === 'searchProjectHistory') return await searchProjectsInSheet(fc.args.query);
    return { error: "Unknown tool" };
  };

  const startLiveMode = async () => {
    stopMicCheck();

    try {
      setConnectionStatus('connecting');
      setErrorMessage('');
      setIsLiveMode(true);
      isManuallyClosingRef.current = false;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // --- INPUT SETUP (USER) ---
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputCtx;
      
      // Create Analyser for User Input
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 32; // Low res for visualizer bars
      inputAnalyserRef.current = inputAnalyser;

      // Resampling Checks
      const actualSampleRate = inputCtx.sampleRate;
      const targetSampleRate = 16000;
      const needsResampling = actualSampleRate !== targetSampleRate;
      
      // --- OUTPUT SETUP (AI) ---
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputCtx;

      // Create Analyser for AI Output
      const outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 32;
      outputAnalyserRef.current = outputAnalyser;
      
      // Ensure AI output goes through analyser -> destination
      outputAnalyser.connect(outputCtx.destination);

      setIsLiveActive(true);
      startVisualizerLoop(); // Start Animation

      const sessionPromise = connectToLiveAnalyst(projects, {
        onAudioChunk: async (base64) => {
          const ctx = outputAudioContextRef.current;
          const analyser = outputAnalyserRef.current;
          if (!ctx || !analyser) return;

          if (ctx.state === 'suspended') await ctx.resume();

          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
          const audioBuffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          
          // CRITICAL: Connect Source -> Analyser (which is already connected to Destination)
          source.connect(analyser);
          
          source.onended = () => { activeSourcesRef.current.delete(source); };
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          activeSourcesRef.current.add(source);
        },
        onInterrupted: () => {
          activeSourcesRef.current.forEach(s => s.stop());
          activeSourcesRef.current.clear();
          nextStartTimeRef.current = 0;
          if (outputAudioContextRef.current) nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
        },
        onTranscription: (text) => setLiveTranscription(text),
        onToolCall: handleToolCall,
        onTurnComplete: () => setTimeout(() => setLiveTranscription(''), 3000),
        onClose: (ev) => {
            if (!isManuallyClosingRef.current) {
                console.warn("Unexpected closure", ev);
                setConnectionStatus('closed_unexpectedly');
                stopLiveMode();
                setIsLiveMode(true); 
            } else {
                stopLiveMode();
                setIsLiveMode(false);
            }
        },
        onError: (e) => { 
            console.error("Live API Error", e); 
            setConnectionStatus('error');
            setErrorMessage(e.message || "Unknown API Error");
            stopLiveMode();
            setIsLiveMode(true); 
        }
      });

      liveSessionRef.current = await sessionPromise;
      setConnectionStatus('connected');

      // --- PROCESS INPUT AUDIO ---
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor; 
      
      let resampleBuffer: number[] = [];
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        let finalData: Float32Array;
        
        if (needsResampling) {
            const ratio = actualSampleRate / targetSampleRate;
            for (let i = 0; i < inputData.length; i++) {
                resampleBuffer.push(inputData[i]);
            }
            const neededLen = Math.floor(resampleBuffer.length / ratio);
            if (neededLen > 0) {
                const resampled = new Float32Array(neededLen);
                for (let i = 0; i < neededLen; i++) {
                    const index = Math.floor(i * ratio);
                    resampled[i] = resampleBuffer[index];
                }
                finalData = resampled;
                const usedInputIndex = Math.floor(neededLen * ratio);
                resampleBuffer = resampleBuffer.slice(usedInputIndex);
            } else {
                return;
            }
        } else {
            finalData = inputData;
        }
        
        const int16 = new Int16Array(finalData.length);
        for (let i = 0; i < finalData.length; i++) {
            let s = Math.max(-1, Math.min(1, finalData[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        if (liveSessionRef.current) {
             liveSessionRef.current.sendRealtimeInput({ 
                 media: { 
                     data: encode(new Uint8Array(int16.buffer)), 
                     mimeType: 'audio/pcm;rate=16000' 
                 } 
             });
        }
      };

      const muteGain = inputCtx.createGain();
      muteGain.gain.value = 0; 
      
      // Graph: Source -> InputAnalyser -> Processor -> Mute -> Dest
      source.connect(inputAnalyser);
      inputAnalyser.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(inputCtx.destination);

    } catch (err: any) {
      console.error(err);
      stopLiveMode();
      setIsLiveMode(true); 
      setConnectionStatus('error');
      setErrorMessage(err.message || "Failed to initialize audio or connection.");
      
      if (err.name === 'NotAllowedError') {
          alert("Microphone access denied.");
      }
    }
  };

  const handleManualDisconnect = () => {
      isManuallyClosingRef.current = true;
      stopLiveMode();
      setIsLiveMode(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !chatSession) return;
    const textToSend = input;
    setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: new Date() }]);
    setInput('');
    setLoading(true);
    try {
      const responseText = await sendChatMessage(chatSession, textToSend, async (name, args) => await handleToolCall({ name, args }));
      setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: new Date() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error communicating with analyst.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-10 right-10 w-20 h-20 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl z-[45] flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-4 border-indigo-400/20">
        <span className="absolute -top-1 -right-1 flex h-6 w-6">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-400 border-2 border-slate-900"></span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 md:inset-auto md:bottom-32 md:right-10 w-full md:w-[450px] h-[100dvh] md:h-[750px] bg-slate-900 md:rounded-3xl shadow-2xl border-t md:border-4 border-slate-800 z-[60] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
        
        <div className="bg-slate-950 border-b-2 border-slate-800 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-all ${isLiveActive ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-indigo-950 text-indigo-400 border border-indigo-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-black text-xl text-white tracking-tighter uppercase leading-none">AI Analyst</h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isLiveActive ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                {isLiveActive ? 'LIVE MIC FEED' : 'HYBRID SYSTEM'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-3 bg-slate-900 text-slate-400 rounded-full hover:text-white transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
          </button>
        </div>

        <div className="bg-slate-900 p-4 border-b-2 border-slate-950 flex gap-4">
            <button 
              onClick={() => isLiveActive ? handleManualDisconnect() : startLiveMode()}
              className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl border-2 flex items-center justify-center gap-3 ${
                isLiveActive ? 'bg-red-600 border-red-500 text-white' : 'bg-indigo-600 border-indigo-500 text-white'
              }`}
            >
              {isLiveActive ? (
                <>
                   <span className="animate-pulse">●</span> Disconnect
                </>
              ) : 'Start Voice Chat'}
            </button>
            
            <button
                onClick={toggleMicCheck}
                disabled={isLiveActive}
                className={`px-4 rounded-2xl border-2 font-bold transition-all ${isMicCheckActive ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'}`}
                title="Test Microphone"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7 10a3 3 0 0 1 3-3 3 3 0 0 1 3 3h-6Z" clipRule="evenodd" /><path fillRule="evenodd" d="M6.5 10a3.5 3.5 0 0 1 3.5-3.5 3.5 3.5 0 0 1 3.5 3.5h-7Z" clipRule="evenodd" /><path d="M10 4a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z" /><path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM4.25 10a5.75 5.75 0 0 1 11.5 0h-11.5Z" clipRule="evenodd" /></svg>
            </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/80">
          
          {/* MIC TEST OVERLAY */}
          {isMicCheckActive && !isLiveActive && (
              <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in">
                  <h3 className="text-xl font-bold text-white">Microphone Check</h3>
                  <div className="w-full max-w-[200px] h-40 bg-slate-900 rounded-3xl border-2 border-slate-800 flex items-end justify-center p-4 overflow-hidden relative">
                       <div 
                         className="w-full bg-emerald-500 rounded-t-xl transition-all duration-75"
                         style={{ height: `${Math.min(100, (micTestLevel / 128) * 100)}%` }}
                       ></div>
                       
                       {/* Threshold markers */}
                       <div className="absolute bottom-[20%] w-full h-px bg-slate-700 border-t border-dashed"></div>
                       <div className="absolute bottom-[50%] w-full h-px bg-slate-700 border-t border-dashed"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-2">Speak now to test input...</p>
                    <p className="text-xs text-slate-600 font-mono">Level: {micTestLevel.toFixed(1)}</p>
                  </div>
                  <button onClick={toggleMicCheck} className="px-6 py-2 bg-slate-800 rounded-xl text-white font-bold border border-slate-700">Stop Test</button>
              </div>
          )}

          {isLiveMode ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-10 text-center relative">
                
                {/* ACTIVE VISUALIZER */}
                <div className="flex items-center justify-center gap-2 h-32 w-full max-w-[250px]">
                  {vizBars.map((height, i) => {
                    // Determine Color Based on Speaker
                    let bgColor = 'bg-slate-700';
                    if (activeSpeaker === 'user') bgColor = 'bg-emerald-500';
                    else if (activeSpeaker === 'ai') bgColor = 'bg-indigo-500';
                    
                    return (
                        <div 
                            key={i} 
                            className={`flex-1 rounded-full transition-all duration-[50ms] ease-linear ${bgColor} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
                            style={{ 
                                height: `${height}%`,
                                opacity: activeSpeaker === 'idle' ? 0.3 : 1
                            }}
                        ></div>
                    );
                  })}
                </div>

                <div className="space-y-4 w-full">
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase transition-colors duration-300">
                      {connectionStatus === 'connecting' && 'Connecting...'}
                      {connectionStatus === 'connected' && (
                          activeSpeaker === 'user' ? <span className="text-emerald-400">Listening...</span> :
                          activeSpeaker === 'ai' ? <span className="text-indigo-400">Speaking...</span> :
                          'Standby'
                      )}
                      {connectionStatus === 'error' && <span className="text-red-500">Connection Failed</span>}
                      {connectionStatus === 'closed_unexpectedly' && <span className="text-orange-500">Session Ended</span>}
                  </h3>
                  
                  {connectionStatus === 'error' || connectionStatus === 'closed_unexpectedly' ? (
                      <div className="bg-red-950/50 border-2 border-red-900 rounded-2xl p-6 text-red-200 text-sm">
                          <p className="font-bold mb-2">{connectionStatus === 'error' ? 'Lost connection to AI service.' : 'Session closed unexpectedly.'}</p>
                          {errorMessage && <p className="font-mono text-xs bg-red-900/50 p-2 rounded mb-2">{errorMessage}</p>}
                          <p className="text-xs opacity-70">Check your API Key and Model availability.</p>
                          <button onClick={() => { setIsLiveMode(false); setConnectionStatus(''); }} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition-all">
                              Close
                          </button>
                      </div>
                  ) : (
                    <div className="bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-8 min-h-[150px] flex items-center justify-center text-xl font-medium text-slate-200 shadow-2xl transition-all">
                        {liveTranscription || <span className="opacity-30 italic">Conversation active...</span>}
                    </div>
                  )}
                </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] rounded-3xl px-6 py-4 text-base font-medium leading-relaxed shadow-lg ${
                      msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 border-2 border-slate-700 text-slate-100 rounded-bl-none'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-slate-800 px-6 py-4 rounded-3xl flex gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div></div>}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {!isLiveMode && (
          <div className="p-6 bg-slate-900 border-t-2 border-slate-950 pb-12 md:pb-6">
            <div className="flex gap-4 relative">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask a question..." className="w-full pl-6 pr-16 py-5 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:border-indigo-500 outline-none text-base text-white font-medium" />
              <button onClick={handleSend} className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 shadow-lg active:scale-90 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
      
      <button onClick={() => setIsOpen(false)} className="fixed bottom-10 right-10 w-20 h-20 bg-slate-800 text-slate-400 border-4 border-slate-700 rounded-full shadow-2xl z-[70] flex items-center justify-center transition-all hover:scale-110 active:scale-90 md:hidden">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </>
  );
};
