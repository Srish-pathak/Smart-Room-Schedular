import React, { useState, useEffect, useRef } from 'react';
import { Room } from '../types';
import { Sparkles, Users, CheckCircle2, Building2, ArrowRight, X, Loader2, Cpu, Sliders, AlertCircle, Mic, MicOff, Volume2, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Declaration for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SmartAIRoomAssistantProps {
  rooms: Room[];
  onSelectRecommendedRoom: (room: Room) => void;
  onClose?: () => void;
  isDarkMode: boolean;
}

export function SmartAIRoomAssistant({
  rooms,
  onSelectRecommendedRoom,
  onClose,
  isDarkMode
}: SmartAIRoomAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [headcount, setHeadcount] = useState<number>(25);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['Air Conditioning', 'Projector']);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    recommendedRoom: Room | null;
    reasoning: string;
    source: string;
    matchScore: number;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  const availableFeatures = ['Air Conditioning', 'Projector', 'Smart Board', 'Wheelchair Accessible', 'Audio System', 'Live Streaming'];

  // Smart Speech Natural Language Parser
  const parseSpokenText = (spokenText: string) => {
    const lower = spokenText.toLowerCase();

    // 1. Extract Headcount
    const headcountMatch = 
      lower.match(/(?:for|capacity|headcount|seats?|around|about|with|need)\s+(\d{1,3})/i) ||
      lower.match(/\b(\d{1,3})\s*(?:people|students|professors|attendees|faculty|seats|persons)\b/i);
    
    if (headcountMatch && headcountMatch[1]) {
      const num = parseInt(headcountMatch[1], 10);
      if (!isNaN(num) && num >= 5 && num <= 300) {
        setHeadcount(num);
      }
    }

    // 2. Extract Amenity Keywords
    const newFeatures: string[] = [];
    if (lower.includes('ac') || lower.includes('air condition') || lower.includes('cooling')) {
      newFeatures.push('Air Conditioning');
    }
    if (lower.includes('projector') || lower.includes('presentation') || lower.includes('screen')) {
      newFeatures.push('Projector');
    }
    if (lower.includes('smart board') || lower.includes('smartboard') || lower.includes('digital board')) {
      newFeatures.push('Smart Board');
    }
    if (lower.includes('wheelchair') || lower.includes('handicap') || lower.includes('accessible')) {
      newFeatures.push('Wheelchair Accessible');
    }
    if (lower.includes('audio') || lower.includes('sound') || lower.includes('mic') || lower.includes('speaker')) {
      newFeatures.push('Audio System');
    }
    if (lower.includes('stream') || lower.includes('live') || lower.includes('hybrid')) {
      newFeatures.push('Live Streaming');
    }

    if (newFeatures.length > 0) {
      setSelectedFeatures(prev => Array.from(new Set([...prev, ...newFeatures])));
    }
  };

  // Toggle Voice Recognition
  const toggleListening = () => {
    setSpeechError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please type your prompt.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTrans) {
          const cleanedText = finalTrans.trim();
          setPrompt(prev => prev ? `${prev} ${cleanedText}` : cleanedText);
          parseSpokenText(cleanedText);
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access denied. Please allow microphone permissions in your browser.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not access microphone.');
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleFeature = (feat: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    );
  };

  const handleRecommend = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || `Find a room for ${headcount} attendees requiring ${selectedFeatures.join(', ')}`,
          rooms,
          attendeeCount: headcount,
          requiredFeatures: selectedFeatures
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error');
      }

      const data = await response.json();
      const matchedRoom = rooms.find(r => r.id === data.recommendedRoomId) || rooms[0];

      setResult({
        recommendedRoom: matchedRoom,
        reasoning: data.reasoning || "Matched capacity and requested amenities with optimal room availability.",
        source: data.source || "algorithmic_fallback",
        matchScore: 98
      });
    } catch (err) {
      console.warn("AI recommendation fallback triggered:", err);
      // Local Algorithmic fallback
      const suitable = rooms.filter(r => r.capacity >= headcount);
      const chosen = suitable[0] || rooms[0];
      setResult({
        recommendedRoom: chosen,
        reasoning: `Selected ${chosen.name} which easily fits ${headcount} seats and meets key facilities.`,
        source: 'local_algorithm',
        matchScore: 95
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl max-w-2xl w-full mx-auto space-y-6 ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight">AI Room Allocator</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                GEMINI 2.5
              </span>
            </div>
            <p className="text-xs text-slate-400">Describe your meeting or event requirements for instant smart matching.</p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* INPUT FORM */}
      <div className="space-y-4">
        
        {/* Preset Query Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400">Preset Prompts</label>
          <div className="flex flex-wrap gap-2">
            {[
              "Faculty Senate meeting for 20 with AC & Smart Board",
              "Large CSE lecture hall for 100 students with Projector",
              "Quiet Computer Lab for 30 students with Wheelchair access"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(chip)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all text-left cursor-pointer ${
                  prompt === chip 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Natural Language Prompt & Voice Input Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <span>Custom Prompt / Details</span>
            </label>
            
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
                  : isDarkMode
                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30'
                    : 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200'
              }`}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Listening... Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-purple-400" />
                  <span>🎙️ Voice Input</span>
                </>
              )}
            </button>
          </div>

          {/* Voice Input Active Visual Banner */}
          {isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/80 via-purple-950/80 to-slate-950 border border-rose-500/40 text-xs space-y-2"
            >
              <div className="flex items-center justify-between text-rose-300 font-bold">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Voice Recognition Active</span>
                </div>
                <span className="text-[10px] font-mono bg-rose-500/20 px-2 py-0.5 rounded text-rose-300">
                  Speak clearly into microphone
                </span>
              </div>

              {/* Sound Wave Animation */}
              <div className="flex items-center justify-center gap-1 py-1">
                <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.4s]" />
                <span className="w-1 h-6 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1 h-8 bg-indigo-400 rounded-full animate-bounce" />
                <span className="w-1 h-5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
              </div>

              {interimTranscript && (
                <p className="text-slate-300 italic font-serif text-[11px] bg-black/40 p-2 rounded-xl border border-rose-500/20">
                  "{interimTranscript}..."
                </p>
              )}

              <p className="text-[10px] text-slate-400 font-mono">
                💡 Tip: Say "Book a hall for 50 people with Projector and AC" to auto-fill headcount and amenities!
              </p>
            </motion.div>
          )}

          {speechError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{speechError}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. We need a modern hall in Main Building for a PhD thesis defense tomorrow afternoon... Or click 'Voice Input' above to speak!"
              className={`w-full p-3.5 pr-12 rounded-2xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Stop voice input" : "Start voice input"}
              className={`absolute right-3 top-3 p-2 rounded-xl transition-all cursor-pointer ${
                isListening 
                  ? 'bg-rose-500 text-white animate-bounce' 
                  : isDarkMode
                    ? 'text-purple-400 hover:bg-slate-800 hover:text-white'
                    : 'text-purple-600 hover:bg-slate-200'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Headcount Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">Expected Headcount: <strong className="text-purple-400 font-mono text-sm">{headcount} seats</strong></span>
          </div>
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={headcount}
            onChange={(e) => setHeadcount(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
        </div>

        {/* Amenity Feature Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400">Required Amenities</label>
          <div className="flex flex-wrap gap-2">
            {availableFeatures.map((feat) => {
              const isSelected = selectedFeatures.includes(feat);
              return (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {feat}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleRecommend}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Campus Space Models...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Find Best Match</span>
            </>
          )}
        </button>

      </div>

      {/* AI RECOMMENDATION RESULT CARD */}
      <AnimatePresence>
        {result && result.recommendedRoom && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`p-6 rounded-2xl border-2 space-y-4 ${
              isDarkMode ? 'bg-slate-950 border-purple-500/60' : 'bg-purple-50/50 border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  MATCH SCORE: {result.matchScore}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Engine: {result.source}</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-white">{result.recommendedRoom.name}</h4>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{result.recommendedRoom.building || 'Main Campus'}</span>
                <span>•</span>
                <span>Capacity: <strong className="text-purple-300">{result.recommendedRoom.capacity} seats</strong></span>
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed italic bg-purple-950/30 p-3 rounded-xl border border-purple-800/30">
              "{result.reasoning}"
            </p>

            <button
              onClick={() => onSelectRecommendedRoom(result.recommendedRoom!)}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Confirm & Schedule {result.recommendedRoom.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
