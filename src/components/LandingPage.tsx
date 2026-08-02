import React, { useState } from 'react';
import { 
  Calendar, 
  Sparkles, 
  Video, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Building2, 
  Zap, 
  Smartphone, 
  ChevronDown, 
  Mail, 
  MessageSquare, 
  Sun, 
  Moon, 
  MapPin, 
  Star,
  Layers,
  HelpCircle,
  FileText,
  Lock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room } from '../types';

interface LandingPageProps {
  rooms: Room[];
  onEnterApp: () => void;
  onOpenLogin: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function LandingPage({
  rooms,
  onEnterApp,
  onOpenLogin,
  isDarkMode,
  onToggleDarkMode,
}: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (room.building || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                            (selectedCategory === 'available' && room.status === 'available') ||
                            (room.category || '').toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  const faqs = [
    {
      q: "How does the automatic Google Calendar & Meet integration work?",
      a: "When a room booking is confirmed or approved, SmartRoom automatically creates an official Google Calendar event, invites all attendees via email, generates a unique Google Meet link, and saves it directly in the booking details."
    },
    {
      q: "What happens if two faculty members request the same time slot?",
      a: "Our zero-conflict engine evaluates requests down to the exact second. If a slot is already occupied, SmartRoom prevents duplicate bookings, alerts the requester, and suggests nearby available rooms with similar capacity."
    },
    {
      q: "Can students book academic lecture halls?",
      a: "Students can request room reservations for verified club events and academic seminars. Student requests route through our Admin & Faculty Approval Queue before final calendar locking."
    },
    {
      q: "How do Digital Room Displays work?",
      a: "Any standard browser or wall-mounted tablet running the Digital Kiosk View displays live room availability, host name, meeting agenda, and a quick 15-minute instant reservation button."
    },
    {
      q: "Are booking reports downloadable for departmental audits?",
      a: "Yes! Admins and Department Chairs can export utilization metrics, peak hours, and room history in CSV, Excel-compatible spreadsheet, and formatted PDF summaries with one click."
    }
  ];

  const features = [
    {
      icon: <Calendar className="w-6 h-6 text-indigo-500" />,
      title: "Google Calendar & Meet Sync",
      desc: "Instant bi-directional synchronization with Google Workspace. Auto-generates Meet links and calendar invitations for all participants."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      title: "Conflict Prevention Engine",
      desc: "Millisecond-accurate schedule validation prevents double bookings and guarantees zero room overlap errors across campus."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-purple-500" />,
      title: "AI Room Allocation Assistant",
      desc: "Powered by Gemini AI. Enter your headcount and required facilities (AC, Smart Board, Projector) to receive instant room recommendations."
    },
    {
      icon: <Smartphone className="w-6 h-6 text-amber-500" />,
      title: "Digital Door Plaque Display",
      desc: "Turn tablet screens into interactive digital door plaques showing live status (Available / Occupied) and quick 15-min instant booking."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-500" />,
      title: "Department Analytics & Reports",
      desc: "Monitor occupancy rates, peak hours, and room demand with real-time graphs and exportable CSV/PDF audit logs."
    },
    {
      icon: <Lock className="w-6 h-6 text-rose-500" />,
      title: "Role-Based Access Control",
      desc: "Granular authorization levels for Admins, Faculty, Staff, and Students with automated approval workflows for protected spaces."
    }
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER / NAVBAR */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isDarkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
                  SmartRoom
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-mono">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">IIT BHU Campus Space Intelligence</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="#rooms" className="hover:text-indigo-400 transition-colors">Live Spaces</a>
            <a href="#analytics" className="hover:text-indigo-400 transition-colors">Analytics</a>
            <a href="#testimonials" className="hover:text-indigo-400 transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-indigo-400 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleDarkMode}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenLogin}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Sign In
            </button>

            <button
              onClick={onEnterApp}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Launch App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION - IIT (BHU) PORTAL SPACES HERO BANNER */}
      <section className="relative w-full overflow-hidden bg-[#0a4735] text-white">
        {/* Background Image with elegant overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay scale-105 transform hover:scale-100 transition-all duration-1000" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&q=80&w=1600')" }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a4735] via-[#0a4735]/70 to-[#021f16]" />
        
        {/* Grid Pattern overlay for elegant depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#dfb9650b_1px,transparent_1px),linear-gradient(to_bottom,#dfb9650b_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative z-10 space-y-6 text-left">
          {/* Elegant Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-mono text-[#dfb965]/90 uppercase tracking-widest">
            <span>IIT (BHU) Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#dfb965]/60" />
            <span>Spaces</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#dfb965]/60" />
            <span className="text-white font-bold">Meeting Rooms & Spaces</span>
          </nav>

          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-white leading-tight">
              Meeting Rooms <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dfb965] via-[#f3dfa2] to-[#dfb965]">
                & Spaces
              </span>
            </h1>
            <p className="text-sm md:text-base text-[#faf8f2]/90 font-serif leading-relaxed font-light max-w-2xl">
              Welcome to the premium scheduling ecosystem of IIT (BHU) Varanasi. Reserve state-of-the-art boardrooms, fully equipped lecture theaters, and academic presentation spaces tailored to high-profile institute gatherings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={onEnterApp}
              className="px-8 py-4 bg-[#dfb965] hover:bg-[#d4af37] text-[#0a4735] font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Now</span>
            </button>
            <button
              onClick={onEnterApp}
              className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 text-white font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-[#dfb965]" />
              <span>Interactive Scheduler</span>
            </button>
          </div>

          {/* METRIC BADGES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl pt-10 border-t border-white/10">
            {[
              { label: "Academic Spaces", val: "42+" },
              { label: "Conflict Reduction", val: "99.8%" },
              { label: "Google Meet Sync", val: "Instant" },
              { label: "Active Faculty & Users", val: "1,500+" }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="p-4 rounded-xl bg-white/5 border border-white/10 text-left backdrop-blur-sm"
              >
                <div className="text-2xl font-black text-[#dfb965] font-mono">{stat.val}</div>
                <div className="text-xs text-white/70 font-medium mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className={`py-20 border-t ${isDarkMode ? 'border-slate-800/60 bg-slate-950' : 'border-slate-200 bg-slate-100/50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">ENTERPRISE CAPABILITIES</span>
            <h2 className="text-3xl font-black tracking-tight">Everything required for modern campus scheduling</h2>
            <p className="text-sm text-slate-400">Designed specifically for university departments, faculty, and administrative teams.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-3xl border transition-all hover:scale-[1.01] ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-extrabold mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE ROOM EXPLORER PREVIEW */}
      <section id="rooms" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">LIVE SPACES DIRECTORY</span>
            <h2 className="text-3xl font-black tracking-tight mt-1">Explore Available Campus Rooms</h2>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search building or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs outline-none ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                }`}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available Now</option>
              <option value="Auditorium">Auditoriums</option>
              <option value="Lecture Hall">Lecture Halls</option>
              <option value="Computer Lab">Computer Labs</option>
            </select>
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.slice(0, 6).map((room) => (
            <div 
              key={room.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base">{room.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      <span>{room.building || 'IIT BHU Main Building'} • Floor {room.floor || '1'}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    room.status === 'available'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {room.status === 'available' ? 'Available' : 'Occupied'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{room.capacity} seats</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{room.category || 'Lecture Space'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {room.features.slice(0, 4).map((f, idx) => (
                    <span key={idx} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-800/40 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">Buffer: {room.buffer_time || 15}m</span>
                <button
                  onClick={onEnterApp}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Book Slot</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onEnterApp}
            className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-indigo-400 font-extrabold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>View All {rooms.length} Campus Spaces</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className={`py-20 border-t ${isDarkMode ? 'border-slate-800/60 bg-slate-950' : 'border-slate-200 bg-slate-100/50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">CAMPUS ENDORSEMENTS</span>
            <h2 className="text-3xl font-black tracking-tight">Trusted by Faculty & Departments</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "SmartRoom eliminated overlapping seminar requests in CSE completely. The Google Meet link generation inside the invitation email is seamless.",
                author: "Prof. R. K. Sharma",
                role: "Department Head, Computer Science",
                rating: 5
              },
              {
                quote: "Being able to check-in using digital plaque displays outside lecture halls saves us from endless physical keys and manual attendance lists.",
                author: "Dr. Ananya Verma",
                role: "Associate Dean of Academic Affairs",
                rating: 5
              },
              {
                quote: "The AI Room Recommendation feature instantly suggests the exact room with working projectors and wheel-chair accessibility when we host guest lectures.",
                author: "Siddharth Mehta",
                role: "President, IIT BHU Student Society",
                rating: 5
              }
            ].map((t, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-3xl border flex flex-col justify-between ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    {[...Array(t.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">"{t.quote}"</p>
                </div>
                <div className="pt-6 border-t border-slate-800/40">
                  <h4 className="text-sm font-extrabold text-white">{t.author}</h4>
                  <p className="text-[11px] text-indigo-400 font-medium">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">FREQUENTLY ASKED QUESTIONS</span>
          <h2 className="text-3xl font-black tracking-tight">Got Questions? We Have Answers.</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className={`rounded-2xl border transition-all ${
                isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-sm flex items-center justify-between gap-4 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/40 mt-1">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className={`py-20 border-t ${isDarkMode ? 'border-slate-800/60 bg-slate-950' : 'border-slate-200 bg-slate-100/50'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 font-mono">GET IN TOUCH</span>
            <h2 className="text-3xl font-black tracking-tight">Enterprise & Department Inquiries</h2>
            <p className="text-xs text-slate-400">Need custom room allocations, specialized permissions, or administrative integration?</p>
          </div>

          <form onSubmit={handleContactSubmit} className={`p-8 rounded-3xl border space-y-4 ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {contactSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <h4 className="font-extrabold text-sm">Inquiry Received</h4>
                <p className="text-xs text-slate-300">Thank you! The IIT BHU Scheduling Team will respond to your email within 24 hours.</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Prof. / Dr. / Name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Institute Email</label>
                    <input
                      type="email"
                      required
                      placeholder="user@iitbhu.ac.in"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Department Room Allocation / Feature Request"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details about your inquiry..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Send Inquiry
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`border-t py-12 ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm text-slate-200">SmartRoom Enterprise • IIT BHU</span>
          </div>

          <p className="text-xs font-medium text-slate-500">
            © {new Date().getFullYear()} IIT BHU Smart Room Scheduler. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <button onClick={onEnterApp} className="hover:text-indigo-400">Launch Portal</button>
            <button onClick={onOpenLogin} className="hover:text-indigo-400">Sign In</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
