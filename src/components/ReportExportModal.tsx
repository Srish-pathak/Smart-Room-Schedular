import React, { useState } from 'react';
import { Booking, Room } from '../types';
import { Download, FileSpreadsheet, FileText, Printer, X, Check, Calendar, Filter } from 'lucide-react';

interface ReportExportModalProps {
  bookings: Booking[];
  rooms: Room[];
  onClose: () => void;
  isDarkMode: boolean;
}

export function ReportExportModal({
  bookings,
  rooms,
  onClose,
  isDarkMode
}: ReportExportModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days'>('all');

  const filteredBookings = bookings.filter(b => {
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Booking ID', 'Room Name', 'Summary', 'Host Email', 'Start Time', 'End Time', 'Status', 'Meet Link'];
    const rows = filteredBookings.map(b => [
      b.id,
      `"${b.roomName || b.room_name || 'Room'}"`,
      `"${b.summary || 'Meeting'}"`,
      `"${b.creatorEmail || b.creator_email || ''}"`,
      `"${b.startTime || b.start_time || ''}"`,
      `"${b.endTime || b.end_time || ''}"`,
      `"${b.status || 'Approved'}"`,
      `"${b.google_meet_link || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IIT_BHU_Room_Bookings_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>IIT BHU Room Booking Audit Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 5px; }
            p { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f1f5f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>IIT BHU Smart Room Scheduler - Executive Report</h1>
          <p>Generated on: ${new Date().toLocaleString()} | Total Records: ${filteredBookings.length}</p>
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Summary</th>
                <th>Host</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBookings.map(b => `
                <tr>
                  <td>${b.roomName || b.room_name}</td>
                  <td>${b.summary}</td>
                  <td>${b.creatorEmail || b.creator_email}</td>
                  <td>${new Date(b.startTime || b.start_time || '').toLocaleString()}</td>
                  <td>${new Date(b.endTime || b.end_time || '').toLocaleString()}</td>
                  <td>${b.status || 'Approved'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`p-6 sm:p-8 rounded-3xl border max-w-lg w-full space-y-6 shadow-2xl ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Export Booking Reports</h3>
              <p className="text-xs text-slate-400">Download formatted CSV, Excel, or PDF audit logs.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FILTERS */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Filter Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all">All Booking Statuses</option>
              <option value="Approved">Approved Only</option>
              <option value="Pending">Pending Approvals</option>
              <option value="Rejected">Rejected Bookings</option>
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Matching Records:</span>
            <span className="font-mono font-extrabold text-indigo-400 text-sm">{filteredBookings.length} entries</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={exportCSV}
            className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV / Excel</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF Summary</span>
          </button>
        </div>

      </div>
    </div>
  );
}
