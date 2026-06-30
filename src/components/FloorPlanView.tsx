import React, { useState, useMemo } from 'react';
import { Room, Booking } from '../types';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Calendar, 
  CalendarPlus, 
  Info, 
  MapPin, 
  Loader2, 
  QrCode,
  Check,
  AlertTriangle
} from 'lucide-react';

// Static CAD room slot templates around central quad courtyard coordination
const FLOOR_PLAN_SLOTS = [
  {
    id: "slot-0",
    key: "bose",
    defaultName: "S.N. Bose Seminar Hall",
    x: 50,
    y: 30,
    w: 220,
    h: 125,
    labelX: 65,
    labelY: 75,
    wing: "North-West Wing (Seminar Hall)"
  },
  {
    id: "slot-1",
    key: "ramanujan",
    defaultName: "Ramanujan Computing Centre",
    x: 530,
    y: 30,
    w: 220,
    h: 125,
    labelX: 545,
    labelY: 75,
    wing: "North-East Wing (Supercomputing)"
  },
  {
    id: "slot-2",
    key: "visvesvaraya",
    defaultName: "Visvesvaraya Conference Room",
    x: 50,
    y: 185,
    w: 220,
    h: 125,
    labelX: 65,
    labelY: 230,
    wing: "West Wing (Executive Boardroom)"
  },
  {
    id: "slot-3",
    key: "aryabhata",
    defaultName: "Aryabhata Lecture Theatre",
    x: 530,
    y: 185,
    w: 220,
    h: 125,
    labelX: 545,
    labelY: 230,
    wing: "East Wing (Auditorium acoustics)"
  },
  {
    id: "slot-4",
    key: "homi",
    defaultName: "Homi Bhabha Lecture Lounge",
    x: 235,
    y: 340,
    w: 155,
    h: 85,
    labelX: 247,
    labelY: 380,
    wing: "South-West Wing"
  },
  {
    id: "slot-5",
    key: "sarabhai",
    defaultName: "Vikram Sarabhai Lab Space",
    x: 410,
    y: 340,
    w: 155,
    h: 85,
    labelX: 422,
    labelY: 380,
    wing: "South-East Wing"
  },
  {
    id: "slot-6",
    key: "harish",
    defaultName: "Harish-Chandra Seminar Studio",
    x: 300,
    y: 30,
    w: 200,
    h: 125,
    labelX: 312,
    labelY: 75,
    wing: "North Central Core"
  }
];

interface FloorPlanViewProps {
  rooms: Room[];
  filteredRooms: Room[];
  adminBookings: any[];
  syncingBookingId: string | null;
  onChooseSlot: (room: Room) => void;
  onViewHistory: (room: Room) => void;
  onShowQR: (room: Room) => void;
  onAddToGoogleCalendar: (booking: any) => Promise<void>;
}

export function FloorPlanView({
  rooms,
  filteredRooms,
  adminBookings,
  syncingBookingId,
  onChooseSlot,
  onViewHistory,
  onShowQR,
  onAddToGoogleCalendar
}: FloorPlanViewProps) {
  // Bind database rooms to static coordinates, matching by substring or ID index
  const { mappedSlots, overflowRooms } = useMemo(() => {
    const slotsWithRooms = FLOOR_PLAN_SLOTS.map(slot => {
      const matchedRoom = rooms.find(r => 
        r.name.toLowerCase().includes(slot.key.toLowerCase()) ||
        slot.defaultName.toLowerCase().includes(r.name.toLowerCase()) ||
        r.id === `room-${slot.id.split('-')[1]}`
      );
      return {
        slot,
        room: matchedRoom || null,
      };
    });

    const unmappedRooms = rooms.filter(r => 
      !slotsWithRooms.some(sr => sr.room?.id === r.id)
    );

    let unmappedIdx = 0;
    const finalizedSlots = slotsWithRooms.map(sr => {
      if (sr.room) return sr;
      if (unmappedIdx < unmappedRooms.length) {
        const rm = unmappedRooms[unmappedIdx];
        unmappedIdx++;
        return {
          ...sr,
          room: rm
        };
      }
      return sr;
    });

    const overflow = unmappedRooms.slice(unmappedIdx);
    return { mappedSlots: finalizedSlots, overflowRooms: overflow };
  }, [rooms]);

  // Handle room inspection selection
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Find inspected room object
  const activeInspectedRoom = useMemo(() => {
    if (!selectedRoomId) {
      // Default to first active room matched by filters if possible
      return filteredRooms[0] || rooms[0] || null;
    }
    return rooms.find(r => r.id === selectedRoomId) || rooms[0] || null;
  }, [selectedRoomId, rooms, filteredRooms]);

  // Determine if a room matches active search filters
  const isRoomMatchingFilters = (roomId: string) => {
    return filteredRooms.some(fr => fr.id === roomId);
  };

  // Find bookings specific to the inspected room
  const activeRoomBookings = useMemo(() => {
    if (!activeInspectedRoom) return [];
    return adminBookings.filter(b => 
      b.room_name?.toLowerCase().includes(activeInspectedRoom.name.toLowerCase()) || 
      activeInspectedRoom.name?.toLowerCase().includes(b.room_name?.toLowerCase()) ||
      b.room_id === activeInspectedRoom.id
    );
  }, [activeInspectedRoom, adminBookings]);

  // Determine if there is an active reservation happening right now
  const currentActiveBooking = useMemo(() => {
    if (!activeInspectedRoom) return null;
    const now = new Date();
    return activeRoomBookings.find(b => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return start <= now && end >= now;
    });
  }, [activeInspectedRoom, activeRoomBookings]);

  // Helper to split long room names into multi-line SVG labels
  const renderRoomLabel = (name: string, x: number, y: number, isMatched: boolean) => {
    const words = name.split(' ');
    const fillStyle = isMatched ? "fill-white" : "fill-slate-500";
    if (words.length <= 2) {
      return (
        <text x={x} y={y} className={`text-[10.5px] font-extrabold tracking-wide ${fillStyle} font-sans pointer-events-none`}>
          {name}
        </text>
      );
    }
    const line1 = words.slice(0, 2).join(' ');
    const line2 = words.slice(2).join(' ');
    return (
      <text x={x} y={y} className={`text-[10.5px] font-extrabold tracking-wide ${fillStyle} font-sans pointer-events-none`}>
        <tspan x={x} dy="0">{line1}</tspan>
        <tspan x={x} dy="13">{line2}</tspan>
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="floorplan-view-container">
      {/* LEFT COLUMN: INTERACTIVE CAD VECTOR PLAN */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
        <div className="mb-4 text-left">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="text-xs font-extrabold font-mono text-emerald-400 uppercase tracking-widest">IIT BHU Campus - Core Technology Complex</span>
          </div>
          <h3 className="text-md font-black text-slate-100 mt-1">Ground Floor Plan & Utilization Blueprint</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Tap highlighted rooms to inspect features, explore schedules, or secure instant reservations. Glowing green rings show available spaces.
          </p>
        </div>

        {/* Dynamic Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl text-[10.5px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500/80 inline-block" />
            <span className="font-extrabold uppercase font-mono text-emerald-400 flex items-center gap-1">
              Available
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-rose-950 border border-rose-500/80 inline-block" />
            <span className="font-extrabold uppercase font-mono text-rose-450">Occupied (Booked)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-950 border border-amber-500/80 inline-block" />
            <span className="font-extrabold uppercase font-mono text-amber-504">Expiring Soon</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800 inline-block" />
            <span className="font-medium text-slate-500">Service Docks</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-[9.5px] text-slate-500 font-mono">
            <Info className="w-3.5 h-3.5 shrink-0 text-slate-600" />
            <span>Grayed blocks do not match filters</span>
          </div>
        </div>

        {/* SVG Drawing Canvas */}
        <div className="relative border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden shadow-inner p-2.5">
          <svg 
            viewBox="0 0 800 500" 
            className="w-full h-auto text-slate-300 drop-shadow-2xl select-none"
          >
            {/* Architectural Building Foundation */}
            <rect 
              x="15" 
              y="10" 
              width="770" 
              height="480" 
              rx="18" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="4" 
              strokeDasharray="4 4"
              opacity="0.6"
            />
            <rect 
              x="20" 
              y="15" 
              width="760" 
              height="470" 
              rx="16" 
              fill="none" 
              stroke="#334155" 
              strokeWidth="2" 
            />

            {/* GRID WALKING CORRIDORS (CAD Walkways Indicator) */}
            <g opacity="0.18">
              {/* Vertical Corridors */}
              <rect x="278" y="20" width="16" height="425" fill="#475569" rx="1" />
              <rect x="506" y="20" width="16" height="425" fill="#475569" rx="1" />
              {/* Horizontal Corridors */}
              <rect x="45" y="160" width="710" height="20" fill="#475569" rx="1" />
              <rect x="45" y="315" width="710" height="20" fill="#475569" rx="1" />
            </g>

            {/* CORRIDOR ROUTE LABELS */}
            <text x="160" y="173" textAnchor="middle" className="text-[7.5px] font-black fill-slate-700 tracking-widest font-mono">WEST COMMONS LANE</text>
            <text x="640" y="173" textAnchor="middle" className="text-[7.5px] font-black fill-slate-700 tracking-widest font-mono">EAST COMMONS LANE</text>
            <text x="400" y="173" textAnchor="middle" className="text-[7.5px] font-black fill-slate-700 tracking-widest font-mono">NORTH ROTUNDA</text>
            <text x="400" y="328" textAnchor="middle" className="text-[7.5px] font-black fill-slate-700 tracking-widest font-mono">SOUTH ANNEX ROUTE</text>

            {/* CENTRAL GREEN RECREATION QUAD / COURTYARD */}
            <g>
              <rect 
                x="300" 
                y="190" 
                width="200" 
                height="115" 
                rx="14" 
                fill="#0b1220" 
                stroke="#1e293b" 
                strokeWidth="1.5" 
              />
              {/* Green Center fountain accent */}
              <circle cx="400" cy="247" r="28" fill="#042f1a" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              <circle cx="400" cy="247" r="14" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
              <circle cx="400" cy="247" r="5" fill="#a7f3d0" />
              <text 
                x="400" 
                y="208" 
                textAnchor="middle" 
                className="text-[9px] font-black tracking-widest fill-indigo-400 font-sans"
              >
                OPEN COURTYARD
              </text>
              <text 
                x="400" 
                y="292" 
                textAnchor="middle" 
                className="text-[7.5px] font-extrabold tracking-widest fill-emerald-500/70 font-mono"
              >
                IIT BHU GREEN QUAD
              </text>
            </g>

            {/* DECORATIVE SERVICE DOCKS */}
            {/* 1. Main Entrance */}
            <g>
              <rect x="340" y="473" width="120" height="12" fill="#17153a" stroke="#312e81" strokeWidth="1.5" rx="3" />
              <text x="400" y="482" textAnchor="middle" className="text-[8px] font-bold fill-indigo-300 tracking-widest font-mono uppercase">★ MAIN ENTRANCE ★</text>
            </g>
            {/* 2. Restrooms */}
            <g>
              <rect x="50" y="440" width="155" height="35" fill="#0c111d" stroke="#1f2937" strokeWidth="1" rx="8" />
              <text x="127" y="461" textAnchor="middle" className="text-[9.5px] font-semibold fill-slate-500 font-mono">🚻 WASHROOM DOCK</text>
            </g>
            {/* 3. Administrative Deck */}
            <g>
              <rect x="595" y="440" width="155" height="35" fill="#0c111d" stroke="#1f2937" strokeWidth="1" rx="8" />
              <text x="672" y="461" textAnchor="middle" className="text-[9.5px] font-semibold fill-slate-500 font-mono">💼 OFFICE DECK</text>
            </g>

            {/* RENDER DYNAMICALLY MAPPED ROOMS */}
            {mappedSlots.map(({ slot, room }) => {
              if (!room) {
                // If there's no room assigned to this slot template, draw uncommitted reservation grid
                return (
                  <g key={slot.id} opacity="0.4">
                    <rect
                      x={slot.x}
                      y={slot.y}
                      width={slot.w}
                      height={slot.h}
                      rx="12"
                      fill="#0b0f19"
                      stroke="#1e293b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={slot.x + slot.w / 2}
                      y={slot.y + slot.h / 2 - 4}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-600 font-mono tracking-widest uppercase"
                    >
                      Dynamic Lab Bay
                    </text>
                    <text
                      x={slot.x + slot.w / 2}
                      y={slot.y + slot.h / 2 + 10}
                      textAnchor="middle"
                      className="text-[7.5px] font-medium fill-slate-700 font-sans"
                    >
                      (Reserved for expansion)
                    </text>
                  </g>
                );
              }

              // Checks for active status & filtering matching
              const isActiveInFilters = isRoomMatchingFilters(room.id);
              const isSelected = activeInspectedRoom?.id === room.id;

              // Color codes variables matching room status
              let rectFill = "fill-slate-900/90";
              let rectStroke = "stroke-slate-850";
              let badgeText = "AVAILABLE";
              let badgeColor = "fill-emerald-400";

              if (room.status === 'available') {
                rectFill = isSelected ? "fill-emerald-950/40" : "fill-emerald-950/15";
                rectStroke = isSelected ? "stroke-emerald-400" : "stroke-emerald-500/40";
              } else if (room.status === 'booked') {
                rectFill = isSelected ? "fill-rose-950/40" : "fill-rose-950/15";
                rectStroke = isSelected ? "stroke-rose-500" : "stroke-rose-600/40";
                badgeText = "OCCUPIED";
                badgeColor = "fill-rose-450";
              } else {
                rectFill = isSelected ? "fill-amber-950/40" : "fill-amber-950/15";
                rectStroke = isSelected ? "stroke-amber-500" : "stroke-amber-600/40";
                badgeText = "EXPIRING";
                badgeColor = "fill-amber-400";
              }

              return (
                <g
                  key={room.id}
                  className="cursor-pointer transition-all duration-300 group"
                  onClick={() => setSelectedRoomId(room.id)}
                  opacity={isActiveInFilters ? 1 : 0.28}
                  style={{ transition: 'opacity 300ms, transform 300ms' }}
                >
                  {/* Outer glow ring around highlighted rooms */}
                  {isSelected && (
                    <rect
                      x={slot.x - 3}
                      y={slot.y - 3}
                      width={slot.w + 6}
                      height={slot.h + 8}
                      rx="16"
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2"
                      opacity="0.8"
                    />
                  )}

                  {/* Room Base Rectangle */}
                  <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.w}
                    height={slot.h}
                    rx="12"
                    className={`transition-all duration-300 ${rectFill} ${rectStroke}`}
                    strokeWidth={isSelected ? "2.5" : "1.5"}
                  />

                  {/* SUBTLE BEACON PULSE (DRAW ATTENTION FOR AVAILABLE SPACES) */}
                  {room.status === 'available' && (
                    <g>
                      {/* Pulse circle rings */}
                      <circle 
                        cx={slot.x + slot.w - 18} 
                        cy={slot.y + 18} 
                        r="6" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="1.5"
                        className="animate-ping"
                        style={{ transformOrigin: `${slot.x + slot.w - 18}px ${slot.y + 18}px` }}
                      />
                      <circle 
                        cx={slot.x + slot.w - 18} 
                        cy={slot.y + 18} 
                        r="3.5" 
                        className="fill-emerald-400 animate-pulse" 
                      />
                    </g>
                  )}

                  {/* Non-available status indicators dots */}
                  {room.status !== 'available' && (
                    <circle 
                      cx={slot.x + slot.w - 18} 
                      cy={slot.y + 18} 
                      r="3.5" 
                      className={badgeColor} 
                    />
                  )}

                  {/* Room Name display multi-line */}
                  {renderRoomLabel(room.name, slot.labelX, slot.labelY, isActiveInFilters)}

                  {/* Small Wing Marker details */}
                  <text 
                    x={slot.labelX} 
                    y={slot.labelY + 28} 
                    className="text-[8px] font-semibold text-slate-500 font-mono uppercase tracking-widest pointer-events-none"
                  >
                    {slot.wing || 'Academic Space'}
                  </text>

                  {/* Seat badge and features indicator at the bottom inside the polygon */}
                  <g transform={`translate(${slot.x + 12}, ${slot.y + slot.h - 22})`}>
                    {/* Capacity Badge */}
                    <rect x="0" y="0" width="48" height="13" rx="4" fill="#020617" stroke="#1e293b" strokeWidth="0.5" />
                    <text x="6" y="9.5" className="text-[7.5px] font-black fill-slate-300 font-mono tracking-wider">👥 {room.capacity}S</text>

                    {/* Technical equipment status tag abbreviation */}
                    <text x="56" y="9" className="text-[7.5px] font-extrabold fill-indigo-400/80 font-mono uppercase tracking-widest">
                      {room.features && room.features.length > 0 ? room.features[0].slice(0, 14) : 'Standard'}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* SVG Coordinates Overlay Tooltip info at bottom */}
          <div className="absolute bottom-2 left-2 bg-slate-950/90 border border-slate-800/80 rounded-lg py-1 px-2.5 text-[9px] font-mono text-slate-400 shadow-md">
            <span>🛠 CAD Grid Nodes: 7 core academic sectors mapped</span>
          </div>
        </div>

        {/* Dynamic Warning if custom rooms overflow SVG sectors */}
        {overflowRooms.length > 0 && (
          <div className="mt-5 p-4.5 bg-slate-950 border border-slate-850 rounded-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-black tracking-tight text-slate-200">Dynamic Academic Expansion Bay</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              The following newly commissioned custom spaces have been mapped adjacent to the primary core block:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {overflowRooms.map(room => {
                const isSelected = activeInspectedRoom?.id === room.id;
                const isActiveInFilters = isRoomMatchingFilters(room.id);
                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-[11px] transition-all text-left ${
                      isSelected 
                        ? "bg-indigo-950/40 border-indigo-500 text-white" 
                        : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                    style={{ opacity: isActiveInFilters ? 1 : 0.4 }}
                  >
                    <div>
                      <span className="font-extrabold block">{room.name}</span>
                      <span className="text-[9.5px] text-slate-500 font-mono">👥 {room.capacity} Seats • {room.features[0] || 'Dynamic'}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ring-2 ${
                      room.status === 'available' ? 'bg-emerald-400 ring-emerald-950/50' : 
                      room.status === 'booked' ? 'bg-rose-400 ring-rose-950/50' : 
                      'bg-amber-400 ring-amber-950/50'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: RICH INTERACTIVE INSPECT PANEL */}
      <div className="lg:col-span-4 space-y-5">
        {activeInspectedRoom ? (
          <div key={activeInspectedRoom.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-6 space-y-5">
            {/* Header / Picture */}
            <div className="space-y-4">
              <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-850">
                <img 
                  src={activeInspectedRoom.image} 
                  alt={activeInspectedRoom.name} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                
                {/* Status indicator on image */}
                <div className="absolute top-3 left-3">
                  <span className={`text-[9px] font-mono font-black uppercase py-1 px-2.5 rounded-lg border flex items-center gap-1 ${
                    activeInspectedRoom.status === 'available' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300 animate-pulse' :
                    activeInspectedRoom.status === 'booked' ? 'bg-rose-950 border-rose-500/40 text-rose-300' :
                    'bg-amber-950 border-amber-500/40 text-amber-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      activeInspectedRoom.status === 'available' ? 'bg-emerald-400' : 
                      activeInspectedRoom.status === 'booked' ? 'bg-rose-450' : 
                      'bg-amber-400 animate-bounce'
                    }`} />
                    {activeInspectedRoom.status === 'available' ? 'Available now' : 
                     activeInspectedRoom.status === 'booked' ? 'Occupied' : 
                     'Expiring soon'}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-slate-450 uppercase">Active Core Block</span>
                  <h4 className="text-sm font-black text-white leading-tight mt-0.5">{activeInspectedRoom.name}</h4>
                </div>
              </div>

              {/* Room details */}
              <div className="text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">Maximum Capacity</span>
                  <span className="font-extrabold text-slate-200">{activeInspectedRoom.capacity} Academic Seats</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-850/60 pt-1.5">
                  <span className="text-slate-500 font-mono">Location Segment</span>
                  <span className="font-semibold text-indigo-400 text-[11px] uppercase tracking-wider">
                    {FLOOR_PLAN_SLOTS.find(s => activeInspectedRoom.name.toLowerCase().includes(s.key))?.wing || 'Core Campus block'}
                  </span>
                </div>
              </div>

              {/* Amenity Badges */}
              <div className="text-left space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Amenities & Integration Features</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeInspectedRoom.features.map((feat, idx) => (
                    <span 
                      key={idx} 
                      className="bg-slate-950 border border-slate-850/70 text-slate-400 py-1 px-2.5 rounded-lg text-[10px] font-medium"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Live reservation check */}
            <div className="p-4 bg-slate-950/80 border border-slate-850/70 rounded-2xl text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <span className="text-[10px] font-mono font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Live Resource status
                </span>
                <span className="text-[9.5px] text-slate-500 font-mono">Today</span>
              </div>

              {currentActiveBooking ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-rose-500" />
                    <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">Reserved Right Now:</span>
                  </div>
                  <p className="text-xs font-black text-white pl-3.5 italic">"{currentActiveBooking.summary}"</p>
                  <p className="text-[10.5px] text-slate-400 pl-3.5">
                    Booked by {currentActiveBooking.creator_name?.split(' ')[0]} ({currentActiveBooking.creator_email})
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono pl-3.5 pt-1">
                    🕒 {new Date(currentActiveBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(currentActiveBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-emerald-500 shrink-0" />
                    <span className="text-[11.5px] font-black text-emerald-400 uppercase tracking-wide">Ready for Bookings</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-3.5">
                    No active resource lock or syllabus calendar reservation registered right now.
                  </p>
                </div>
              )}
            </div>

            {/* List room bookings timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-left">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Scheduled Timeline ({activeRoomBookings.length})</span>
                <button
                  onClick={() => onViewHistory(activeInspectedRoom)}
                  className="text-[9.5px] font-black text-indigo-400 hover:text-indigo-300 transition uppercase tracking-wide underline font-mono"
                >
                  View Archive →
                </button>
              </div>

              {activeRoomBookings.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeRoomBookings.slice(0, 3).map((b, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl text-left space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-300 truncate max-w-[150px]" title={b.summary}>{b.summary}</span>
                        <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest">
                          {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-500">
                        <span>By {b.creator_name?.split(' ')[0]}</span>
                        <span>{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Google Calendar sync CTA */}
                      <div className="pt-1.5 mt-1 border-t border-slate-950/80 flex justify-end">
                        <button
                          onClick={() => onAddToGoogleCalendar(b)}
                          disabled={syncingBookingId === b.id}
                          className="flex items-center gap-1 py-0.5 px-2 bg-indigo-950/60 hover:bg-indigo-900 disabled:opacity-50 text-[8.5px] font-extrabold text-indigo-300 rounded border border-indigo-900/30 transition-all uppercase tracking-wider cursor-pointer"
                        >
                          {syncingBookingId === b.id ? (
                            <>
                              <Loader2 className="w-2 h-2 animate-spin text-indigo-400" />
                              <span>Syncing...</span>
                            </>
                          ) : (
                            <>
                              <CalendarPlus className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Add to GCal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  {activeRoomBookings.length > 3 && (
                    <p className="text-[9px] text-slate-500 text-center font-mono">
                      + {activeRoomBookings.length - 3} more schedule periods in timeline.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-505 italic py-1 text-center border border-dashed border-slate-800 rounded-xl">No scholar timelines mapped.</p>
              )}
            </div>

            {/* FOOTER CTA BAR */}
            <div className="pt-4 border-t border-slate-850 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => onShowQR(activeInspectedRoom)}
                className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                QR CODE
              </button>

              {activeInspectedRoom.status === 'available' ? (
                <button
                  onClick={() => onChooseSlot(activeInspectedRoom)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-950/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  CHOOSE SLOT
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 bg-slate-850/50 text-slate-650 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-650" />
                  OCCUPIED
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[350px]">
            <MapPin className="w-12 h-12 text-slate-600 animate-pulse" />
            <div>
              <p className="font-extrabold text-slate-300">No Space Selected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px] mx-auto">
                Select any academic classroom, auditorium, or lab compartment on the floor plan map to load real-time insights.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
