import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Search, 
  Compass, 
  Building2, 
  Map,
  Hotel,
  Utensils,
  Train,
  Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { geminiAPI } from '../lib/api';

interface AIWidgetProps {
  onPreselectRoom: (roomId: string) => void;
  addToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  availableRooms: Array<{ id: string; name: string; capacity: number; features: string[] }>;
}

export function AIWidget({ onPreselectRoom, addToast, availableRooms }: AIWidgetProps) {
  // Main Subtabs State
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'logistics'>('rooms');

  // Tab 1: Room Recommender States
  const [eventType, setEventType] = useState('Lecture');
  const [participants, setParticipants] = useState(30);
  const [equipment, setEquipment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  // Tab 2: Maps Grounded Surroundings & Logistics States
  const [mapsPrompt, setMapsPrompt] = useState('');
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsResponse, setMapsResponse] = useState<{
    text: string;
    isMock: boolean;
    sources: Array<{
      type: string;
      title: string;
      uri: string;
      snippets?: string[];
    }>;
  } | null>(null);

  // Handler for Room Recommender
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

  // Handler for Maps Grounding
  const handleMapsSearch = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const query = customPrompt || mapsPrompt;
    if (!query.trim()) {
      addToast('Please enter a search prompt or choose a preset.', 'info');
      return;
    }

    setMapsLoading(true);
    setMapsResponse(null);
    try {
      // Get current location if available
      let lat: number | undefined = undefined;
      let lng: number | undefined = undefined;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (geoErr) {
          console.log('Falling back to default Varanasi coordinates:', geoErr);
        }
      }

      const res = await geminiAPI.queryMaps({
        prompt: query,
        latitude: lat,
        longitude: lng
      });

      if (res && res.text) {
        setMapsResponse({
          text: res.text,
          isMock: !!res.isMock,
          sources: res.sources || []
        });
        addToast('Maps Grounded information retrieved successfully!', 'success');
      } else {
        throw new Error('API returned empty results.');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to search nearby spots.', 'error');
    } finally {
      setMapsLoading(false);
    }
  };

  // Quick presets for Room Recommender
  const quickFills = [
    { label: 'Board Meeting', type: 'Board Meeting', count: 12, eq: 'Smart Screen, Conference desk, Glass Board' },
    { label: 'CS Seminar', type: 'Special Seminar', count: 70, eq: 'Dual Laser Projector, Mic, High Density Audio' },
    { label: 'Exams Recital', type: 'Academic Exam', count: 40, eq: 'Inductive Lighting, Writing desks' }
  ];

  // Quick presets for Google Maps Grounding
  const mapsPresets = [
    { 
      label: '🏨 Nearby Hotels', 
      icon: Hotel,
      prompt: 'Find the best hotels, stay options, and guest houses near IIT BHU Varanasi for visiting delegates.' 
    },
    { 
      label: '🍽️ Top Dining & Cafes', 
      icon: Utensils,
      prompt: 'What are the best places to eat, cafeterias, or premium restaurants near the IIT BHU campus?' 
    },
    { 
      label: '🚆 Varanasi Transit Hubs', 
      icon: Train,
      prompt: 'How to reach IIT BHU from Varanasi Cantt Junction, Lal Bahadur Shastri Airport, or other transit spots?' 
    },
    { 
      label: '🏛️ Campus Landmarks', 
      icon: Compass,
      prompt: 'Where is Shri Vishwanath Mandir (VT) and other key landmarks located relative to the IIT BHU campus?' 
    }
  ];

  return (
    <div className="space-y-8 text-left">
      {/* Visual Header Card */}
      <div className="p-6 bg-radial from-indigo-900/40 via-slate-900 to-slate-900 rounded-3xl border border-indigo-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-indigo-950 text-indigo-400 py-1 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border border-indigo-900/40 font-mono">
              ⚡ LIVE GEMINI-3.5-FLASH
            </span>
            <span className="bg-emerald-950 text-emerald-400 py-1 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border border-emerald-900/40 font-mono flex items-center gap-1">
              <Map className="w-3 h-3" /> MAPS GROUNDED
            </span>
            <span className="bg-slate-950 text-slate-400 py-1 px-2.5 rounded-lg text-[9px] font-semibold uppercase tracking-widest border border-slate-850 font-mono">
              CONNECTED
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">Intelligent Advisor & Grounded Guides</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            IIT BHU Smart Space Coordinator offers real-time room matching and campus logistics guide powered by Google Maps grounding. Look up nearby hotels, transport options, cafes, or landmarks dynamically.
          </p>
        </div>
        <div className="flex-shrink-0 bg-slate-950 p-4.5 rounded-2xl border border-slate-850 hidden lg:block">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">COORDINATOR MODES</div>
          <strong className="text-lg font-black text-indigo-400 font-mono block mt-0.5">Dual Intelligence</strong>
        </div>
      </div>

      {/* Mode Subtabs Selector */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('rooms')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'rooms' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Room Recommender
        </button>
        <button
          onClick={() => setActiveSubTab('logistics')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'logistics' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Campus Surroundings & Logistics Guide
        </button>
      </div>

      {activeSubTab === 'rooms' ? (
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Geolocation & Maps Parameters */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6.5 space-y-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-slate-850 pb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              Surroundings Search
            </h3>

            <form onSubmit={(e) => handleMapsSearch(e)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  What are you looking for?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mapsPrompt}
                    onChange={(e) => setMapsPrompt(e.target.value)}
                    placeholder="e.g. Restaurants, hotels near IIT BHU, Varanasi Cantt..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-3 pr-10 text-xs text-slate-200 placeholder:text-slate-650 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-2.5 p-1 text-slate-500 hover:text-white transition cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Uses real-time coordinate data with live Google Maps API grounding to fetch verified local places, railways, temples, and stays.
                </p>
              </div>

              <button
                type="submit"
                disabled={mapsLoading}
                className="w-full bg-emerald-650 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/25 transition-all text-center cursor-pointer"
              >
                {mapsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Querying Location Index...
                  </>
                ) : (
                  <>
                    <span>Search Coordinates</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Location Presets */}
            <div className="pt-4 border-t border-slate-850 space-y-2.5">
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono">Popular Logistics Queries</span>
              <div className="grid grid-cols-1 gap-2">
                {mapsPresets.map((preset, i) => {
                  const IconComp = preset.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setMapsPrompt(preset.prompt);
                        handleMapsSearch(undefined, preset.prompt);
                      }}
                      className="flex items-center gap-2.5 bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-850 p-2.5 rounded-xl text-[11px] font-medium transition text-left cursor-pointer"
                    >
                      <IconComp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Maps Grounding Output display panel */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6.5 min-h-[420px] flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                  Live Grounded Advice
                </h3>
                {mapsResponse && (
                  <span className="bg-emerald-950 text-emerald-400 py-0.5 px-2 rounded text-[9px] font-bold font-mono border border-emerald-900/30">
                    {mapsResponse.isMock ? 'SIMULATED DATA' : 'GOOGLE MAPS LIVE'}
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!mapsResponse && !mapsLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-16 text-center space-y-3"
                  >
                    <p className="text-xs text-slate-500 italic max-w-sm mx-auto">
                      Query about nearby infrastructure or select one of the verified location presets. We'll map live coordinates and ground the answers with real locations.
                    </p>
                  </motion.div>
                )}

                {mapsLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-16 text-center space-y-4"
                  >
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
                      <div className="absolute inset-0 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-emerald-400 block animate-pulse">Running location grounding...</span>
                      <span className="text-[10px] text-slate-500 block">Querying Google Maps place matrices for Varanasi & surrounding grid</span>
                    </div>
                  </motion.div>
                )}

                {mapsResponse && !mapsLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5 text-left"
                  >
                    {/* Markdown Answer */}
                    <div className="prose prose-invert prose-xs max-h-[300px] overflow-y-auto pr-1">
                      <div className="p-5 bg-slate-950 rounded-2xl border border-slate-850/60 leading-relaxed text-slate-300">
                        <ReactMarkdown>{mapsResponse.text}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Google Maps Grounded Places list - MANDATORY as per guidelines */}
                    {mapsResponse.sources && mapsResponse.sources.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          Grounded Location Links ({mapsResponse.sources.length})
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {mapsResponse.sources.map((src, index) => (
                            <a
                              key={index}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="group block p-3.5 bg-slate-950 hover:bg-slate-850/60 border border-slate-850 hover:border-slate-700 rounded-xl transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-450 transition-colors line-clamp-1">
                                  {src.title}
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors flex-shrink-0 mt-0.5" />
                              </div>
                              
                              {src.snippets && src.snippets.length > 0 ? (
                                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-normal italic">
                                  "{src.snippets[0]}"
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Click to view maps coordinates & route directions
                                </p>
                              )}
                              
                              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-450 font-bold uppercase tracking-wider mt-2 group-hover:underline">
                                View in Maps
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info panel */}
            <div className="pt-4 border-t border-slate-850/50 flex items-start gap-2.5 text-slate-500 text-[10px] leading-relaxed">
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>
                Google Maps Grounding retrieves exact geospatial coordinate listings relative to IIT BHU, Varanasi. It helps organizers manage accommodation bookings, delegates' lunches, transit coordinates, and academic travel seamlessly.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
