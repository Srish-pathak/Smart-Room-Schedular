import { TrendingUp, Clock, Hourglass, Award, ShieldCheck } from 'lucide-react';
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
  isDarkMode?: boolean;
}

export function DashboardStats({
  occupancyStats,
  adminTrendView,
  setAdminTrendView,
  isDarkMode = true,
}: DashboardStatsProps) {
  const gridColor = isDarkMode ? '#1e293b' : '#e2e8f0';
  const axisColor = isDarkMode ? '#64748b' : '#475569';
  const tooltipBg = isDarkMode ? '#020617' : '#ffffff';
  const tooltipBorder = isDarkMode ? '#1e293b' : '#e2e8f0';
  const tooltipLabelColor = isDarkMode ? '#94a3b8' : '#475569';

  return (
    <div 
      className={`p-6 ${
        isDarkMode 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200/80 shadow-sm'
      } border rounded-2xl space-y-6 text-left`} 
      id="occupancy-stats-panel"
    >
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b ${
        isDarkMode ? 'border-slate-800/80' : 'border-slate-100'
      }`}>
        <div>
          <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Room Occupancy &amp; Utilization Trends
          </h3>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Database analytics showing booking density, classroom demand, and temporal trends.
          </p>
        </div>

        {/* Toggle trend views */}
        <div className={`flex p-0.5 rounded-lg border self-start sm:self-center shrink-0 ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200/60'
        }`}>
          <button
            type="button"
            onClick={() => setAdminTrendView('daily')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
              adminTrendView === 'daily'
                ? 'bg-indigo-600 text-white shadow-sm'
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
            }`}
          >
            Daily Timeline
          </button>
          <button
            type="button"
            onClick={() => setAdminTrendView('weekly')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
              adminTrendView === 'weekly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')
            }`}
          >
            Weekly Heatmap
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200/60'
        }`}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Booked Time
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-xl font-extrabold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {occupancyStats.totalHours}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">hours</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200/60'
        }`}>
          <div className="flex items-center gap-1.5">
            <Hourglass className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Avg Session Length
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-xl font-extrabold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {occupancyStats.avgDuration}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">hours</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200/60'
        }`}>
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Most Utilized Room
            </span>
          </div>
          <div className="mt-2 truncate" title={occupancyStats.mostPopularRoom}>
            <span className={`text-xs font-extrabold block truncate ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {occupancyStats.mostPopularRoom}
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200/60'
        }`}>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Slots Secured
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={`text-xl font-extrabold ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
              {occupancyStats.totalBookingsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">slots</span>
          </div>
        </div>
      </div>

      {/* Visualization charts split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Selected Temporal Trend Chart */}
        <div className={`p-4.5 rounded-xl border space-y-4 ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50/50 border-slate-200/80'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {adminTrendView === 'daily' ? 'Daily Temporal Trend' : 'Weekly Distribution Profile'}
          </h4>

          <div className="h-[240px] w-full">
            {adminTrendView === 'daily' ? (
              occupancyStats.dailyData.length === 0 ? (
                <div className={`h-full flex items-center justify-center text-xs italic ${isDarkMode ? 'text-slate-650' : 'text-slate-400'}`}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" stroke={axisColor} fontSize={10} tickLine={false} />
                    <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px' }}
                      labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold', fontSize: '11px' }}
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
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="day" stroke={axisColor} fontSize={10} tickLine={false} />
                  <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px' }}
                    labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold', fontSize: '11px' }}
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
        <div className={`p-4.5 rounded-xl border space-y-4 ${
          isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50/50 border-slate-200/80'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Space Utilization Leaderboard
          </h4>

          <div className="h-[240px] w-full">
            {occupancyStats.roomData.length === 0 ? (
              <div className={`h-full flex items-center justify-center text-xs italic ${isDarkMode ? 'text-slate-650' : 'text-slate-400'}`}>
                No space occupancy records registered.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={occupancyStats.roomData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={true} vertical={false} />
                  <XAxis type="number" stroke={axisColor} fontSize={10} tickLine={false} />
                  <YAxis dataKey="room" type="category" stroke={axisColor} fontSize={10} width={85} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px' }}
                    labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold', fontSize: '11px' }}
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
