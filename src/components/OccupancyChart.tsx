import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Award, CalendarClock, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface OccupancyChartProps {
  sessionReceipts: { roomName: string; summary: string; start: string; end: string; agenda?: string }[];
}

export default function OccupancyChart({ sessionReceipts }: OccupancyChartProps) {
  // Generate date list of the last 7 days dynamically
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const baselineRates = [45, 60, 35, 70, 85, 55, 40]; // Baseline percentage per day relative to offset (6 days ago -> today)

    return days.map((dateObj, idx) => {
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayLabel = dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      // Find any session bookings created specifically for this date
      const activeBookingsOnDay = sessionReceipts.filter((receipt) => {
        try {
          const bookingDateStr = new Date(receipt.start).toISOString().split('T')[0];
          return bookingDateStr === dateStr;
        } catch {
          return false;
        }
      });

      // Calculate total rate: baseline rate + 15% increase per booking, capped at 100%
      const baseRate = baselineRates[idx] || 40;
      const sessionIncr = activeBookingsOnDay.length * 15;
      const finalRate = Math.min(100, baseRate + sessionIncr);

      return {
        dateStr,
        name: dayLabel,
        "Occupancy Rate": finalRate,
        "Session Bookings": activeBookingsOnDay.length,
      };
    });
  }, [sessionReceipts]);

  // Compute metric stats
  const averageOccupancy = useMemo(() => {
    const total = chartData.reduce((acc, curr) => acc + curr["Occupancy Rate"], 0);
    return Math.round(total / chartData.length);
  }, [chartData]);

  const peakDay = useMemo(() => {
    let peak = chartData[0];
    chartData.forEach((day) => {
      if (day["Occupancy Rate"] > peak["Occupancy Rate"]) {
        peak = day;
      }
    });
    return peak;
  }, [chartData]);

  // Render a beautifully polished tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-3 shadow-2xl font-sans text-xs space-y-1">
          <p className="font-bold text-slate-300">{label}</p>
          <p className="text-indigo-400 font-semibold">
            Occupancy Rate: <span className="text-white">{payload[0].value}%</span>
          </p>
          {payload[1]?.value > 0 ? (
            <p className="text-teal-400 font-semibold font-mono">
              + {payload[1].value} Session Reservation{payload[1].value > 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-slate-500 italic">No new session bookings</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="recharts_occupancy_analytics" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-lg font-bold tracking-tight">7-Day Space Allocation Rates</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live tracking analytics combining standard office operations with active session reservations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 py-1.5 px-3 rounded-lg border border-indigo-900/30">
          <CalendarClock className="w-3.5 h-3.5" />
          <span className="font-mono">Sync Status: Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The Recharts Bar Chart Visualizer */}
        <div className="lg:col-span-2 bg-slate-950/45 border border-slate-850/50 p-4 rounded-xl">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.15 }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
                <Bar
                  name="Avg Occupancy Rate"
                  dataKey="Occupancy Rate"
                  fill="url(#colorOccupancy)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  name="Session Bookings Made"
                  dataKey="Session Bookings"
                  fill="url(#colorBookings)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Analytics Insights Dashboard Sidepanel */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Optimization Summary
            </h4>

            {/* Average Occupancy Card */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">WEEKLY MEAN VALUE</span>
                <p className="text-2xl font-black text-indigo-400 mt-0.5">{averageOccupancy}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-900/40 flex items-center justify-center font-bold text-xs text-indigo-400">
                Avg
              </div>
            </div>

            {/* Busy Allocation Target Card */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">PEAK OCCUPANCY DAY</span>
                <p className="text-sm font-bold text-slate-100 mt-1">{peakDay.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Reached {peakDay["Occupancy Rate"]}% utilization</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-950/50 border border-teal-900/40 flex items-center justify-center text-teal-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Quick tips about dynamic calculation */}
          <div className="p-4 bg-gradient-to-tr from-indigo-950/30 to-slate-950/30 border border-indigo-900/20 rounded-xl space-y-1.5">
            <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
              Live Allocation Signal
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every room booked via the **Calendar Scheduler** in this session adds **+15%** to that day's rate tracker to show prompt status updates.
            </p>
            {sessionReceipts.length > 0 ? (
              <div className="text-[10px] text-teal-400 bg-teal-950/30 border border-teal-900/30 p-1.5 rounded flex items-center gap-1 font-mono">
                <ChevronRight className="w-3 h-3 animate-pulse" />
                <span>Active increment: +{sessionReceipts.length * 15}% loaded!</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
