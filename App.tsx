
import React, { useState, useEffect } from 'react';
import { 
  FileAudio, 
  Upload, 
  Mic, 
  History, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  User, 
  Send, 
  FileText,
  Copy,
  Download,
  Share2,
  X,
  Plus,
  Calendar,
  LogOut
} from 'lucide-react';
import { AppState, MeetingMemo, ActionItem, GeminiResponse, User as UserType } from './types';
import { processMeetingAudio } from './services/geminiService';
import AudioRecorder from './components/AudioRecorder';
import MeetingHistory from './components/MeetingHistory';
import Auth from './components/Auth';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [state, setState] = useState<AppState>(AppState.AUTH);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [memos, setMemos] = useState<MeetingMemo[]>([]);
  const [currentMemo, setCurrentMemo] = useState<MeetingMemo | null>(null);
  const [manualTranscript, setManualTranscript] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Check for existing session and load history
  useEffect(() => {
    const savedUser = localStorage.getItem('mmp_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setState(AppState.LANDING);
    }

    const savedMemos = localStorage.getItem('meeting_memos');
    if (savedMemos) {
      setMemos(JSON.parse(savedMemos));
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (memos.length > 0) {
      localStorage.setItem('meeting_memos', JSON.stringify(memos));
    }
  }, [memos]);

  const handleLogout = () => {
    localStorage.removeItem('mmp_user');
    setCurrentUser(null);
    setState(AppState.AUTH);
  };

  const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // The Gemini API needs the raw base64 string without the data:audio/...;base64, prefix
        const base64String = result.split(',')[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to extract base64 from file."));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleProcessing = async (audioBlob?: Blob, transcript?: string) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setState(AppState.PROCESSING);
      setUploadError(null);
      setLoadingProgress(10);

      let base64 = '';
      let mimeType = '';

      if (audioBlob) {
        setLoadingProgress(30);
        // CRITICAL FIX: Robust base64 conversion
        base64 = await fileToBase64(audioBlob);
        mimeType = audioBlob.type || 'audio/webm';
        
        // Ensure we support the specific file types mentioned (mp3, wav, m4a)
        // If blob type is empty, we might need to guess from file extension if possible, 
        // but typically the browser handles this correctly.
        if (mimeType.includes('octet-stream')) {
          // Fallback if mime type detection fails
          mimeType = 'audio/mpeg'; 
        }
      }

      setLoadingProgress(60);
      const result: GeminiResponse = await processMeetingAudio(base64, mimeType, transcript);
      
      setLoadingProgress(90);
      const newMemo: MeetingMemo = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: `Meeting - ${new Date().toLocaleString()}`,
        summary: result.summary,
        keyPoints: result.keyPoints,
        actionItems: result.actionItems,
        followUps: result.followUps,
        transcript: result.transcript,
        userId: currentUser.id
      };

      setMemos(prev => [newMemo, ...prev]);
      setCurrentMemo(newMemo);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error("Processing error:", err);
      setUploadError(err.message || 'An error occurred during audio processing. Please check your file format and try again.');
      setState(AppState.LANDING);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation for hackathon safety
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/x-m4a', 'audio/webm', 'video/webm'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.m4a') && !file.name.endsWith('.mp3')) {
        console.warn("Unrecognized audio type:", file.type);
      }
      handleProcessing(file);
    }
  };

  const deleteMemo = (id: string) => {
    setMemos(prev => prev.filter(m => m.id !== id));
    if (currentMemo?.id === id) {
      setCurrentMemo(null);
      setState(AppState.LANDING);
    }
  };

  const exportAsMarkdown = () => {
    if (!currentMemo) return;
    const content = `
# ${currentMemo.title}
Date: ${new Date(currentMemo.timestamp).toLocaleString()}

## Summary
${currentMemo.summary}

## Key Points
${currentMemo.keyPoints.map(p => `- ${p}`).join('\n')}

## Action Items
${currentMemo.actionItems.map(a => `- **${a.owner}**: ${a.task}`).join('\n')}

## Follow Ups
${currentMemo.followUps.map(f => `- ${f}`).join('\n')}

---
Generated by Meeting Memo Pro
    `.trim();
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${currentMemo.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navigation / Header */}
      {state !== AppState.AUTH && (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setState(AppState.LANDING)}>
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Sparkles className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Meeting Memo Pro</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button 
                onClick={() => setState(AppState.HISTORY)}
                className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-indigo-600 px-2 sm:px-3 py-2 rounded-lg transition-colors"
              >
                <History size={18} />
                <span className="hidden sm:inline">History</span>
              </button>
              
              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
              
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-900">{currentUser?.name}</span>
                  <span className="text-[10px] text-gray-400 leading-none">{currentUser?.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main>
        {/* Auth Page */}
        {state === AppState.AUTH && (
          <Auth onLogin={(user) => {
            setCurrentUser(user);
            setState(AppState.LANDING);
          }} />
        )}

        {/* Landing Page */}
        {state === AppState.LANDING && (
          <div className="max-w-4xl mx-auto pt-16 pb-12 px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Transcribe & Summarize
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Transform any meeting recording into actionable intelligence. Perfect for teams who want to stay aligned without taking manual notes.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 -m-8 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute bottom-0 left-0 -m-8 w-40 h-40 bg-purple-50 rounded-full blur-3xl opacity-50"></div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                
                {/* File Upload Area */}
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="bg-indigo-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-indigo-600" size={24} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Upload Audio</h3>
                    <p className="text-sm text-gray-500">MP3, WAV, M4A, WebM</p>
                  </div>

                  <div className="relative py-2 flex items-center">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink mx-4 text-xs font-bold text-gray-400 uppercase tracking-widest">or record live</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                  </div>

                  <AudioRecorder onRecordingComplete={(blob) => handleProcessing(blob)} />
                </div>

                {/* Text Transcript Area */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <FileText size={18} className="mr-2 text-indigo-600" />
                    Paste Transcript
                  </h3>
                  <textarea
                    placeholder="Already have a transcript? Paste it here to get an instant summary and action items..."
                    className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                    value={manualTranscript}
                    onChange={(e) => setManualTranscript(e.target.value)}
                  ></textarea>
                  <button
                    disabled={!manualTranscript.trim() || loading}
                    onClick={() => handleProcessing(undefined, manualTranscript)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98]"
                  >
                    Generate Intelligence
                  </button>
                </div>
              </div>

              {uploadError && (
                <div className="mt-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start animate-in fade-in zoom-in duration-300">
                  <X size={18} className="mr-2 mt-0.5" />
                  <div>
                    <p className="font-bold">Error Processing Audio</p>
                    <p>{uploadError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-gray-100">
                <Sparkles className="text-indigo-600 mb-4" size={24} />
                <h4 className="font-bold mb-2 text-gray-900">AI Transcription</h4>
                <p className="text-sm text-gray-500">World-class speech recognition converts your audio to accurate text in seconds.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-gray-100">
                <CheckCircle2 className="text-green-600 mb-4" size={24} />
                <h4 className="font-bold mb-2 text-gray-900">Task Detection</h4>
                <p className="text-sm text-gray-500">Gemini identifies tasks and owners automatically from the conversation context.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-gray-100">
                <History className="text-purple-600 mb-4" size={24} />
                <h4 className="font-bold mb-2 text-gray-900">Cloud History</h4>
                <p className="text-sm text-gray-500">Never lose a decision again. All summaries are saved for easy search and retrieval.</p>
              </div>
            </div>
          </div>
        )}

        {/* Processing View */}
        {state === AppState.PROCESSING && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FileAudio className="text-indigo-600 animate-pulse" size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Meeting...</h2>
            <p className="text-gray-500 text-center max-w-sm">
              Our AI is transcribing and extracting the most important insights for you. This usually takes a few seconds.
            </p>
            <div className="w-full max-w-xs bg-gray-200 h-1.5 rounded-full mt-8 overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Result View */}
        {state === AppState.RESULT && currentMemo && (
          <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-start justify-between mb-10 space-y-4 md:space-y-0">
              <div className="flex-1">
                <div className="flex items-center text-sm text-indigo-600 font-bold mb-2 uppercase tracking-widest">
                  <CheckCircle2 size={16} className="mr-1.5" />
                  Analysis Complete
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">{currentMemo.title}</h1>
                <div className="flex items-center mt-2 text-gray-500 text-sm space-x-4">
                  <span className="flex items-center"><Calendar size={14} className="mr-1" /> {new Date(currentMemo.timestamp).toLocaleDateString()}</span>
                  <span className="flex items-center"><Clock size={14} className="mr-1" /> {new Date(currentMemo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <button 
                  onClick={exportAsMarkdown}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm shadow-sm"
                >
                  <Download size={18} />
                  <span>Download MD</span>
                </button>
                <button 
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-medium text-sm shadow-md"
                  onClick={() => {
                    alert("Syncing with cloud workspace...");
                  }}
                >
                  <Share2 size={18} />
                  <span>Sync to Workspace</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Summary & Points */}
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold mb-4 flex items-center text-gray-900">
                    <FileText className="mr-2 text-indigo-600" />
                    Executive Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg italic">
                    {currentMemo.summary}
                  </p>
                </section>

                <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900">
                    <Clock className="mr-2 text-indigo-600" />
                    Key Discussion Points
                  </h3>
                  <ul className="space-y-4">
                    {currentMemo.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="mt-1.5 mr-3 w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700 font-medium">{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center">
                      <Sparkles className="mr-2 text-indigo-400" />
                      Full Transcription
                    </h3>
                    <button 
                      onClick={() => {
                        if (currentMemo.transcript) {
                          navigator.clipboard.writeText(currentMemo.transcript);
                          alert("Transcript copied to clipboard!");
                        }
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-400 max-h-60 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/20 leading-relaxed italic">
                    {currentMemo.transcript || "Transcription not generated for this memo."}
                  </div>
                </section>
              </div>

              {/* Right Column: Action Items & Follow Ups */}
              <div className="space-y-8">
                <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center text-indigo-600">
                    <CheckCircle2 className="mr-2" size={18} />
                    Assigned Tasks
                  </h3>
                  <div className="space-y-3">
                    {currentMemo.actionItems.length === 0 ? (
                      <p className="text-gray-500 text-sm p-4 bg-gray-50 rounded-xl text-center">No action items detected.</p>
                    ) : (
                      currentMemo.actionItems.map((item, idx) => (
                        <div key={idx} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 hover:border-indigo-300 transition-colors">
                          <p className="text-sm text-gray-900 font-semibold mb-2">{item.task}</p>
                          <div className="flex items-center text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest">
                            <User size={12} className="mr-1" />
                            Owner: {item.owner}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center text-purple-600">
                    <Send className="mr-2" size={18} />
                    Follow Ups
                  </h3>
                  <div className="space-y-3">
                    {currentMemo.followUps.length === 0 ? (
                      <p className="text-gray-500 text-sm p-4 bg-gray-50 rounded-xl text-center">No follow-ups detected.</p>
                    ) : (
                      currentMemo.followUps.map((item, idx) => (
                        <div key={idx} className="flex items-start p-3 hover:bg-purple-50 rounded-xl transition-colors">
                          <CheckCircle2 size={14} className="text-purple-400 mt-1 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-lg overflow-hidden relative group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                     <FileAudio size={120} />
                   </div>
                   <h4 className="font-bold mb-2 relative z-10">Sync to Slack & Notion</h4>
                   <p className="text-xs text-white/80 mb-4 relative z-10 leading-relaxed">
                     Automate your workflow by pushing these results directly to your team's favorite collaboration tools.
                   </p>
                   <button 
                     onClick={() => alert("Connecting to Cloud APIs...")}
                     className="w-full py-3 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all relative z-10 shadow-sm"
                   >
                     Connect Now
                   </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* History View */}
        {state === AppState.HISTORY && (
          <MeetingHistory 
            memos={memos.filter(m => m.userId === currentUser?.id)} 
            onSelect={(m) => {
              setCurrentMemo(m);
              setState(AppState.RESULT);
            }} 
            onDelete={deleteMemo}
            onBack={() => setState(AppState.LANDING)}
          />
        )}
      </main>

      {/* Footer */}
      {state !== AppState.AUTH && (
        <footer className="mt-20 py-12 border-t border-gray-200 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-400 mb-2">
            <Sparkles size={16} />
            <span className="text-sm font-semibold uppercase tracking-widest">Meeting Memo Pro</span>
          </div>
          <p className="text-xs text-gray-500">
            Intelligent Meeting Automation &bull; Secure AI Processing
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
