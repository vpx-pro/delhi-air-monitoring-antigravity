# Delhi Pollution Live Map (Open Source)

A real-time, collaboration-friendly dashboard to visualize the Delhi Pollution Crisis.
This project aggregates official CPCB data and combines it with simulated citizen sensor data and crowdsourced reports to provide a comprehensive view of air quality.

## Features

- **Live Map**: Interactive map of Delhi using MapLibre GL JS.
- **Multi-Layer Data**:
    - 🛡️ **Official CPCB Stations**: Real-time AQI and PM2.5/PM10 from official sources.
    - 📡 **Citizen Sensors** (Simulated): Low-cost sensor mesh network data.
    - ⚠️ **Citizen Reports** (Simulated): Crowdsourced reports of burning, dust, and traffic.
- **Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostGIS).

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
