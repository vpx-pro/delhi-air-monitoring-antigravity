# Implementation Plan: Air Quality Data Platform (MVP vs. Long-Term)

## Overview
This platform will serve as the **Single Source of Truth** for Delhi's air quality data. 
The ultimate goal is to create an ecosystem where startups, AI researchers, and government agencies can dynamically build products, analyze historical trends, and run predictive models using our API and massive real-time datasets.

---

## 🎯 The First MVP (Implementation Priority 1)

The goal of the first MVP is to establish the **"Single Source of Truth Core"**. Before we can serve thousands of startups or build complex AI models, we need a unified, queryable, and robust data foundation that external users can actually access.

### 1. Unified Air Quality Database & API Foundation (InsForge)
We will transition from a closed system to an open API platform.
*   **Action**: Create structured data layers joining CPCB and Citizen data.
*   **Deliverable**:
    *   `GET /api/v1/aqi/live`: Real-time aggregated pollution metrics across Delhi.
    *   `GET /api/v1/aqi/history`: Time-series data (e.g., past 24 hours).
*   **[NEW]** `supabase/migrations/xxxx_api_mgmt.sql` - Adding `api_keys` and usage tracking tables.

### 2. The Developer Portal
Startups need a place to sign up and get access.
*   **Action**: Build a simple B2B portal within the existing Next.js app.
*   **Deliverable**:
    *   [NEW] `src/app/developers/page.tsx` - Dashboard for API key generation.
    *   [NEW] `src/app/developers/docs/page.tsx` - Basic API documentation for developers to start querying `v1` endpoints.

### 3. AI-Ready Data Exports (Basic)
Researchers shouldn't have to scrape APIs.
*   **Action**: Set up a daily cron job exporting the day's aggregated AQI readings.
*   **Deliverable**:
    *   [NEW] Edge Function `/api/v1/datasets/daily-dump` that outputs a clean CSV to InsForge Storage for easy download by data scientists.

---

## 🚀 The Long-Term Vision (Future Phases)

Once the MVP proves the platform can reliably serve as a data hub, we expand into advanced insights, real-time interactivity, and a marketplace of models.

### 1. Real-time Pub/Sub Subscriptions
*   **Feature**: Replacing polling APIs with WebSockets (via InsForge Realtime).
*   **Use Case**: Startups building health alerts can subscribe to "Severe AQI Warning" channels and get pushed notifications milliseconds after a spike is detected.

### 2. Predictive AI & "Digital Twin" Endpoints
*   **Feature**: Exposing ML outputs as an API.
*   **Use Case**: Startups can query `GET /api/v2/predict/{location}?hours=4` to get forecasted AQI, allowing logistics companies to reroute delivery fleets around predicted pollution hotzones dynamically.

### 3. Satellite & Geospatial Analytics
*   **Feature**: Programmatic access to simulated AOD (Aerosol Optical Depth) and NO2 Plume data.
*   **Use Case**: Urban planners and prop-tech startups can overlay historical plume paths against real estate values using our GeoJSON endpoints.

### 4. Enterprise Usage & Billing Tiers
*   **Feature**: Monetizing heavy usage.
*   **Use Case**: Transitioning from free developer keys to tiered usage plans (e.g., Free for <10k requests/month; Enterprise for real-time WebSocket firehose).
