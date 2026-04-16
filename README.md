# ES-WMS — Eco-Smart Waste Management System

> **A role-based, full-stack digital platform** for Brihanmumbai Municipal Corporation (BMC) that eliminates operational data fog in Solid Waste Management — replacing manual logsheets and verbal reporting with sensor-backed, geotagged, and automatically enforced digital workflows.

[![React Native](https://img.shields.io/badge/React_Native-Expo_54-61DAFB?logo=react)](https://expo.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [The Problem Being Solved](#the-problem-being-solved)
- [Architecture](#architecture)
- [Portals & User Roles](#portals--user-roles)
- [Features](#features)
  - [Driver & Supervisor App](#driver--supervisor-app)
  - [Citizen & Society App](#citizen--society-app)
  - [Admin ICCC Web Dashboard](#admin-iccc-web-dashboard)
  - [Backend API](#backend-api)
  - [Mock IoT Engine](#mock-iot-engine)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Admin Web Dashboard Setup](#3-admin-web-dashboard-setup)
  - [4. Mobile App Setup](#4-mobile-app-setup)
  - [5. Running Everything](#5-running-everything)
- [Seed Data & Demo Credentials](#seed-data--demo-credentials)
- [Environment Variables Reference](#environment-variables-reference)
- [API Reference](#api-reference)
- [Module Status](#module-status)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ES-WMS** (Eco-Smart Waste Management System) is a monorepo containing three interconnected applications built for the Brihanmumbai Municipal Corporation's Solid Waste Management Division:

1. **Driver / Supervisor Mobile App** — React Native (Expo) app for field operations: route execution, geotagged photo proof-of-work, truck capacity monitoring, and skip reporting with mandatory reason codes.
2. **Citizen / Society App** — React Native (Expo) app for housing society residents: live pickup status, skip notifications, segregation compliance scores, and complaint submission.
3. **Admin ICCC Dashboard** — React + Vite web app for BMC ward officers: live vehicle tracking map, route management, backlog queue, auto-fining wallet, mass balance reports, and an alert center.

All three are backed by a single **Node.js / Express / PostgreSQL REST API** with a **Python Mock IoT Engine** that simulates GPS telemetry and load-cell sensor data.

---

## The Problem Being Solved

Mumbai generates 6,300–7,200 metric tonnes of municipal solid waste daily. Despite this scale, BMC decision-makers historically had zero real-time visibility into collection activities. ES-WMS directly addresses five core pain points:

| # | Pain Point | ES-WMS Solution |
|---|---|---|
| 1 | **Vehicle Full Loophole** — Drivers skip stops claiming the truck is full, unverifiably | Mock load-cell sensor validates capacity; claims below 85% load are auto-flagged to supervisors |
| 2 | **Manual Route Tracking** — Paper logsheets; verbal reporting of missed spots | Digital backlog auto-created on every skip; GPS + geotagged photo proof-of-work |
| 3 | **No Segregation Enforcement** — Manual notices; ineffective compliance | Mixed-waste skip auto-triggers a fine event; consecutive violations escalate to admin alert |
| 4 | **Citizen Trust Deficit** — Citizens unaware why bins were skipped | Push notifications explain skip reason in real time with English / Hindi / Marathi translations |
| 5 | **Opaque Contractor Billing** — Payments not linked to verified performance | GPS + weighbridge matching in Mass Balance dashboard flags phantom trips |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                               │
│                                                                    │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐   │
│  │   React Native App   │   │  React + Vite Web Dashboard      │   │
│  │  (Driver / Citizen)  │   │  (Admin ICCC — Desktop)          │   │
│  │   Expo SDK 54        │   │  Tailwind CSS + Leaflet.js       │   │
│  └──────────┬───────────┘   └────────────────┬─────────────────┘   │
└─────────────┼────────────────────────────────┼─────────────────────┘
              │  REST / JSON (Bearer JWT)       │
┌─────────────▼────────────────────────────────▼───────────────────── ┐
│                    Node.js / Express API  (/api/v1/)                │
│                                                                     │
│  Auth · Routes · Stops · Vehicles · Societies · Admin · Alerts      │
│  Notifications · Backlog · Fines · Settings · Telemetry             │
│                                                                     │
│  Middleware: JWT auth · RBAC · Zod validation · Multer uploads      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
       ┌───────────────────────┼──────────────────────┐
       │                       │                      │
┌──────▼──────┐   ┌────────────▼────────┐   ┌────────▼──────────┐
│ PostgreSQL  │   │   AWS S3 / Local    │   │  Python IoT       │
│   + Prisma  │   │   File Storage      │   │  Engine (cron)    │
│  (Primary   │   │ (Photo uploads)     │   │  GPS + Load Cell  │
│   database) │   └─────────────────────┘   │  Simulation       │
└─────────────┘                             └───────────────────┘
```

### Key Design Decisions

- **API-first, RBAC-enforced** — Every endpoint is gated behind JWT authentication and role-based access control. A Driver cannot call admin endpoints; a Citizen can only access their own society.
- **Modular monorepo** — All apps live in one repository for shared TypeScript types and coordinated deployments.
- **Offline-ready mobile** — Zustand with AsyncStorage persistence keeps auth and route data available after network loss.
- **Mock IoT decoupled** — The Python engine fires REST calls to the backend, simulating real sensor hardware without any physical devices needed.

---

## Portals & User Roles

| Portal | Roles | Platform | Access Path |
|---|---|---|---|
| Driver / Supervisor App | `DRIVER`, `SUPERVISOR` | Android (React Native) | OTP login via mobile number |
| Citizen / Society App | `CITIZEN` | Android (React Native) | OTP login via mobile number |
| Admin ICCC Dashboard | `ADMIN` | Web browser (desktop-first) | Email + Password login |

---

## Features

### Driver & Supervisor App

- **OTP Login** — Mobile number + 6-digit OTP flow; JWT session persisted to device secure storage
- **Route Overview** — Today's ordered stop list with status badges (PENDING / IN_PROGRESS / COMPLETED / SKIPPED / BACKLOGGED), animated progress bar, and shift info
- **Stop Detail** — Society name, address, bin type (WET / DRY / MIXED), mark-complete CTA, and expandable skip section
- **In-App Camera Proof** — Full-screen viewfinder with GPS calibration indicator; gallery uploads blocked by design
- **Geofence Validation** — Photo submission blocked if device GPS is >50m from stop coordinates; distance shown live
- **Skip with Reason** — Bottom-sheet modal with 4 reason tiles: `WASTE_MIXED`, `TRUCK_FULL`, `INACCESSIBLE`, `OTHER`; suspicious Truck Full claims (load <85%) are auto-flagged
- **Vehicle Load Gauge** — Animated circular SVG gauge fed from live telemetry; capacity warnings at 75% and 90%
- **Supervisor Fleet View** — Zone-level overview of all active trucks with route progress bars, load chips, GPS last-ping, and alert badges
- **Route Audit** — Supervisor reviews completed stops (photo + GPS validity) and skipped stops (reason + flag) with approve/reject/acknowledge/reassign actions
- **Alerts Feed** — Driver-specific alert feed: flagged claims, new backlog assignments, supervisor notes, geofence failures

### Citizen & Society App

- **Live Pickup Status** — Hero ETA card with today's scheduled time, live vehicle distance (when within 500m), driver name, and vehicle ID
- **Pickup Status States** — SCHEDULED / EN_ROUTE / ARRIVING / COMPLETED / SKIPPED with distinct color-coded UX
- **Segregation Score** — Animated circular ring (0–100) with 7-day sparkline and streak counter
- **Quick Actions** — Report Missed Pickup → Complaint Form; View Fines & Alerts
- **Complaint Form** — Issue type selector (5 types), description textarea, camera/gallery photo with geotag capture; confirmation screen with reference ID
- **Notification History** — Filterable feed (All / Pickups / Fines / Warnings) with date grouping; expandable fine details with payment status
- **Society Wallet** — Wallet balance, total fined, total paid, outstanding summary card
- **Profile & Settings** — Language toggle (Marathi scaffold), push notification toggle, app version

### Admin ICCC Web Dashboard

- **Live Operations Map** — Leaflet.js map with color-coded vehicle markers (green / orange / red), route polylines with per-vehicle colors, start/end stop markers, and a stop status layer toggle
- **Vehicle Detail Panel** — Animated SVG load gauge, driver name, route progress, last telemetry timestamp; shown on marker click
- **Route Management** — Full CRUD table; create/edit modal with ward, vehicle, driver, supervisor, shift, and drag-to-reorder stop list; CSV bulk upload
- **Backlog Queue** — Priority-scored backlog table (urgency = missed count × 10 + age hours + reason weight); bulk reassignment with route selector
- **Fine Events** — Review queue with approve/reject workflow; detail modal with photo evidence and reject notes; monthly CSV/PDF export
- **Mass Balance** — Daily collected-vs-dumped comparison, discrepancy % chart, Sankey flow diagram, PDF export; vehicles exceeding 15% variance auto-flagged
- **Alert Center** — Admin alert feed (FALSE_TRUCK_FULL, REPEATED_INACCESSIBLE, CONSECUTIVE_NON_SEGREGATION, MASS_BALANCE_DISCREPANCY); resolve/dismiss actions with audit trail
- **User Management** — Full user CRUD by role (DRIVER / SUPERVISOR / ADMIN / CITIZEN); activate/deactivate toggle
- **Society Management** — Society list with ward filter, wallet balance badges, contact info
- **Reports** — Exportable reports: Daily Route (CSV), Fine Collection (CSV/PDF), Mass Balance (CSV/PDF), Complaint Resolution (CSV)
- **Settings** — Configurable system thresholds: geofence radius, default fine amount, truck-full threshold %, inaccessible alert limit, consecutive non-segregation days, mass balance variance %

### Backend API

- **JWT Authentication** — RS256-equivalent HS256 tokens; 24h expiry for mobile, 8h for web
- **Role-Based Access Control** — Every endpoint enforces `requireRole()` middleware; zero trust between roles
- **Zod Validation** — All request bodies, query params, and route params validated with typed schemas
- **Geofence Service** — Haversine distance calculation; configurable radius from system settings
- **Backlog Auto-Creation** — On every skip, the system finds the next available route in the same ward and auto-assigns; falls back to PENDING if none found
- **Fine Auto-Generation** — WASTE_MIXED skips automatically create a PENDING fine event for the society
- **Alert Engine** — Automatic alert creation for false truck-full claims, repeated inaccessible skips (weekly), consecutive non-segregation, and mass balance discrepancies
- **Audit Logging** — Immutable `audit_logs` table captures every state-changing action with actor ID, old/new values
- **Notification System** — In-app notification records with trilingual (English/Hindi/Marathi) skip reason bodies; scaffold for FCM push delivery
- **Export Service** — PDFKit-based PDF generation with styled tables; json2csv for CSV exports

### Mock IoT Engine

The Python engine in `iot-engine/` (referenced in PRD Section 6.3) fires `POST /api/v1/iot/telemetry` every 30 seconds per vehicle, simulating:

- GPS coordinates interpolated along route waypoints
- Load increment of 200–400 kg per completed stop
- Load reset to 0 on depot return
- Status transitions: `EN_ROUTE` → `COLLECTING` → `FULL` → `RETURNING_TO_DEPOT` → `IDLE`
- Auto-trigger of capacity warning notifications at configurable threshold

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile App | React Native (Expo SDK 54) | Driver + Citizen Android app |
| Web Dashboard | React 18 + Vite + TypeScript | Admin ICCC dashboard |
| UI (Mobile) | Custom components + Ionicons | Glove-friendly, high-contrast BMC palette |
| UI (Web) | Tailwind CSS + Lucide React | Desktop-first admin interface |
| Maps (Mobile) | Google Maps deep-link | Navigation handoff to external app |
| Maps (Web) | Leaflet.js + OpenStreetMap | Live vehicle tracking map |
| State (Mobile) | Zustand + AsyncStorage | Persistent offline-capable state |
| Backend | Node.js + Express + TypeScript | REST API server |
| Database | PostgreSQL 15 | Primary relational data store |
| ORM | Prisma 6 | Type-safe DB access + migrations |
| Validation | Zod | Runtime schema validation |
| File Upload | Multer | Photo uploads with MIME filtering |
| PDF Export | PDFKit | Server-side report generation |
| CSV Export | json2csv | Data exports |
| Auth | JWT (jsonwebtoken) + bcryptjs | Session management |
| Mock IoT | Python 3 + Requests | GPS + load cell simulation |
| Hosting (API) | Render.com / AWS EC2 | Cloud deployment |

---

## Project Structure

```
es-wms/
├── apps/
│   ├── mobile/                         # React Native (Expo) — Driver + Citizen
│   │   ├── src/
│   │   │   ├── components/             # BigButton, StatusBadge (shared)
│   │   │   ├── navigation/             # AppNavigator, DriverStack, CitizenStack, SupervisorStack
│   │   │   ├── screens/
│   │   │   │   ├── auth/               # LoginScreen (OTP flow)
│   │   │   │   ├── driver/             # RouteOverview, StopDetail, CameraProof, MapScreen, AlertsScreen, SkipReasonModal
│   │   │   │   ├── citizen/            # CitizenDashboard, ComplaintForm, NotificationHistory, HomeStatus
│   │   │   │   ├── supervisor/         # FleetOverview, RouteAudit
│   │   │   │   └── shared/             # ProfileScreen
│   │   │   ├── services/               # API service modules (auth, route, stop, society, notification)
│   │   │   ├── stores/                 # Zustand stores (authStore, routeStore)
│   │   │   ├── theme/                  # colors.ts (BMC palette + Theme constants)
│   │   │   ├── types/                  # api.ts (shared TypeScript types)
│   │   │   └── config.ts               # API base URL (auto-detects LAN IP in dev)
│   │   ├── App.tsx
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── web/                            # React + Vite Admin Dashboard
│       ├── src/
│       │   ├── components/
│       │   │   ├── alerts/             # AlertsList
│       │   │   ├── auth/               # ProtectedRoute
│       │   │   ├── backlog/            # BacklogTable
│       │   │   ├── dashboard/          # DashboardMap, VehicleDetailPanel
│       │   │   ├── fines/              # FineEventsTable, FineDetailModal
│       │   │   ├── layout/             # DashboardLayout, Sidebar
│       │   │   ├── reports/            # MassBalanceBars, DiscrepancyChart, MassBalanceSankey, ReportCard
│       │   │   ├── routes/             # RoutesTable, RouteFormModal
│       │   │   ├── settings/           # SettingsSectionCard
│       │   │   ├── societies/          # SocietyTable
│       │   │   ├── users/              # UserTable, UserFormModal
│       │   │   └── ui/                 # Button, Card, Badge, Input, Spinner
│       │   ├── context/                # AuthContext
│       │   ├── hooks/                  # useAuth
│       │   ├── pages/                  # dashboard, users, routes, backlog, fines, alerts, societies, reports, settings
│       │   ├── services/               # API service modules (per domain)
│       │   └── styles.css
│       ├── index.html
│       ├── tailwind.config.ts
│       ├── vite.config.ts
│       └── package.json
│
├── server/                             # Node.js / Express Backend API
│   ├── prisma/
│   │   ├── schema.prisma               # Full database schema (all models + enums)
│   │   ├── seed.ts                     # Demo data seeder (20 societies, 10 drivers, 4 routes, telemetry)
│   │   └── migrations/                 # Prisma migration history
│   ├── src/
│   │   ├── config/                     # env.ts (Zod-validated env schema)
│   │   ├── controllers/                # admin, alert, alerts, auth, backlog, bulk, dashboard, fine, notification, route, settings, society, stop, telemetry, vehicle
│   │   ├── middleware/                 # auth.ts, rbac.ts, validate.ts, errorHandler.ts
│   │   ├── routes/                     # Express routers (one per domain)
│   │   ├── services/                   # alert, audit, auth, backlog, export, fine, geofence, notification, settings
│   │   ├── types/                      # express.d.ts (req.user augmentation)
│   │   ├── utils/                      # apiResponse, pagination, prisma, request
│   │   ├── app.ts                      # Express app setup (CORS, middleware, routers)
│   │   └── index.ts                    # Server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── iot-engine/                         # Python Mock IoT Simulator (PRD §6.3)
│   └── (vehicle GPS + load simulation scripts)
│
├── .gitignore
├── tsconfig.json                       # Root tsconfig (extends mobile)
└── README.md
```

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.x+ | Required for backend and web dashboard |
| npm | 9.x+ | Package manager |
| PostgreSQL | 14+ | Primary database |
| Python | 3.9+ | Required for Mock IoT Engine only |
| Expo Go | Latest | Install on your Android device for mobile dev |
| Git | Any | For cloning the repo |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Thetwobraincells/ES-WMS.git
cd ES-WMS
```

---

### 2. Backend Setup

The backend API is the foundation — set it up first.

#### a) Install dependencies

```bash
cd server
npm install
```

#### b) Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values. At minimum, you need:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/eswms?schema=public"

# Server
PORT=5050
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173,http://localhost:8081"

# JWT — use a strong random string in production
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRY_MOBILE="24h"
JWT_EXPIRY_WEB="8h"

# IoT Engine authentication
IOT_API_KEY="iot-engine-secret-key-change-in-production"

# File upload directory (created automatically)
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=10

# Operational defaults (can be changed via /admin/settings)
GEOFENCE_RADIUS_METERS=50
DEFAULT_FINE_AMOUNT=500
TRUCK_FULL_THRESHOLD_PERCENT=85
```

#### c) Create the database

```bash
# Using psql
createdb eswms

# Or via psql prompt
psql -U postgres -c "CREATE DATABASE eswms;"
```

#### d) Run Prisma migrations

```bash
npm run prisma:migrate
```

This applies the full schema including all enums, tables, indexes, and foreign keys.

#### e) Generate Prisma client

```bash
npm run prisma:generate
```

#### f) Seed demo data

```bash
npm run seed
```

This creates:
- 2 wards (Ward H/East - Chembur, Ward L - Kurla)
- 2 admin users, 3 supervisors, 10 drivers, 12 citizens
- 5 vehicles with telemetry data
- 20 housing societies
- 4 routes (today's AM + PM shifts for both wards)
- Stops with various statuses (COMPLETED, IN_PROGRESS, SKIPPED, PENDING)
- Sample fine events, notifications, and audit logs

#### g) Start the API server

```bash
npm run dev
```

The server starts at `http://localhost:5050`. Verify with:

```bash
curl http://localhost:5050/api/v1/health
# → {"success":true,"data":{"status":"ok","service":"ES-WMS API","version":"1.0.0",...}}
```

---

### 3. Admin Web Dashboard Setup

```bash
cd apps/web
npm install
```

Create a `.env` file (or `.env.local`) in `apps/web/`:

```env
VITE_API_BASE_URL=http://localhost:5050/api/v1
```

Start the development server:

```bash
npm run dev
```

The dashboard opens at `http://localhost:5173`.

**Login credentials** (seeded by default):
- Email: `jagtap@bmc.gov.in` / Password: `admin123`
- Email: `priya.it@bmc.gov.in` / Password: `admin123`

---

### 4. Mobile App Setup

The mobile app serves both Driver/Supervisor and Citizen experiences, with role-based navigation after login.

```bash
cd apps/mobile
npm install
```

#### a) Configure API base URL

Open `src/config.ts`. The app auto-detects your LAN IP when using Expo Go — no manual change needed if your phone and laptop are on the same Wi-Fi network. If needed, override the fallback:

```typescript
let API_URL = 'http://YOUR_MACHINE_IP:5050/api/v1';
```

#### b) Install Expo Go on your Android device

Download **Expo Go** from the Google Play Store.

#### c) Start the Metro bundler

```bash
npm start
```

This launches the Expo CLI. Scan the QR code with Expo Go (Android) to open the app.

For an Android emulator (requires Android Studio):

```bash
npm run android
```

---

### 5. Running Everything

For a full local development environment, run these in separate terminals:

```bash
# Terminal 1 — Backend API
cd server && npm run dev

# Terminal 2 — Admin Web Dashboard
cd apps/web && npm run dev

# Terminal 3 — Mobile App
cd apps/mobile && npm start
```

**Optional — Mock IoT Engine** (simulates vehicle GPS + load telemetry):

```bash
cd iot-engine
pip install -r requirements.txt   # or: pip install requests
python simulator.py
```

---

## Seed Data & Demo Credentials

### Admin Dashboard

| Email | Password | Role |
|---|---|---|
| `jagtap@bmc.gov.in` | `admin123` | ADMIN (Ward H/East) |
| `priya.it@bmc.gov.in` | `admin123` | ADMIN |

### Mobile App — Driver Login (OTP)

Enter the mobile number in the login screen. The server returns the OTP in its console output (and in the API response for dev mode). Use any of:

| Mobile Number | Name | Role | Route |
|---|---|---|---|
| `9222000001` | Rajesh Kumar | DRIVER | Today's current-shift route (Ward H/East) |
| `9222000002` | Amit Yadav | DRIVER | Today's alternate-shift route (Ward H/East) |
| `9222000004` | Manoj Shinde | DRIVER | Today's current-shift route (Ward L - Kurla) |
| `9111000001` | Ramesh Mukadam | SUPERVISOR | Zone supervisor (Ward H/East) |

### Mobile App — Citizen Login (OTP)

| Mobile Number | Society Mapped | Notes |
|---|---|---|
| `9333000003` | Green Valley CHS | Society with a SKIPPED stop + notifications |
| `9333000012` | Rajiv Gandhi CHS | Society with an approved fine in history |

> **OTP for all numbers:** The OTP is printed to the backend server console and also returned in the `requestOtp` API response as `data.otp` (development mode convenience — remove in production).

---

## Environment Variables Reference

### Backend (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `PORT` | `5000` | API server port |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed origins |
| `JWT_SECRET` | — | Minimum 16 characters; use a strong random string |
| `JWT_EXPIRY_MOBILE` | `24h` | JWT lifetime for mobile OTP sessions |
| `JWT_EXPIRY_WEB` | `8h` | JWT lifetime for admin web sessions |
| `IOT_API_KEY` | `iot-engine-secret-key-...` | Shared secret for Mock IoT Engine |
| `UPLOAD_DIR` | `./uploads` | Local directory for photo uploads |
| `MAX_FILE_SIZE_MB` | `10` | Max photo upload size in MB |
| `GEOFENCE_RADIUS_METERS` | `50` | Default geofence radius (overridable via Settings page) |
| `DEFAULT_FINE_AMOUNT` | `500` | Default fine in ₹ for WASTE_MIXED (overridable) |
| `TRUCK_FULL_THRESHOLD_PERCENT` | `85` | Load % below which TRUCK_FULL claim is flagged (overridable) |

### Admin Web Dashboard (`apps/web/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | Backend API base URL |

### Mobile App (`apps/mobile/src/config.ts`)

| Config Key | Default | Description |
|---|---|---|
| `API_BASE_URL` | Auto-detected (LAN) | Backend API base URL; auto-detects from Expo host URI in dev |
| `API_TIMEOUT` | `15000` | HTTP request timeout in milliseconds |
| `MAX_PHOTO_SIZE_MB` | `10` | Max photo upload size |

---

## API Reference

All endpoints are prefixed with `/api/v1/`. Authentication uses `Authorization: Bearer <token>` unless noted.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/request-otp` | Public | Request OTP for mobile number |
| `POST` | `/auth/verify-otp` | Public | Verify OTP, receive JWT |
| `POST` | `/auth/login` | Public | Admin email + password login |

### Routes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/routes/my-route` | DRIVER, SUPERVISOR | Current shift route with stops and vehicle telemetry |
| `GET` | `/routes/zone` | SUPERVISOR | All active routes for supervisor's ward |
| `GET` | `/routes` | ADMIN | List all routes (paginated, filterable) |
| `GET` | `/routes/:id` | ADMIN, SUPERVISOR | Route details with stops and photos |
| `POST` | `/routes` | ADMIN | Create route (with optional stops) |
| `PATCH` | `/routes/:id` | ADMIN | Update route and stop ordering |
| `DELETE` | `/routes/:id` | ADMIN | Delete route |

### Stops

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/stops` | ADMIN, SUPERVISOR | All stops for map layer |
| `PATCH` | `/stops/:id/complete` | DRIVER | Mark stop complete (requires valid photo) |
| `PATCH` | `/stops/:id/skip` | DRIVER | Skip stop with mandatory reason code |
| `POST` | `/stops/:id/photos` | DRIVER | Upload geotagged proof-of-work photo |

### Vehicles

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/vehicles/live` | ADMIN, SUPERVISOR | All vehicle positions with route progress |
| `GET` | `/vehicles` | ADMIN | List all vehicles |

### Societies (Citizen)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/societies/:id/status` | CITIZEN, ADMIN | Today's collection status + vehicle ETA |
| `GET` | `/societies/:id/fines` | CITIZEN, ADMIN | Fine history + wallet balance |
| `GET` | `/societies/:id/compliance` | CITIZEN, ADMIN | Segregation compliance score (0–100) |
| `POST` | `/societies/:id/complaint` | CITIZEN | Submit missed-collection complaint with photo |

### Admin

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/admin/dashboard` | ADMIN | Aggregated dashboard metrics |
| `GET` | `/admin/wards` | ADMIN | List all wards |
| `GET` | `/admin/societies` | ADMIN | List all societies |
| `GET` | `/admin/users` | ADMIN | List users (filterable by role) |
| `POST` | `/admin/users` | ADMIN | Create user |
| `PATCH` | `/admin/users/:id` | ADMIN | Update user |
| `GET` | `/admin/backlog` | ADMIN | Priority-sorted backlog queue |
| `PATCH` | `/admin/backlog/:id` | ADMIN | Reassign backlog to route |
| `GET` | `/admin/fine-events` | ADMIN | List fine events |
| `GET` | `/admin/fine-events/export` | ADMIN | Export fines as CSV or PDF |
| `POST` | `/admin/fine-events/:id/approve` | ADMIN | Approve fine (deducts from society wallet) |
| `POST` | `/admin/fine-events/:id/reject` | ADMIN | Reject fine with notes |
| `GET` | `/admin/mass-balance` | ADMIN | Daily mass balance report |
| `GET` | `/admin/mass-balance/export` | ADMIN | Export mass balance as PDF |
| `GET` | `/admin/alerts` | ADMIN | System alert feed |
| `PATCH` | `/admin/alerts/:id` | ADMIN | Mark alert resolved/dismissed |
| `GET` | `/admin/settings` | ADMIN | List configurable system settings |
| `PATCH` | `/admin/settings/:key` | ADMIN | Update a system setting |
| `GET` | `/admin/heatmap/skips` | ADMIN | Skip frequency heatmap data |
| `GET` | `/admin/waste-flow` | ADMIN | Waste flow data for Sankey diagram |
| `POST` | `/admin/stops/bulk` | ADMIN | Bulk upload stops from CSV |
| `GET` | `/admin/routes/:id/history` | ADMIN | Route audit log history |

### IoT Engine

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/iot/telemetry` | API Key (`X-API-Key`) | Receive vehicle GPS + load telemetry |

---

## Module Status

A comparison of the PRD requirements against the current codebase:

### ✅ Completed

| Module | PRD Reference | Notes |
|---|---|---|
| OTP Authentication (Mobile) | FR-AUTH-02, FR-AUTH-03 | Full OTP request/verify flow; dev mode returns OTP in response |
| Admin Email + Password Login | FR-AUTH-04 | bcrypt password hashing; optional OTP parameter accepted |
| JWT Session Management | FR-AUTH-05 | Role-scoped tokens; 24h mobile / 8h web expiry |
| User Management (Admin) | FR-AUTH-06 | Full CRUD with activate/deactivate |
| Driver Route View | FR-DRV-01, FR-DRV-02 | Ordered stop list with status badges and progress bar |
| Mark Complete with Photo | FR-DRV-03 | Geofence validation enforced; gallery blocked in camera screen |
| Skip Stop with Reason | FR-DRV-04 | 4 reason codes; WASTE_MIXED auto-generates fine + notification |
| Auto-Backlog on Skip | FR-DRV-05 | Assigned to next available same-ward route |
| Route Progress Bar | FR-DRV-06 | Animated bar with X/N counter |
| Supervisor Zone View | FR-DRV-07 | FleetOverview + RouteAudit screens |
| In-App Camera (no gallery) | FR-DRV-09 | expo-camera with CameraView |
| Geotagged Photo Metadata | FR-DRV-10 | GPS + timestamp + vehicle + driver + stop IDs stored |
| Geofence Validation (50m) | FR-DRV-11 | Haversine distance; configurable via settings |
| Photo Cloud Storage | FR-DRV-12 | Local file storage with `/uploads` static serve; S3-ready |
| Photo Review (Admin/Supervisor) | FR-DRV-13 | RouteAudit screen + admin dashboard |
| Mock Truck Load Display | FR-DRV-14 | Circular SVG gauge fed from latest telemetry |
| Capacity Warning at 90% | FR-DRV-15 | Banner in RouteOverview; FCM scaffold in telemetry controller |
| Truck Full Auto-Validate at 100% | FR-DRV-16 | Auto-allows skip without override |
| False Claim Detection (<85%) | FR-DRV-17 | Supervisor notification + AdminAlert record created |
| Vehicle GPS on Dashboard Map | FR-DRV-18 | 30-second telemetry feed; Leaflet.js live markers |
| Citizen Home Screen + Status | FR-CIT-01 | Hero ETA card with countdown, driver, vehicle |
| Push Notification on Skip | FR-CIT-02 | In-app notification with trilingual body; FCM scaffold |
| Missed Collection Complaint | FR-CIT-03 | Form with photo, issue type, description; geotag optional |
| Segregation Score | FR-CIT-04 | 0–100 score computed from 30-day skip/complete history |
| Fine History + Wallet | FR-CIT-05 | Notification history screen with wallet card |
| Notification History (30 days) | FR-CIT-06 | Filterable feed; read/unread states |
| Named Driver + Vehicle | FR-CIT-07 | Shown in CitizenDashboard hero card |
| Live Operations Map | FR-ADM-01 | Color-coded markers + per-vehicle route polylines |
| Vehicle Detail Panel | FR-ADM-02 | Side panel with gauge, driver, progress, last update |
| Stop Layer Toggle | FR-ADM-03 | Toggle button on map; stops color-coded by status |
| Manual Backlog Reassignment | FR-ADM-04 | Backlog page + admin endpoints |
| Skip Heatmap Data | FR-ADM-05 | `/admin/heatmap/skips` endpoint (data only, no map layer yet) |
| Route CRUD + Ordered Stops | FR-ADM-06 | Full create/edit with drag-to-reorder stop list |
| Backlog Queue with Priority | FR-ADM-07 | Urgency scoring: missed count + age + reason weight |
| CSV Bulk Stop Upload | FR-ADM-08 | `/admin/stops/bulk` with header validation + row error reporting |
| Route Audit Log | FR-ADM-09 | `/admin/routes/:id/history` endpoint |
| Society Wallet (Simulated) | FR-ADM-10 | Default ₹10,000 balance per society |
| Auto-Fine on WASTE_MIXED | FR-ADM-11 | Fine event created in skip controller |
| Fine Event Details | FR-ADM-12 | Society, date, amount, reason, driver, photo evidence |
| Fine Approve/Reject Workflow | FR-ADM-13 | Admin review queue; wallet deducted on approve |
| Society Wallet in Citizen App | FR-ADM-14 | Fine history screen with wallet balance card |
| Monthly Fine Report (CSV/PDF) | FR-ADM-15 | Export endpoint with PDFKit formatting |
| Mass Balance View | FR-ADM-16 | Daily collected vs capacity comparison |
| Discrepancy Alerts (>15%) | FR-ADM-17 | Auto-creates AdminAlert for flagged vehicles |
| Sankey Diagram Data | FR-ADM-18 | `/admin/waste-flow` endpoint; Sankey component in UI |
| Mass Balance PDF Export | FR-ADM-19 | PDFKit-generated report |
| Admin Alert Center | FR-ADM-20 | FALSE_TRUCK_FULL, REPEATED_INACCESSIBLE, CONSECUTIVE_NON_SEGREGATION, MASS_BALANCE_DISCREPANCY |
| Configurable Alert Thresholds | FR-ADM-21 | Settings page with 6 configurable parameters |
| Alert Audit Log | FR-ADM-22 | All alerts stored with resolved/dismissed status + timestamp |

### 🔄 In Progress / Partial

| Module | PRD Reference | Status |
|---|---|---|
| FCM Push Notifications | FR-CIT-02 | Notification records created in DB; FCM delivery not wired (scaffold ready — `FCM_SERVER_KEY` env var in `.env.example`) |
| Offline Mode (Driver App) | NFR §5.2 | Zustand + AsyncStorage persists auth + last route; full queue-and-sync for photo uploads not yet implemented |
| English / Hindi / Marathi UI | FR-CIT-08 | Marathi language toggle exists in Profile Settings; translations in notification bodies only; full UI i18n not yet implemented |
| Skip Heatmap Map Layer | FR-ADM-05 | Data endpoint complete; visual heatmap overlay on Leaflet map not yet rendered in dashboard |
| Supervisor Absence Photo Flow | FR-DRV-08 | Not yet implemented |

### 📋 Planned (Future Phases)

| Module | PRD Reference | Notes |
|---|---|---|
| Real LoRaWAN / RFID / load-cell hardware | §2.2 Out of Scope | Requires physical device procurement |
| Live payment gateway for fines | §2.2 Out of Scope | Simulated wallet only in MVP |
| iOS App Store deployment | §2.2 Out of Scope | Android-first; iOS build config exists in `app.json` |
| React Native Maps (in-app) | PRD §6.1 | Currently uses Google Maps deep-link; `react-native-maps` integration planned for Phase 2 |
| VTMS Integration | §2.2 Out of Scope | BMC's existing vehicle tracking system |
| Biometric attendance (SAP HR) | §2.2 Out of Scope | Separate enterprise system |
| CCTV / AI-based dumping detection | §2.2 Out of Scope | Requires hardware + legal clearance |
| Redis caching + WebSocket | §7.1 | Phase 2 performance enhancement |
| Detox / Playwright E2E tests | §11 Testing | Test scaffolding only; full suite planned |
| Microservices migration | §5.5 | Modular monolith for MVP; migration path documented in PRD |

---

## Database Schema

The full schema is defined in `server/prisma/schema.prisma`. Core entities:

| Model | Key Fields | Purpose |
|---|---|---|
| `User` | `id`, `role`, `name`, `mobile`, `email`, `password_hash`, `is_active`, `ward_id` | All user types (DRIVER, SUPERVISOR, CITIZEN, ADMIN) |
| `Ward` | `id`, `name`, `zone`, `area_sq_km` | Geographic ward boundaries |
| `Vehicle` | `id`, `registration_no`, `capacity_kg`, `vehicle_type` | BMC garbage trucks |
| `Route` | `id`, `ward_id`, `vehicle_id`, `driver_id`, `supervisor_id`, `shift`, `date` | Daily shift route assignments |
| `Society` | `id`, `ward_id`, `name`, `address`, `lat`, `lng`, `wallet_balance` | Housing societies |
| `SocietyMember` | `user_id`, `society_id` | Maps CITIZEN users to their societies |
| `Stop` | `id`, `route_id`, `society_id`, `lat`, `lng`, `bin_type`, `status`, `skip_reason` | Individual collection stops |
| `StopPhoto` | `id`, `stop_id`, `driver_id`, `url`, `lat`, `lng`, `geofence_valid` | Geotagged proof-of-work photos |
| `VehicleTelemetry` | `id`, `vehicle_id`, `lat`, `lng`, `current_load_kg`, `status`, `recorded_at` | IoT GPS + load data (time-series) |
| `BacklogEntry` | `id`, `original_stop_id`, `new_route_id`, `reason`, `status` | Auto-created on every skip |
| `FineEvent` | `id`, `society_id`, `stop_id`, `reason`, `amount`, `status` | Auto-generated fine events |
| `Notification` | `id`, `target_user_id`, `target_society_id`, `type`, `title`, `body` | In-app + FCM notification records |
| `AdminAlert` | `id`, `alert_type`, `title`, `body`, `severity`, `status` | Operational alert center |
| `AuditLog` | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value` | Immutable audit trail |
| `SystemSetting` | `key`, `value`, `description` | Configurable operational thresholds |

---

## Deployment

### Backend (Render.com)

1. Create a new **Web Service** on Render, connect your GitHub repo, set root directory to `server/`
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `node dist/index.js`
4. Add all environment variables from `.env.example` in the Render dashboard
5. Create a **PostgreSQL** database on Render and use its `DATABASE_URL`
6. Run seed: use Render's shell to run `npm run seed`

### Admin Web Dashboard (Vercel / Netlify)

```bash
cd apps/web
npm run build
# Output in apps/web/dist/
```

Set `VITE_API_BASE_URL` to your Render backend URL in Vercel/Netlify environment settings.

### Mobile App (Android APK)

```bash
cd apps/mobile
npx expo build:android --type apk    # Classic builds (Expo Go compatible)
# OR
npx eas build --platform android     # EAS builds (recommended for production)
```

Update `apps/mobile/app.json` → `extra.apiBaseUrl` to point to your production API before building.

### Production Checklist

- [ ] Set `NODE_ENV=production` in server environment
- [ ] Use a strong `JWT_SECRET` (minimum 32 random characters)
- [ ] Change `IOT_API_KEY` to a strong random key
- [ ] Set `CORS_ORIGIN` to production frontend URLs only
- [ ] Configure S3 (or equivalent) for photo storage instead of local disk
- [ ] Remove OTP from API response (`generateOtp` in `auth.service.ts` — dev convenience only)
- [ ] Configure FCM for real push notification delivery
- [ ] Enable HTTPS on all services
- [ ] Set up `VehicleTelemetry` table partitioning by date for long-term performance

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: describe your change'`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request with a clear description of the change

Please ensure:
- Backend changes include corresponding unit tests (`server/src/`)
- New API endpoints are documented in this README
- Environment variables are added to `.env.example` and documented here
- TypeScript types are updated in `apps/mobile/src/types/api.ts` if API contracts change

---

## Authors

**D10A - Group 6**

- Department of Information Technology, Vivekanand Education Society's Institute of Technology
- Client: Brihanmumbai Municipal Corporation (BMC) — Chembur Ward
- Platform: Eco-Smart Waste Management System
- Version: 1.0.0 (MVP)
- Year: 2026
- Under Guidance Of: Prof. Charusheela Nehete

---

## License

This project is licensed under the [MIT License](LICENSE).

---

*Built for BMC's Solid Waste Management Division — making Mumbai's waste operations transparent, accountable, and data-driven.*
