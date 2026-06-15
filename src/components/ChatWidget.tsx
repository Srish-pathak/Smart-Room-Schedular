import React, { useState, useEffect } from 'react';
import { ChatAPI } from '../lib/workspace';
import { ChatSpace } from '../types';
import { MessageSquare, Send, RefreshCw, Loader, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatWidgetProps {
  chatLog: { space: string; text: string; time: string }[];
  setChatLog: React.Dispatch<React.SetStateAction<{ space: string; text: string; time: string }[]>>;
}

export default function ChatWidget({ chatLog, setChatLog }: ChatWidgetProps) {
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [messageText, setMessageText] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchSpaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeSpaces = await ChatAPI.listSpaces();
      setSpaces(activeSpaces);
      if (activeSpaces.length > 0) {
        setSelectedSpace(activeSpaces[0].name);
      }
    } catch (err: any) {
      console.warn('Google Chat space load aborted/error:', err.message);
      setError(err.message || 'Unable to scan Google Chat space. Typically requires Google Workspace corporate credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // MANDATORY USER CONFIRMATION
    const spaceLabel = selectedSpace === 'sandbox-space' ? 'Sandbox Chat Space' : (spaces.find(s => s.name === selectedSpace)?.displayName || selectedSpace);
    const confirmed = window.confirm(
      `Confirm sending the announcement to Google Chat space "${spaceLabel}"?\nMessage: "${messageText}"`
    );
    if (!confirmed) return;

    setPosting(true);
    try {
      if (selectedSpace === 'sandbox-space' || !selectedSpace) {
        // Local sandbox simulation
        await new Promise((resolve) => setTimeout(resolve, 600));
        setChatLog((prev) => [
          {
            space: 'Sandbox Chat Space',
            text: messageText,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        alert('Sandbox message recorded successfully! Simulated Google Chat API post executed.');
        setMessageText('');
      } else {
        await ChatAPI.postMessage(selectedSpace, messageText);
        setChatLog((prev) => [
          {
            space: spaces.find((s) => s.name === selectedSpace)?.displayName || selectedSpace,
            text: messageText,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        alert('Message posted to Google Chat space successfully!');
        setMessageText('');
      }
    } catch (err: any) {
      alert(err.message || 'Google Chat posting failed.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div id="google_chat_integration" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-semibold tracking-tight">Google Chat Space Intercom</h2>
        </div>
        <button
          onClick={fetchSpaces}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg disabled:opacity-50"
          title="Refresh Spaces list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Broadcast Center</h3>
          
          <form onSubmit={handlePostMessage} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Target Space / Channel
              </label>
              {loading ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1 font-mono">
                  <Loader className="w-4 h-4 animate-spin text-indigo-500" /> Scanning corporate spaces...
                </div>
              ) : spaces.length === 0 ? (
                <select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-amber-400 focus:outline-none"
                >
                  <option value="sandbox-space">Sandbox Chat Space (Demo Local Simulator)</option>
                </select>
              ) : (
                <select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none"
                >
                  {spaces.map((space) => (
                    <option key={space.name} value={space.name}>
                      {space.displayName}
                    </option>
                  ))}
                  <option value="sandbox-space">Sandbox Chat Space (Demo Local Simulator)</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Message Announcement
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. 📢 Notice: Boardroom Alpha is now occupied for the next 45 minutes for Sprint Retrospective."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-xs p-3 text-slate-100 placeholder:text-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={posting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {posting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {posting ? 'Posting to Space...' : 'Broadcast Announcement'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 bg-amber-950/20 border border-amber-900/40 text-amber-200 rounded-lg flex items-start gap-1.5 text-[11px] leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-semibold">Note on Google Chat:</span> Personal gmail.com accounts generally lack active Chat Spaces. We automatically established the dynamic simulator so you can fully prototype and sync scheduler notices!
              </div>
            </div>
          )}
        </div>

        {/* Messaging Stream Logs */}
        <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl flex flex-col h-[270px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 pb-2 border-b border-slate-9ml0">
            Recent Broadcast Stream
          </h3>

          {chatLog.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs">
              <MessageSquare className="w-8 h-8 text-slate-800 mb-2" />
              <span>No active broadcasts sent yet in this session.</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono">
              {chatLog.map((log, index) => (
                <div key={index} className="p-2.5 bg-slate-950 rounded border border-slate-900 text-xs text-slate-300">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                    <span className="font-bold text-indigo-400">{log.space}</span>
                    <span>{log.time}</span>
                  </div>
                  <p className="text-slate-200 font-sans">{log.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
