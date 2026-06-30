import React, { useState, useEffect } from 'react';
import { DriveAPI } from '../lib/workspace';
import { DriveFile } from '../types';
import { HardDrive, FileText, UploadCloud, Loader, RefreshCw, Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface DriveWidgetProps {
  receiptLogs: { roomName: string; summary: string; start: string; end: string; agenda?: string }[];
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function DriveWidget({ receiptLogs, addToast }: DriveWidgetProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingLog, setSavingLog] = useState(false);
  const [customLogTitle, setCustomLogTitle] = useState('Workspace-Room-Guide');
  const [customContent, setCustomContent] = useState('');

  const fetchDriveFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await DriveAPI.listFiles();
      setFiles(driveFiles);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to list Google Drive files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveFiles();
  }, []);

  const handleSaveReceiptToDrive = async (logIndex: number) => {
    const log = receiptLogs[logIndex];
    const timestamp = Date.now();
    const filename = `${log.roomName.replace(/\s+/g, '_')}_Booking_Receipt_${timestamp}.html`;
    const hasAgenda = !!log.agenda;

    // Explicit User Confirmation before Mutating/Adding data
    const confirmed = window.confirm(
      hasAgenda
        ? `Confirm uploading BOTH the scheduling receipt AND the meeting agenda documents directly into your Google Drive?`
        : `Confirm uploading the scheduling receipt document "${filename}" directly into your Google Drive?`
    );
    if (!confirmed) return;

    setSavingLog(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Smart Room Booking Receipt</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 500px; margin: 0 auto; }
            h2 { color: #818cf8; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-top: 0; }
            .item { font-size: 14px; margin: 12px 0; }
            .label { color: #94a3b8; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Smart Room Booking Receipt</h2>
            <div class="item"><span class="label">Room:</span> ${log.roomName}</div>
            <div class="item"><span class="label">Meeting:</span> ${log.summary}</div>
            <div class="item"><span class="label">Reserved Start:</span> ${new Date(log.start).toLocaleString()}</div>
            <div class="item"><span class="label">Reserved End:</span> ${new Date(log.end).toLocaleString()}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 30px; text-align: center;">Verified by Smart Room Scheduler Dashboard</div>
          </div>
        </body>
        </html>
      `;

      await DriveAPI.createLogFile(filename, htmlContent);

      if (log.agenda) {
        const agendaFilename = `${log.summary.replace(/\s+/g, '_')}_Meeting_Agenda_${timestamp}.html`;
        const agendaHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Meeting Agenda: ${log.summary}</title>
            <style>
              body { font-family: sans-serif; background: #0b0f19; color: #e2e8f0; padding: 40px; line-height: 1.6; }
              .container { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; max-width: 650px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
              h1 { color: #6366f1; border-bottom: 2px solid #1f2937; padding-bottom: 12px; font-size: 24px; margin-top: 0; }
              h2 { color: #10b981; font-size: 18px; margin-top: 24px; }
              .meta-box { background: #1f2937; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #6366f1; }
              .meta-item { font-size: 13px; margin: 6px 0; color: #9ca3af; }
              .meta-label { color: #f3f4f6; font-weight: bold; }
              .agenda-text { background: #030712; padding: 20px; border-radius: 8px; border: 1px solid #374151; font-family: inherit; font-size: 14px; white-space: pre-wrap; color: #f3f4f6; }
              footer { font-size: 11px; color: #4b5563; margin-top: 40px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📝 Meeting Agenda & Details</h1>
              <div class="meta-box">
                <div class="meta-item"><span class="meta-label">Allocation Space:</span> ${log.roomName}</div>
                <div class="meta-item"><span class="meta-label">Meeting Title:</span> ${log.summary}</div>
                <div class="meta-item"><span class="meta-label">Date & Time:</span> ${new Date(log.start).toLocaleString()} - ${new Date(log.end).toLocaleTimeString()}</div>
              </div>
              <h2>📋 Agenda Details & Discussion Topics</h2>
              <div class="agenda-text">${log.agenda}</div>
              <footer>
                Document saved automatically with Google Workspace Drive integration.<br>
                IIT BHU Smart Room Scheduler Dashboard
              </footer>
            </div>
          </body>
          </html>
        `;
        await DriveAPI.createLogFile(agendaFilename, agendaHtml);
      }

      if (addToast) {
        addToast(
          hasAgenda
            ? `Success! Both the receipt and the meeting agenda documents have been saved to your Google Drive.`
            : `Success! File "${filename}" saved inside your Google Drive.`,
          'success'
        );
      } else {
        alert(
          hasAgenda
            ? `Success! Both the receipt and the meeting agenda documents have been saved to your Google Drive.`
            : `Success! File "${filename}" saved inside your Google Drive.`
        );
      }
      fetchDriveFiles();
    } catch (err: any) {
      if (addToast) {
        addToast(err.message || 'Failed to create Drive doc.', 'error');
      } else {
        alert(err.message || 'Failed to create Drive doc.');
      }
    } finally {
      setSavingLog(false);
    }
  };

  const handleCreateCustomTextFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customContent.trim()) return;

    const fullFilename = `${customLogTitle.trim()}.txt`;

    // User Confirmation
    const confirmed = window.confirm(`Are you sure you want to write the file "${fullFilename}" into your Google Drive?`);
    if (!confirmed) return;

    setSavingLog(true);
    try {
      await DriveAPI.createLogFile(fullFilename, customContent);
      setCustomContent('');
      if (addToast) {
        addToast(`File "${fullFilename}" successfully created in Google Drive!`, 'success');
      } else {
        alert(`File "${fullFilename}" successfully created in Google Drive!`);
      }
      fetchDriveFiles();
    } catch (err: any) {
      if (addToast) {
        addToast(err.message || 'Creation failed.', 'error');
      } else {
        alert(err.message || 'Creation failed.');
      }
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div id="drive_integration_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-teal-400" />
          <h2 className="text-xl font-semibold tracking-tight">Google Drive Hub & Attachments</h2>
        </div>
        <button
          onClick={fetchDriveFiles}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg disabled:opacity-50"
          title="Sync Drive files list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drive Storage List */}
        <div className="bg-slate-950/50 p-4 border border-slate-800/80 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            My Safe Drive Files
          </h3>

          {error && <p className="text-xs text-rose-400 mb-2 font-mono">Error: {error}</p>}

          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-500 text-xs">
              <Loader className="w-4 h-4 animate-spin text-teal-500" />
              Syncing drive...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-600">
              No files visible. Use the uploader to add documents.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-900/40 rounded-lg text-xs hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate text-slate-300 font-mono" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-teal-400 hover:bg-slate-900 rounded border border-slate-800 hover:scale-105 transition-all flex items-center gap-0.5"
                    >
                      <span className="text-[10px]">View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action center (Write Log Document or Quick Receipts to Drive) */}
        <div className="space-y-4">
          <div className="bg-slate-950/50 p-4 border border-slate-800/80 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-teal-400" />
              Save Active Bookings Receipts
            </h3>

            {receiptLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Create a reservation above first to export formal HTML layouts directly onto Google Drive.
              </p>
            ) : (
              <div className="space-y-2">
                {receiptLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-900/30 rounded-lg text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-300">{log.roomName}</span>
                        {log.agenda && (
                          <span className="text-[9px] bg-indigo-950 border border-indigo-850/50 text-indigo-400 font-mono font-bold px-1.5 py-0.2 rounded" title="Captured Meeting Agenda Included">
                            + AGENDA
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{log.summary}</p>
                    </div>
                    <button
                      onClick={() => handleSaveReceiptToDrive(index)}
                      disabled={savingLog}
                      className="shrink-0 bg-teal-950 hover:bg-teal-900 text-teal-400 border border-teal-800/50 text-[10px] uppercase font-bold py-1 px-2.5 rounded-md flex items-center gap-1 transition-all"
                    >
                      {savingLog ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Sync Drive
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create custom note */}
          <form
            onSubmit={handleCreateCustomTextFile}
            className="bg-slate-950/50 p-4 border border-slate-800/80 rounded-xl space-y-2"
          >
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-1">
              Create Smart Document File
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={customLogTitle}
                onChange={(e) => setCustomLogTitle(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none"
                placeholder="Log Title"
              />
              <span className="text-slate-500 text-xs self-center">.txt</span>
            </div>
            <textarea
              required
              rows={2}
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Type any office instructions, policies, or layout guide specifications to save into Google Drive..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none placeholder:text-slate-700"
            />
            <button
              type="submit"
              disabled={savingLog}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {savingLog ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Save Document to Google Drive
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-teal-400 bg-teal-950/20 p-2 rounded-lg border border-teal-900/30">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Securely bound via least privilege oauth scopes. Restricts modifying user personal files.</span>
      </div>
    </div>
  );
}
