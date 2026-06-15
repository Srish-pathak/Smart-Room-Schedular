# 🗓️ Smart Room Scheduler

An interactive, high-performance **Smart Scheduling & Workspace Optimization Dashboard** built for collaborative environments and seamlessly integrated with Google Workspace and Firebase. This application provides real-time workspace allocation, advanced conflict resolution engines, performance metrics, and a fully functional integration hub.

---

## 🎨 Visual Preview & Design Philosophy
This application follows a high-contrast, eye-safe **Dark Slate & Indigo Theme**, utilizing generous negative space, subtle motion transitions, and custom typography borders to deliver an editorial desktop experience. 

* **Craftsmanship over Defaults**: No generic purple/blue gradients or generic card layouts. Spacing and typography have been paired intentionally.
* **Responsive Fluidity**: Dynamic visual indicators and custom grid adapters maintain high information density on desktop screens while wrapping gracefully on mobile viewports.
* **Aesthetic Icon System**: Standardized vector glyphs powered by `lucide-react` provide crisp, cohesive, and modern visual accents to core modules.

---

## 🚀 Key Features

### 1. 🏢 Smart Rooms Directory & Interactive Cards
Displaying four premium, specialized collaborative zones outfitted with detailed descriptions, realistic images, active availability badges, and specific equipment tags:
*   **Boardroom Alpha (Max: 12 seats)**: Tailored for high-end executive board meetings, equipped with an 85" 4K display, high-speed videoconferencing gear, a premium writeable glass whiteboard, and an integrated refreshment bar.
*   **Creative Lounge (Max: 8 seats)**: Configured for brainstorms, containing a high-lumen short-throw laser projector, floor-to-ceiling dry-erase walls, lounge seating, and high-fidelity audio system.
*   **Focus Studio (Max: 3 seats)**: Tailored for deep individual developer work, structured sessions, or quiet calls. Optimized with acoustic wall panels, dual 27" screens, standing desk equipment, and premium ergonomic desk chairs.
*   **Engineering Sandbox (Max: 16 seats)**: Large-scale design and coding lab containing fiber connectivity, ultrawide curved screens, hardware mockup labs, and interactive smart board capture canvases.

### 2. 🔍 Advanced Fine-Tuning & Directory Sorting
*   **Dynamic Keyword Querying**: Search room details, facilities, or names in real-time.
*   **Capacity Filter Matrix**: Filter locations instantly by desired team size options (`Any`, `3+ Seats`, `8+ Seats`, `12+ Seats`, `16+ Seats`).
*   **Interactive Tag Filters**: Toggle custom search parameters instantly by selecting embedded amenity buttons (e.g. `Whiteboard`, `Videoconference`, `Acoustic Wall Panels`).
*   **Advanced Sorting**: Order workspaces dynamically based on physical seating capacity or current occupancy status (available first versus booked first).
*   **Offline Data Export**: Extract the current sorted and filtered directories instantly in a standardized CSV format with a single click.

### 3. 🛡️ Advanced Meeting Conflict Solver (Double-Booking Guard)
A robust front-to-back booking validation pipeline that intercepts potential double-booking errors before they reach the workspace pipeline:
*   **Real-time Calendar Guard**: Scans active Google Calendar reservations to flag exact time slot conflicts.
*   **Sister-Room Recommendations**: If a meeting conflict arises, the scheduler dynamically scans the remaining inventory and lists up to 3 alternative available rooms matching the chosen schedule, enabling instant one-click rescheduling.
*   **Postponement Advisor**: Automatically computes the exact duration of the blocking reservation and suggests the exact time when your selected room becomes fully vacant.
*   **Admin Overwrite Mode**: Allows authorized users to bypass standard room locking and enforce scheduling overrides when critical.

### 4. 🎛️ Google Workspace Integration Hub
Orchestrated OAuth 2.0 pipeline delivering automated, full-cycle document synchronization:
*   **📬 Gmail Notifications**: Draft and dispatch detailed invitation cards, itinerary summaries, and calendar digests straight to team members.
*   **📂 Google Drive sync**: Saves transactional records on individual Google Sheets dashboards or compiles beautiful standalone documents inside your Drive.
*   **📝 Feedback & Survey Sheets**: Generates template room satisfaction surveys dynamically using Google Forms integration.
*   **💬 Google Chat Integration**: Automatically feeds reservation notifications to designated chat rooms or webhook targets.

### 5. 📝 Meeting Agenda & Double-Document Auto-Upload (New!)
Ensuring seamless meeting preparation, the reservation modal captures detailed discussion topics via an explicit agenda text area. Upon confirmation, the booking engine automatically processes and exports two clean documents to Google Drive:
*   **File A (Booking Receipt)**: A styled HTML document tracking booking parameters, attendee lists, timestamps, and space codes.
*   **File B (Meeting Agenda & Topics)**: A dedicated HTML outline mapping session details, organizer information, and the preloaded structural meeting agenda.
These documents represent clean, persistent client records immediately visible within the directory view and Drive widget.

### 6. 📊 Real-Time Space Occupancy Analytics
*   Powered by interactive **Recharts** visualizations.
*   Generates live, calculations tracking overall load distribution, total allocated slot hours, and continuous space usage efficiency ratings.

---

## 🛠️ Technology Stack
*   **Core Library**: React 19 (Functional Hooks and Context state)
*   **Language**: TypeScript for absolute type safety and robust API handling
*   **Styling**: Tailwind CSS v4 featuring the new `@tailwindcss/vite` native build plugin
*   **Animations**: Motion (`motion/react`) optimizing transition curves and overlay keyframes
*   **Visualizations**: Recharts mapping SVG dashboard graphs
*   **Icons**: Lucide React SVGs

---

## 🚀 Setup & Installation (Local Development)

To run the Smart Room Scheduler on your machine:

### 1. Prerequisite Installations
Ensure you have modern **Node.js** (v18+) and **npm** installed.

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/yourusername/smart-room-scheduler.git
cd smart-room-scheduler

# Install the dependencies
npm install
```

### 3. Setup Your Environment Configurations
Create a `.env` file in the root root directory and provide your Google Workspace integration credentials:
```env
# .env Configuration Example
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 4. Run Development Server
```bash
# Boot up the Vite server
npm run dev
```
The application will boot and serve directly on **[http://localhost:3000](http://localhost:3000)** with hot reloading enabled.

### 5. Validate, Lint, and Build
To verify the application matches structural TypeScript requirements and compile a production-ready application bundle:
```bash
# Run TypeScript compiler checks
npm run lint

# Compile and compile static files directly into /dist
npm run build
```

---

## 🤝 Contribution Guidelines
1. Fork the Project repository.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request for review.

Developed with precision for space optimization and seamless Google Workspace coordination.
