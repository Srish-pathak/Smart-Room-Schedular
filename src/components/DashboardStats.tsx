import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface OccupancyStats {
  dailyData: { date: string; rawDate: string; hours: number }[];
  roomData: { room: string; fullName: string; hours: number }[];
  dowData: { day: string; hours: number }[];
  totalHours: number;
  avgDuration: number;
  mostPopularRoom: string;
  totalBookingsCount: number;
}

interface DashboardStatsProps {
  occupancyStats: OccupancyStats;
  adminTrendView: 'daily' | 'weekly';
  setAdminTrendView: (view: 'daily' | 'weekly') => void;
}

export function DashboardStats({
  occupancyStats,
  adminTrendView,
  setAdminTrendView,
}: DashboardStatsProps) {
  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 text-left" id="occupancy-stats-panel">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-850">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Room Occupancy &amp; Utilization Trends
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Database analytics showing booking density, classroom demand, and temporal trends.
          </p>
        </div>

        {/* Toggle trend views */}
        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setAdminTrendView('daily')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all ${
              adminTrendView === 'daily'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Timeline
          </button>
          <button
            type="button"
            onClick={() => setAdminTrendView('weekly')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all ${
              adminTrendView === 'weekly'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Weekly Heatmap
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-855 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Total Booked Time</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-indigo-400">{occupancyStats.totalHours}</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">hours</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-855 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Avg Session Length</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-emerald-400">{occupancyStats.avgDuration}</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">hours</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-855 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Most Utilized Room</span>
          <div className="mt-1 truncate" title={occupancyStats.mostPopularRoom}>
            <span className="text-xs font-bold text-amber-400 block truncate">{occupancyStats.mostPopularRoom}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-855 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Total Slots Secured</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-violet-400">{occupancyStats.totalBookingsCount}</span>
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">reservations</span>
          </div>
        </div>
      </div>

      {/* Visualization charts split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Selected Temporal Trend Chart */}
        <div className="p-4.5 bg-slate-950 rounded-xl border border-slate-850 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {adminTrendView === 'daily' ? 'Daily Temporal Trend' : 'Weekly Distribution Profile'}
          </h4>

          <div className="h-[240px] w-full">
            {adminTrendView === 'daily' ? (
              occupancyStats.dailyData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
                  No booking timestamps available in database.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={occupancyStats.dailyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '11px' }}
                      itemStyle={{ color: '#818cf8', fontSize: '11px' }}
                      formatter={(value) => [`${value} hrs`, 'Booked Duration']}
                    />
                    <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyStats.dowData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ color: '#10b981', fontSize: '11px' }}
                    formatter={(value) => [`${value} hrs`, 'Accumulated Hours']}
                  />
                  <Bar dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Leaderboard Horizontal BarChart */}
        <div className="p-4.5 bg-slate-950 rounded-xl border border-slate-850 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Space Utilization Leaderboard
          </h4>

          <div className="h-[240px] w-full">
            {occupancyStats.roomData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
                No space occupancy records registered.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={occupancyStats.roomData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis dataKey="room" type="category" stroke="#64748b" fontSize={10} width={85} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ color: '#fbbf24', fontSize: '11px' }}
                    formatter={(value, name, props) => [`${value} hrs`, `Booked on ${props.payload.fullName}`]}
                  />
                  <Bar dataKey="hours" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
