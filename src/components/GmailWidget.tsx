import React, { useState } from 'react';
import { GmailAPI } from '../lib/workspace';
import { Mail, Send, Loader, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface GmailWidgetProps {
  userEmail: string;
  gmailLog: { to: string; subject: string; body: string; time: string }[];
  setGmailLog: React.Dispatch<React.SetStateAction<{ to: string; subject: string; body: string; time: string }[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function GmailWidget({ userEmail, gmailLog, setGmailLog, addToast }: GmailWidgetProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Smart Room Scheduling Notice');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !message.trim()) return;

    // MANDATORY USER CONFIRMATION
    const confirmed = window.confirm(
      `Confirm sending this custom email on behalf of your Google account to "${to}"?\nSubject: "${subject}"`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      // Build visual html layout for professional look
      const htmlBody = `
        <div style="font-family: sans-serif; background-color: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #4f46e5; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Smart Workspace Notification</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            ${message.replace(/\n/g, '<br />')}
          </p>
          <div style="margin-top: 35px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
            Sent automatically on behalf of <strong>${userEmail}</strong> through the Smart Room Scheduler Dashboard application. 
          </div>
        </div>
      `;

      await GmailAPI.sendEmail(to, subject, htmlBody);
      setGmailLog((prev) => [
        {
          to,
          subject,
          body: message,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      if (addToast) {
        addToast(`Email sent successfully to ${to}!`, 'success');
      } else {
        alert(`Email sent successfully to ${to}!`);
      }
      setMessage('');
    } catch (err: any) {
      if (addToast) {
        addToast(err.message || 'Gmail transmission failed.', 'error');
      } else {
        alert(err.message || 'Gmail transmission failed.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleApplyTemplate = (type: 'invite' | 'alert') => {
    if (type === 'invite') {
      setSubject('Smart Room Selection: Collaborative Scrum Sync Invitation');
      setMessage(
        "Hi Team,\n\nWe have scheduled the focus/scrum session in our designated room on Google Calendar.\nWe've booked 'Boardroom Alpha' to review the active sprints and design structures.\n\nAll attachments are available in Google Drive under the receipts logs folder.\n\nBest,\nCollaborative Team"
      );
    } else {
      setSubject('Room Scheduling Conflict Status update');
      setMessage(
        "Hello Office Coordinators,\n\nPlease note 'Focus Studio' represents active usage for strategic testing. Let me know if any other team needs alternative bookings.\n\nThanks!"
      );
    }
  };

  return (
    <div id="gmail_integration_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
        <Mail className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl font-semibold tracking-tight">Gmail Notification Dispatcher</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Quickly send stylized email invitations and scheduling alerts directly on behalf of your email account:
          </p>

          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">
              Message Presets
            </span>
            <button
              onClick={() => handleApplyTemplate('invite')}
              className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-xs text-slate-200 transition-all flex items-center justify-between group"
            >
              <span>Collaboration Invitation</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>
            <button
              onClick={() => handleApplyTemplate('alert')}
              className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-xs text-slate-200 transition-all flex items-center justify-between group"
            >
              <span>Reservation Conflict Alert</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSendEmail} className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                Recipient Email
              </label>
              <input
                type="email"
                required
                placeholder="co-worker@company.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-xs py-2 px-3 text-slate-100 placeholder:text-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                required
                placeholder="Enter Subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-xs py-2 px-3 text-slate-100 placeholder:text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              Styled Body Message
            </label>
            <textarea
              required
              rows={4}
              placeholder="Type your formal scheduling instructions, agenda items or invite alerts..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg text-xs p-3 text-slate-100 placeholder:text-slate-700"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 block">
              Sender Account: <strong className="text-slate-400">{userEmail}</strong>
            </span>
            <button
              type="submit"
              disabled={sending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {sending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Sending...' : 'Send Invitation HTML'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Sent Transmissions and QR Check-ins outbox register */}
      <div className="mt-6 pt-6 border-t border-slate-850">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-indigo-400" />
          Recent Gmail Delivery Outbox ({gmailLog.length})
        </h3>
        {gmailLog.length === 0 ? (
          <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-850/50 text-center text-xs text-slate-500">
            No active email alerts generated in this session yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
            {gmailLog.map((log, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1.5 font-sans">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[9.5px] font-mono text-indigo-350 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded truncate max-w-[200px]">
                    To: {log.to}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0">{log.time}</span>
                </div>
                <div className="font-bold text-[11.5px] text-slate-100 truncate">
                  {log.subject}
                </div>
                <p className="text-[10.5px] text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {log.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-950/20 p-2 rounded-lg border border-slate-900/30">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Sends emails instantly. To reduce inbox clutter, double check recipient email addresses.</span>
      </div>
    </div>
  );
}
