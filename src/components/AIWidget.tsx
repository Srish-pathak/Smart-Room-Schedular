import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Users, Layers, MessageSquare, ArrowRight, Loader2, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { geminiAPI } from '../lib/api';

interface AIWidgetProps {
  onPreselectRoom: (roomId: string) => void;
  addToast: (msg: string, type?: 'success' | 'info') => void;
  availableRooms: Array<{ id: string; name: string; capacity: number; features: string[] }>;
}

export function AIWidget({ onPreselectRoom, addToast, availableRooms }: AIWidgetProps) {
  const [eventType, setEventType] = useState('Lecture');
  const [participants, setParticipants] = useState(30);
  const [equipment, setEquipment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const handleGetRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRecommendation(null);
    try {
      const res = await geminiAPI.recommend({
        eventType,
        participants,
        equipment
      });
      if (res.recommendation) {
        setRecommendation(res.recommendation);
        addToast('Intelligent room recommendation generated!', 'success');
      } else {
        throw new Error('Empirical API response was empty.');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to communicate with AI Coordinator.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  // Help quickly fill the form with typical scenarios for users
  const quickFills = [
    { label: 'Board Meeting', type: 'Board Meeting', count: 12, eq: 'Smart Screen, Conference desk, Glass Board' },
    { label: 'CS Seminar', type: 'Special Seminar', count: 70, eq: 'Dual Laser Projector, Mic, High Density Audio' },
    { label: 'Exams Recital', type: 'Academic Exam', count: 40, eq: 'Inductive Lighting, Writing desks' }
  ];

  return (
    <div className="space-y-8 text-left">
      {/* Visual Header card */}
      <div className="p-6 bg-radial from-indigo-900/40 via-slate-900 to-slate-900 rounded-3xl border border-indigo-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-1.5">
            <span className="bg-indigo-950 text-indigo-400 py-1 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border border-indigo-900/40 font-mono">
              ⚡ LIVE GEMINI-3.5-FLASH
            </span>
            <span className="bg-slate-950 text-slate-400 py-1 px-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-widest border border-slate-850 font-mono">
              CONNECTED
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">Intelligent Space Advisor</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            IIT BHU Smart scheduler uses server-side neural reasoning to analyze seating densities, acoustic requirements, and classroom machinery so you always reserve the optimal space.
          </p>
        </div>
        <div className="flex-shrink-0 bg-slate-950 p-4.5 rounded-2xl border border-slate-850 hidden lg:block">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">ROOMS ANALYZED</div>
          <strong className="text-2xl font-black text-indigo-400 font-mono block mt-0.5">{availableRooms.length} Active</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Input Parameters Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6.5 space-y-6">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-slate-850 pb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Allocation Parameters
          </h3>

          <form onSubmit={handleGetRecommendation} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Academic Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="Lecture">Lecture Recital</option>
                <option value="Conference">Professional Conference</option>
                <option value="Workshop">Hands-on Workshop / Lab</option>
                <option value="Seminar">Colloquium Seminar</option>
                <option value="Board Meeting">Executive Board Meeting</option>
                <option value="Exam">Academic Exam Session</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Target Attendance Count
                </label>
                <span className="text-[11px] text-slate-500 font-mono">{participants} seaters</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>5 Seats</span>
                <span>75 Seats</span>
                <span>150 Seats</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Machinery & Equipment Demands
              </label>
              <input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="e.g. Laser Projector, Mic, Coolers, Power Outlets"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/25 transition-all text-center cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Reasoning Core Allocation...
                </>
              ) : (
                <>
                  <span>Consult Coordinator</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Quick presets area */}
          <div className="pt-4 border-t border-slate-850 space-y-2.5">
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono">Academic Presets</span>
            <div className="flex flex-wrap gap-2">
              {quickFills.map((fill, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setEventType(fill.type);
                    setParticipants(fill.count);
                    setEquipment(fill.eq);
                    addToast(`Loaded parameters for ${fill.label}`);
                  }}
                  className="bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-850 py-1.5 px-3 rounded-lg text-[10.5px] font-medium transition cursor-pointer"
                >
                  {fill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations display panel */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6.5 min-h-[420px] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-slate-850 pb-3">
              Coordinator Advice Output
            </h3>

            <AnimatePresence mode="wait">
              {!recommendation && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 text-center space-y-3"
                >
                  <p className="text-xs text-slate-500 italic max-w-sm mx-auto">
                    Configure your parameters and query the neural coordinator. Available locations and features will be matched dynamically.
                  </p>
                </motion.div>
              )}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 text-center space-y-4"
                >
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
                    <div className="absolute inset-0 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-indigo-400 block animate-pulse">Running live reasoning sequence...</span>
                    <span className="text-[10px] text-slate-500 block">Formulating matching matrices & density safety indices</span>
                  </div>
                </motion.div>
              )}

              {recommendation && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-invert prose-xs text-left max-h-[380px] overflow-y-auto pr-2"
                >
                  <div className="p-5 bg-slate-950 rounded-2xl border border-slate-850/60 leading-relaxed text-slate-300">
                    <ReactMarkdown>{recommendation}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {recommendation && !isLoading && (
            <div className="pt-5 border-t border-slate-850/50 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Agree with recommendation? Redirection ready:
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                {availableRooms.map((room) => {
                  // If the recommendation markdown contains the room name, let user quick-load it!
                  if (recommendation.toLowerCase().includes(room.name.toLowerCase())) {
                    return (
                      <button
                        key={room.id}
                        onClick={() => {
                          onPreselectRoom(room.id);
                          addToast(`Space selected: ${room.name}. Redirection queued!`, 'success');
                        }}
                        className="flex-1 sm:flex-initial bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/30 text-white font-extrabold px-4 py-2 rounded-xl text-[10.5px] uppercase tracking-wider transition-all shadow-md shadow-indigo-950/20 cursor-pointer"
                      >
                        Book {room.name.split(' ')[0]} Now
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
