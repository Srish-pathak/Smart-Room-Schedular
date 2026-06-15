import { Room } from './types';

export const ROOMS: Room[] = [
  {
    id: 'room-1',
    name: 'S.N. Bose Seminar Hall',
    capacity: 60,
    status: 'available',
    features: ['Laser Projector', 'Acoustic Soundproofing', 'Video Conferencing', 'Dual Glass Whiteboards', 'Executive Faculty seating'],
    image: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?w=800&auto=format&fit=crop&q=60',
    color: 'from-slate-700 to-slate-900',
  },
  {
    id: 'room-2',
    name: 'Ramanujan Computing Centre',
    capacity: 45,
    status: 'expiring_soon',
    features: ['High-Performance Computing cluster access', 'High-Speed Fiber Ethernet', 'Ultrawide Screen projection', 'Individual power outlets', 'Smart cooling'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
    color: 'from-violet-600 to-indigo-800',
  },
  {
    id: 'room-3',
    name: 'Visvesvaraya Conference Room',
    capacity: 18,
    status: 'available',
    features: ['85" 4K Video Display', 'Surround sound conferencing', 'Smart Capture Canvas', 'Ergonomic Boardroom seating', 'Integrated coffee bar'],
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60',
    color: 'from-amber-600 to-orange-800',
  },
  {
    id: 'room-4',
    name: 'Aryabhata Lecture Theatre',
    capacity: 120,
    status: 'available',
    features: ['Staged Amphitheatre acoustics', 'Dual high-lumen projectors', 'Lavalier Microphone sound system', 'Writeable Whiteboard walls', 'Automated recording rig'],
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60',
    color: 'from-teal-600 to-emerald-800',
  },
];
