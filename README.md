# Delhi Pollution Live Map (Open Source)

A real-time, collaboration-friendly dashboard to pinpoint precise locations of emissions, enabling communities to work on them individually.
This project aggregates official CPCB data and combines it with simulated citizen sensor data and crowdsourced reports to provide a comprehensive view of air quality across NorthWest India.

## Roadmap & Priorities

This project follows a strict prioritized rollout plan. See [ROADMAP.md](./ROADMAP.md) for full details.

1.  **Phase 1 (Core)**: Delhi City, Monthly/Weekly Data (PM 2.5/10).
2.  **Phase 2 (Expansion)**: NCR, Daily Data.
3.  **Phase 3 (Regional)**: NorthWest India, Real-Time Data (All Gases).

## Features

### 🌍 Interactive Map & Filtering
- **Dynamic Region Selection**: Seamlessly switch between **Delhi**, **Haryana**, and **Punjab** views to analyze regional pollution trends.
- **Pollutant Filtering**: Toggle layers for **PM2.5**, **PM10**, **NO2**, **SO2**, and **CO** to visualize specific pollutants.
- **Time Range Analysis**: Filter historical data views (Last 24h, 7 Days, 30 Days).
- **Fire Mode**: A specialized mode to track biomass burning events ("GARBAGE_BURNING") synced with the citizen reports layer.

### 📊 Multi-Layer Data Visualization
- 🛡️ **Official CPCB Stations**: Real-time AQI and pollutant data from official government stations.
- 📡 **Citizen Sensors** (Simulated): A dense network of low-cost IoT sensors providing granular neighborhood-level data.
- ⚠️ **Citizen Reports** (Simulated): Crowdsourced reports of pollution events like burning, construction dust, and traffic congestion.

### 🎨 Modern UI/UX
- **Glassmorphism Design**: sleek, semi-transparent controls for a premium look.
- **Responsive Layout**: Optimized for both Desktop (collapsible sidebar) and Mobile (bottom drawer).
- **Dynamic Map Styling**: Automatic map fly-to and zoom adjustments based on region selection.

## Tech Stack

This project is built with a modern, performance-focused stack:

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Map Engine**: [MapLibre GL](https://maplibre.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utils**: `clsx`, `tailwind-merge` for dynamic classes.
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/delhi-pollution-map.git
    cd delhi-pollution-map
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the Map:**
    Navigate to [http://localhost:3000](http://localhost:3000).

## Architecture & Data Simulation

> [!IMPORTANT]
> **Simulation Mode**: By default, this project runs in "Simulation Mode". It does not require a live database to stand up.
>
> - **Official Data**: Static snapshot of CPCB data (can be replaced with live API fetch).
> - **Citizen Sensors**: Procedurally generated based on proximity to official stations + noise covariance.
> - **Reports**: Randomly generated clusters of pollution events.

To connect a real backend:
1.  Set up a Supabase project.
2.  Run the SQL schema provided in `supabase/schema.sql`.
3.  Update `src/app/api/...` routes to fetch from Supabase instead of `src/lib/simulation.ts`.

## Contributing

We welcome contributions! Please see `CONTRIBUTING.md` (coming soon) for details.

1.  Fork the repo.
2.  Create a feature branch.
3.  Submit a Pull Request.

## License

MIT License. This is a public instrument.
