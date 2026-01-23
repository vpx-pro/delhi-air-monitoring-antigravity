# AI-ICCC: Integrated Command & Control Centre for Air Quality

> **Delhi’s single largest & most consequential real-time AI deployment.**

This platform serves as the **Digital Nervous System** for Delhi's air quality governance, integrating environmental sensing, mobility data, enforcement systems, and policy execution at city scale.

![AI-ICCC Command Centre](https://placehold.co/1200x600/1e293b/white?text=AI-ICCC+Command+Centre+Preview)

## 🌟 The Vision: "See, Think, Act"

We are building a unified "War Room" that moves beyond passive monitoring to active Air Quality Management (AQM).

### 1. **Sensing Layer (The "Eyes")**
*   **Official Monitoring**: Real-time integration with **CPCB/DPCC** reference-grade stations.
*   **Satellite Sentinel**: (Mock) Visualization of **Aerosol Optical Depth (AOD)** and **NO2 Plumes** using processed satellite imagery (Sentinel-5P).
*   **Hyper-Local Sensing**: (Simulated) A dense grid of low-cost IoT sensors.
*   **Citizen Intelligence**: Crowdsourced verification of "Ground Truth" (fires, dust) via mobile reporting.

### 2. **Intelligence Layer (The "Brain")**
*   **Source Apportionment**: distinguishing between **Stubble Burning** (Punjab/Haryana), **Traffic Congestion**, and **Local Dust**.
*   **Predictive AQI**: Forecasting pollution trends based on meteorological / traffic patterns.
*   **Compliance Monitoring**: (Planned) Automated alerts for industrial zones exceeding emission norms.

### 3. **Action Layer (The "Hands")**
*   **Traffic Interventions**: Real-time traffic congestion heatmaps overlapped with pollution spikes.
*   **Enforcement Dispatch**: (Planned) Directing ground teams to verified fire/dust hotspots.
*   **Policy Simulation**: (Planned) "Digital Twin" to test GRAP (Graded Response Action Plan) measures before rollout.

---

## 🚀 Key Features

### 🖥️ Command Centre Console
A professional, high-density dashboard designed for decision-makers.
*   **Global Status Panel**: Real-time metrics for City-wide Avg AQI and Active Fire counts.
*   **Multi-Modal Layers**: Toggle and overlay complex datasets:
    *   🛡️ **CPCB Stations**: The gold standard reference.
    *   🌍 **Satellite Data**: Regional plume visualization.
    *   🚗 **Traffic Heatmap**: Congestion severity corridors.
    *   🔥 **Citizen Reports**: Verified garbage/crop burning incidents.
*   **Contextual filtering**: Switch between Delhi, Haryana, and Punjab regions instantly.

### 📱 Citizen Agent App
A seamless mobile experience for the public to act as "sensors".
*   **Report Incidents**: Geo-tagged reporting of pollution sources (Waste Burning, Construction Dust).
*   **Evidence Collection**: Photo uploads and severity grading.
*   **Personal Safety**: Real-time AQI alerts for user's current location.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 15 (App Router), React 19, TypeScript
*   **Maps**: MapLibre GL JS (Vector Tiles)
*   **Styling**: Tailwind CSS 4.0, Shadcn/UI patterns
*   **Icons**: Lucide React
*   **State Management**: URL-based state (shareable deep links)

---

## 🚦 Getting Started

### Prerequisites
*   Node.js 18+
*   pnpm / npm

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/antigravity-platform/delhi-pollution-iccc.git
    cd delhi-pollution-iccc
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Run Development Server**
    ```bash
    pnpm dev
    ```

4.  **Access the Command Centre**
    Open [http://localhost:3000](http://localhost:3000)

### Data Simulation Mode
By default, the system runs in **Hybrid Mode**:
*   If `WAQI_API_TOKEN` is set: Fetches **Live CPCB Data**.
*   If token is missing: Falls back to **Scientific Simulation** for stations.
*   *Satellite & Traffic data are currently mocked for demonstration.*

---

## 📜 Roadmap

*   **Phase 1: Command Centre (✅ Completed)**
    *   Establish "Dark Mode" War Room aesthetics.
    *   Integrate Satellite & Traffic mock layers.
    *   Build Collapsible Command Panel.

*   **Phase 2: The Agentic Loop (🚧 In Progress)**
    *   Complete Citizen Reporting flow.
    *   Admin verification dashboard.

*   **Phase 3: The AI Brain**
    *   Predictive Forecasting Models.
    *   "Sim-City" Policy Sliders.

---

## License
MIT License. Open Source for the Planet.
