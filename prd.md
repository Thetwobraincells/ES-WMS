# ES-WMS Product Requirements Document
**v1.0.0 CONFIDENTIAL**
**ECO-SMART WASTE MANAGEMENT SYSTEM**
**ES-WMS**
**Product Requirements Document (PRD)**
Brihanmumbai Municipal Corporation (BMC) | SWM Digital Platform

| Version | 1.0.0 | Status | Draft - For Review |
| :--- | :--- | :--- | :--- |
| Date | March 2026 | Classification | Confidential |

---

## Document Information
**v1.0.0 CONFIDENTIAL**

| Project Name | Eco-Smart Waste Management System (ES-WMS) |
| :--- | :--- |
| Client / Stakeholder | Brihanmumbai Municipal Corporation (BMC) |
| Primary Contact | Mr. Jitendra Jagtap, BMC Representative, Chembur |
| Document Owner | Project Team |
| Document Type | Product Requirements Document (PRD) |
| Version | 1.0.0 |
| Date Created | March 2026 |
| Review Cycle | Bi-weekly with academic mentors & BMC official |
| Target Delivery | MVP in 8 Sprints (approx. 16 weeks) |

### Revision History

| Version | Date | Author | Change Summary |
| :--- | :--- | :--- | :--- |
| 1.0.0 | March 2026 | Project Team | Initial PRD All sections drafted |
| 1.0.1 | TBD | Project Team | Post first BMC review revisions |

---

## Table of Contents
*(See subsequent sections for full details)*

---

## 1. Executive Summary

The Eco-Smart Waste Management System (ES-WMS) is a role-based, full-stack digital platform designed to eliminate the operational data fog that plagues BMC's Solid Waste Management (SWM) operations in Mumbai. The city generates between 6,300 and 7,200 metric tonnes of municipal solid waste daily, yet decision-makers have no real-time visibility into the movement, verification, or enforcement of waste collection activities. 

This PRD defines the complete product requirements for the MVP (Minimum Viable Product) and subsequent sprint deliverables. It covers three interconnected portals: a Driver/Supervisor Mobile App, a Citizen/Society Mobile App, and an Admin ICCC Web Dashboard - all backed by a centralized API and a Mock IoT Data Engine for prototype validation.

> **PRIMARY GOAL:** Close the Trust Gap between field operations and BMC administration by replacing verbal reporting and manual logsheets with sensor-backed, geotagged, and automatically enforced digital workflows.

### 1.1 Key Problems Being Solved

| # | Pain Point | Current State | ES-WMS Solution |
| :--- | :--- | :--- | :--- |
| 1 | Vehicle Full Loophole | Drivers skip stops claiming truck is full unverifiable | Mock lot load sensor validates capacity before allowing skip |
| 2 | Manual Route Tracking | Paper logsheets; verbal reporting of missed spots | Digital backlog auto-created; GPS + photo proof-of-work |
| 3 | No Segregation Enforcement | Notices issued manually; ineffective compliance | Scanner-based detection triggers auto-fine deduction |
| 4 | Citizen Trust Deficit | Citizens unaware why bins skipped; no feedback loop | Push notifications explain skip reason in real time |
| 5 | Opaque Contractor Billing | Payments not linked to verified performance | GPS + weighbridge matching flags phantom trips |

---

## 2. Project Scope

### 2.1 In-Scope (MVP - Sprints 1-4)
* Driver & Supervisor Mobile Application (React Native - Android priority)
* Citizen / Society Mobile Application (React Native - Android priority)
* Admin ICCC Web Dashboard (React.js - Desktop-first)
* Backend REST API (Node.js / Express)
* PostgreSQL relational database with PostGIS geo-extension
* Python Mock IoT Data Engine (GPS pings + load cell simulation)
* Push notification system (FCM)
* Photo upload service with geofencing validation
* Automated digital backlog system
* Simulated Auto-Fining Wallet (no live banking integration)

### 2.2 Out of Scope (Future Phases)
* Real LoRaWAN / RFID / load cell hardware integration
* Live payment gateway and actual fine deduction from bank accounts
* CCTV / Al-based public dumping detection (requires physical hardware + legal clearance)
* Biometric attendance integration with existing SAP HR system
* iOS App Store deployment (Android-first; iOS in Phase 2)
* Integration with existing VTMS (Vehicle Tracking Management System)

### 2.3 Portal Overview

| Portal | Primary Users | Platform |
| :--- | :--- | :--- |
| Driver / Supervisor App | Garbage truck drivers, Mukadam (supervisors), field laborers | Android Mobile App (React Native) |
| Citizen / Society App | Housing society managers, RWA members, individual residents | Android Mobile App (React Native) |
| Admin ICCC Dashboard | BMC ward officers, route managers, compliance analysts, senior administrators | Web Browser (React.js Desktop) |

---

## 3. Stakeholders & User Personas

### 3.1 Stakeholder Map

| Stakeholder | Role in System | Primary Concern |
| :--- | :--- | :--- |
| BMC Ward Officer / Admin | System oversight, route management, penalty enforcement | Accountability & operational transparency |
| Mukadam (Field Supervisor) | Vehicle + crew supervision, spot completion verification | Proof of work, protection from false complaints |
| Garbage Truck Driver | Route execution, photo proof upload, skip reporting | Simple UI, fast task completion, protection from blame |
| Housing Society Manager | Waste segregation compliance, receiving alerts | Timely pickup, knowing skip reason, avoiding fines |
| BMC IT Administrator | System configuration, user management | System reliability, security, auditability |
| Academic Mentors / Evaluators | Project guidance and prototype validation | Technical robustness, research alignment |

### 3.2 User Personas

**Persona 1: Rajesh, Garbage Truck Driver**
* **Profile:** Age 38 | Class 10 educated | 12 years with BMC | Android phone (entry-level) | Wears gloves on route
* **Goals:**
    * Complete route quickly and accurately
    * Prove work was done to avoid supervisor complaints
    * Report full truck or inaccessible spots without paperwork
* **Frustrations:**
    * Citizens complain about missed bins even when truck was full
    * Manual logsheets take time after a tiring shift
    * No formal record when supervisor is absent
* **UX Requirements:**
    * Buttons minimum 56dp height (glove-friendly)
    * High contrast for sunlight readability
    * Minimal text entry - icon-based actions preferred
    * Offline-first: app works without constant network

**Persona 2: Meena, Housing Society Secretary**
* **Profile:** Age 45 | Manages a 200-flat CHS in Chembur | Actively participates in cleanliness drives | Frustrated by lack of communication from BMC
* **Goals:**
    * Know exactly when and why garbage was or wasn't collected
    * Avoid fines by ensuring society compliance with segregation
    * Escalate genuine missed collections to BMC digitally
* **Frustrations:**
    * No way to know if truck skipped due to full truck vs driver laziness
    * Notices for non-segregation arrive days later
    * No transparency in complaint resolution

**Persona 3: Mr. Jagtap, BMC Ward Officer**
* **Profile:** Age 52 | Government official | Desktop computer user | Manages 10 vehicles and 60+ field staff across ward | Frustrated by contractor billing discrepancies
* **Goals:**
    * Real-time visibility into which vehicles have completed which stops
    * Automated enforcement eliminate manual challan writing
    * Data-driven contractor payment validation

---

## 4. Functional Requirements

> **CONVENTION:** Each requirement is tagged: [FR-DRV] = Driver App | [FR-CIT] = Citizen App | [FR-ADM] = Admin Dashboard | [FR-API] = Backend API | [FR-IOT] = Mock IoT Engine

### 4.1 Authentication & Authorization

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-AUTH-01 | System shall support three distinct role types: DRIVER, SUPERVISOR, CITIZEN, ADMIN. Each role has access to a dedicated portal only. | Must Have |
| FR-AUTH-02 | Driver and Supervisor login via Mobile Number + OTP (no email required drivers may not have email). | Must Have |
| FR-AUTH-03 | Citizen login via Mobile Number + OTP. Society mapping done by admin during onboarding. | Must Have |
| FR-AUTH-04 | Admin login via Email + Password with optional 2FA. | Must Have |
| FR-AUTH-05 | JWT-based session tokens with 24-hour expiry for mobile apps; 8-hour for web dashboard. | Must Have |
| FR-AUTH-06 | Admin can create, suspend, or deactivate any user account. | Must Have |

### 4.2 Driver / Supervisor App - Functional Requirements

#### 4.2.1 Route Management

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-DRV-01 | Driver shall see their assigned route for the current shift on app launch, displayed as an ordered list of stops with address, bin type (wet/dry), and expected collection time. | Must Have |
| FR-DRV-02 | Each stop shall show its status: PENDING, IN_PROGRESS, COMPLETED, SKIPPED, or BACKLOGGED. | Must Have |
| FR-DRV-03 | Driver can mark a stop as COMPLETED only after uploading a geotagged photo taken within 50 metres of the stop coordinates. | Must Have |
| FR-DRV-04 | Driver can mark a stop as SKIPPED with a mandatory reason code: WASTE_MIXED \| TRUCK_FULL \| INACCESSIBLE \| OTHER. | Must Have |
| FR-DRV-05 | On SKIP, the system auto-creates a BACKLOG entry assigned to the next available shift for that route. | Must Have |
| FR-DRV-06 | Route progress bar visible at top of screen showing X/N stops completed. | Must Have |
| FR-DRV-07 | Supervisor can view routes for all vehicles assigned to their zone. | Must Have |
| FR-DRV-08 | If Supervisor is marked absent, the app prompts the Driver to upload a 'Spot Completion Photo' for every stop instead of just skipped ones. | Good To Have |

#### 4.2.2 Photo Proof of Work

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-DRV-09 | Photo capture must be done from within the app (no gallery upload allowed) to prevent fake photo submission. | Must Have |
| FR-DRV-10 | Each photo is automatically tagged with: GPS coordinates, timestamp, vehicle ID, driver ID, and stop ID before upload. | Must Have |
| FR-DRV-11 | Geofence validation: photo submission is blocked if device GPS is more than 50m from the stop's registered coordinates. | Must Have |
| FR-DRV-12 | Photos are stored in cloud object storage (AWS S3 or equivalent) and linked to the stop record in the database. | Must Have |
| FR-DRV-13 | Admin and Supervisor can review submitted photos from the dashboard. | Must Have |

#### 4.2.3 Truck Capacity & IoT Integration

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-DRV-14 | Driver app displays real-time mock truck load in kg and as a percentage of vehicle capacity (e.g., '4,200 kg / 5,000 kg 84% Full'). | Must Have |
| FR-DRV-15 | When mock load reaches 90%, a warning banner appears: 'Truck approaching capacity - 1-2 stops remaining'. | Must Have |
| FR-DRV-16 | When mock load reaches 100%, the TRUCK FULL skip reason is auto-validated - the system allows the skip without manual override. | Must Have |
| FR-DRV-17 | If a driver selects TRUCK_FULL as a skip reason but mock load is below 85%, the system flags this as a potential false claim and notifies the supervisor. | Must Have |
| FR-DRV-18 | Vehicle GPS location updates are displayed on the admin dashboard map every 30 seconds (fed by Mock loT Engine). | Must Have |

### 4.3 Citizen / Society App - Functional Requirements

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-CIT-01 | Citizen home screen shows: today's scheduled pickup time, current status (SCHEDULED / IN_PROGRESS/COMPLETED / SKIPPED), and vehicle live location (when within 500m of society). | Must Have |
| FR-CIT-02 | When a stop is marked SKIPPED by the driver, a push notification is sent to all registered citizens of that society within 2 minutes. Notification includes: reason (translated to Marathi and Hindi), expected backlog date. | Must Have |
| FR-CIT-03 | Citizen can submit a 'Missed Collection Report' if their stop shows COMPLETED but waste was not actually collected. Report includes mandatory photo. | Must Have |
| FR-CIT-04 | Society segregation compliance score (0-100) displayed on home screen. Updated after each collection. | Good To Have |
| FR-CIT-05 | Fine history tab: list of all fines issued to the society, reason, date, and simulated wallet balance. | Good To Have |
| FR-CIT-06 | Notification history tab: all alerts received in last 30 days. | Must Have |
| FR-CIT-07 | Citizen can view the named driver and vehicle assigned to their society's route for the current day. | Good To Have |
| FR-CIT-08 | App supports English, Hindi, and Marathi language switching. | Good To Have |

### 4.4 Admin ICCC Web Dashboard

#### 4.4.1 Live Operations Map

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-ADM-01 | Dashboard home shows a live map of the ward with all active vehicles plotted as moving icons. Color-coded: Green (on route) \| Orange (approaching capacity) \| Red (truck full / halted). | Must Have |
| FR-ADM-02 | Clicking a vehicle icon shows a side panel: Driver name, Vehicle ID, Current load %, Route progress (X/N stops), Last known location, Time of last update. | Must Have |
| FR-ADM-03 | Map includes a Stops layer toggle: shows all collection stops color-coded by status (Pending / Completed / Skipped / Backlogged). | Must Have |
| FR-ADM-04 | Admin can manually reassign a backlogged stop to a specific vehicle/shift from the map. | Must Have |
| FR-ADM-05 | Heatmap view: shows historical skipped stops by frequency highlights chronic problem zones. | Good To Have |

#### 4.4.2 Route & Backlog Management

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-ADM-06 | Admin can create, edit, and deactivate routes. Each route has: Route ID, Ward, Assigned vehicle, Assigned driver, Shift (AM/PM), Ordered list of stops. | Must Have |
| FR-ADM-07 | Backlog Queue view: all auto-generated backlogs ordered by priority (missed count, area, urgency). Admin can approve or re-assign. | Must Have |
| FR-ADM-08 | Admin can bulk-upload stops from CSV (for initial data seeding). | Must Have |
| FR-ADM-09 | Route history: full audit log of every route with timestamps, driver, completion rate, and any flagged anomalies. | Must Have |

#### 4.4.3 Auto-Fining Wallet (Simulated)

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-ADM-10 | Each registered society has a digital wallet with a simulated balance (e.g., starting at 10,000). | Good To Have |
| FR-ADM-11 | When a driver marks a stop as SKIPPED with reason WASTE_MIXED, a fine event is auto-generated for that society. | Good To Have |
| FR-ADM-12 | Fine event details: Society ID, Date, Fine amount (configurable by admin default 500), Reason, Driver ID, Photo evidence link. | Good To Have |
| FR-ADM-13 | Admin reviews pending fine events and clicks 'Approve' to deduct from simulated wallet. Or 'Reject' with notes. | Good To Have |
| FR-ADM-14 | Society wallet balance and fine history are visible to society managers in the Citizen App. | Good To Have |
| FR-ADM-15 | Monthly fine collection report downloadable as CSV/PDF by admin. | Good To Have |

#### 4.4.4 Mass Balance Dashboard

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-ADM-16 | Daily Mass Balance view: compares mock weight collected by each vehicle (from load cell simulator) vs. weight logged at dumping yard (manually entered or mock). | Good To Have |
| FR-ADM-17 | Discrepancy alerts: if variance > 15%, system flags the vehicle/driver for review. | Good To Have |
| FR-ADM-18 | Sankey diagram visualization showing waste flow: Collection Source Vehicle $\rightarrow$ Ward $\rightarrow$ Dumping Yard. | Good To Have |
| FR-ADM-19 | Admin can export daily mass balance report as PDF. | Good To Have |

#### 4.4.5 Alerts & Notification Center

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-ADM-20 | Admin receives in-app alerts for: Truck Full claims with load < 85%, Driver flagging a stop as INACCESSIBLE more than twice in a week, Supervisor absence with no spot photos, Society missing segregation on 3+ consecutive days. | Must Have |
| FR-ADM-21 | Admin can configure alert thresholds (e.g., false claim load threshold, consecutive non-segregation days). | Good To Have |
| FR-ADM-22 | All alerts are logged with timestamp and resolved/dismissed status for audit. | Must Have |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target |
| :--- | :--- |
| API Response Time (P95) | < 500ms for all CRUD operations |
| Photo Upload Time | < 5 seconds for 3MB image on 4G |
| Push Notification Delivery | < 2 minutes from event trigger to device receipt |
| Dashboard Map Refresh | Every 30 seconds for vehicle positions |
| Concurrent Users (MVP) | 50 simultaneous users (10 drivers, 30 citizens, 10 admins) |
| Concurrent Users (Scale target) | 500+ with horizontal scaling on cloud |

### 5.2 Reliability & Availability
* System uptime target: 99.5% (allows ~3.6 hours downtime/month)
* Driver app must function in offline mode: routes, stop list, and photo capture work without internet. Data syncs when connectivity is restored.
* Database: daily automated backups with 7-day retention
* Graceful degradation: if loT mock engine is unavailable, dashboard shows last known data with 'Data delayed' banner

### 5.3 Security
* All API traffic over HTTPS (TLS 1.2+)
* JWT tokens signed with RS256 algorithm; stored in secure storage (Keychain/Keystore) on mobile
* Role-based access control (RBAC) enforced on every API endpoint
* Photo uploads validated for file type and size (max 10MB, JPEG/PNG only) before storage
* SQL injection prevention via parameterized queries (ORM-enforced)
* Admin dashboard protected with CSRF tokens
* PII data (driver names, phone numbers, society addresses) encrypted at rest

### 5.4 Usability
* Driver app minimum touch target size: 56x56 dp (WCAG AA compliant)
* High contrast color scheme for outdoor sunlight readability (contrast ratio $\ge$ 4.5:1)
* Driver app primary actions completable with one thumb
* All error messages in plain language (no technical jargon) with suggested action
* Admin dashboard responsive down to 1280px width
* Loading states shown for all async operations > 200ms

### 5.5 Scalability & Maintainability
* Modular monolith architecture for MVP; microservices migration path documented for Phase 2
* All environment configurations in env files; no hardcoded credentials
* API versioned at /v1/ prefix for future backward compatibility
* Database migrations managed via a migration tool (e.g., Flyway or Knex migrations)
* Code coverage target: minimum 70% unit test coverage on backend API

---

## 6. Technical Architecture & Stack

### 6.1 Recommended Technology Stack

| Layer | Technology | Purpose | Justification |
| :--- | :--- | :--- | :--- |
| Mobile Apps | React Native (Expo) | Driver App + Citizen App (Android) | Single codebase, large community, easy OTA updates via Expo |
| Web Dashboard | React.js + TypeScript | Admin ICCC Dashboard | Componentbased-, excellent data viz library ecosystem |
| UI Components (Web) | shadcn/ui + Tailwind CSS | Admin Dashboard Ul | Fast development, accessible, professional look |
| UI Components (Mobile) | React Native Paper | Mobile App UI | Material Design, accessible, well-maintained |
| Maps (Mobile) | React Native Maps (Google Maps SDK) | Route display, stop markers, geofencing | Industry standard; PostGIS compatible coordinates |
| Maps (Web) | Leaflet.js + OpenStreetMap | Live vehicle tracking map | Open-source, no per-tile cost, PostGIS integration |
| Backend AΡΙ | Node.js + Express.js + TypeScript | REST API server | Non-blocking I/O ideal for real-time GPS pings |
| Database | PostgreSQL 15 + PostGIS | Primary data store | Relational + geospatial queries in one engine |
| ORM | Prisma | Database access layer | Type-safe, auto-migrations, excellent DX |
| File Storage | AWS S3 (or Cloudflare R2) | Photo storage | Scalable object storage with CDN capability |
| Push Notifications | Firebase Cloud Messaging (FCM) | Citizen & Driver alerts | Free tier sufficient for MVP; reliable delivery |
| Auth | Custom JWT + bcrypt | Session management | Full control; no vendor lock-in |
| Mock IoT Engine | Python 3 + Requests library | GPS pings + load cell simulation | Pandas for data generation; cron-scheduled POST requests |
| Data Visualization | Chart.js + Recharts | Dashboard charts | Recharts for React integration; Chart.js for complex charts |
| Cloud Hosting | Render.com (MVP) or AWS EC2 | Backend + Database hosting | Render is free-tier friendly for prototype demos |
| CI/CD | GitHub Actions | Automated test + deploy pipeline | Free for public repos; integrates with Render |
| Monitoring | Sentry (errors) + UptimeRobot | Error tracking + uptime monitoring | Free tiers sufficient for MVP monitoring |

### 6.2 Database Schema Core Entities

The following entities form the relational backbone of the ES-WMS data model:

| Entity | Key Fields | Relationships |
| :--- | :--- | :--- |
| users | id, role (ENUM), name, mobile, email, password_hash, is_active, created_at | 1:1 driver_profiles \| 1:1 $\rightarrow$ supervisor_profiles \| 1:1 $\rightarrow$ society_members |
| wards | id, name, zone, area_sq_km | 1:N routes \| 1:N societies |
| routes | id, ward_id, vehicle_id, driver_id, supervisor id, shift (AM/PM), is active | wards \| N:1 1:N $\rightarrow$ stops \| N:1 $\rightarrow$ vehicles |
| stops | id, route_id, society_id, address, lat, Ing, bin_type (WET/DRY/MIXED), sequence_order, status, skip_reason, skip_at, completed_at | N:1 routes \| N:1 $\rightarrow$ societies \| 1:N stop_photos |
| stop_photos | id, stop_id, driver_id, url, lat, Ing, taken_at, geofence_valid | N:1 $\rightarrow$ stops \| N:1 $\rightarrow$ users |
| vehicles | id, registration_no, capacity_kg, is active | 1:N routes \| 1:N $\rightarrow$ vehicle_telemetry |
| vehicle_telemetry | id, vehicle_id, lat, Ing, current_load_kg, status, recorded at, vehicle_type | N:1 vehicles (time-series; partitioned by date) |
| societies | id, ward_id, name, address, lat, Ing, contact name, contact mobile, wallet balance | 1:N stops 1:N $\rightarrow$ society_members \| 1:N $\rightarrow$ fine events |
| backlog_entries | id, original_stop_id, new_route_id, reason, created at, resolved at, status | N:1 stops \| N:1 $\rightarrow$ routes |
| fine events | id, society_id, stop_id, reason, amount, status (PENDING/APPROVED/REJECTED), admin id, created at | N:1 $\rightarrow$ societies \| N:1 $\rightarrow$ stops |
| notifications | id, target_user_id, target_society_id, type, title, body, sent_at, read_at | N:1 users N:1 $\rightarrow$ societies |
| audit_logs | id, actor_id, action, entity_type, entity_id, old_value (JSON), new_value (JSON), created at | N:1 users (immutable event log) |

### 6.3 Mock IoT Engine - Specification

A Python script simulates the hardware sensors that BMC would eventually install.

> **SIMULATION STRATEGY:** This validates the software logic end-to-end without requiring physical loT devices during the prototype phase.

The Mock loT Engine runs as an independent Python process and fires POST requests to the backend API every 30 seconds per vehicle:

**Simulated GPS Payload (per vehicle, every 30 seconds):**
* `vehicle_id`: string (e.g., 'MH-01-AB-1234')
* `gps_location`: [lat, Ing] - interpolated along the route using stored stop coordinates
* `current_load_kg`: integer - increments by 200-400 kg per completed stop; decrements to 0 on dump
* `status`: ENUM - 'en_route' | 'collecting' | 'full' | 'returning_to_depot'
* `timestamp`: ISO 8601 UTC

**Trigger Logic:**
* When `current_load_kg` $\ge$ vehicle capacity: status auto-set to 'full'; backend triggers Truck Full alert to skipped societies
* When vehicle GPS reaches depot coordinates: load resets to 0; status set to 'returning_to_depot'
* Random variance injected: $\pm$5% load drift to simulate sensor noise

---

## 7. System Architecture Overview

The ES-WMS follows a decoupled, API-first architecture with four primary layers:

### 7.1 Architecture Layers

| Layer | Components & Responsibilities |
| :--- | :--- |
| Presentation Layer | React Native Driver App \| React Native Citizen App \| React.js Admin Dashboard. All communicate exclusively through the Backend REST API. |
| Application Layer (API) | Node.js/Express REST API server. Handles: Authentication, Route CRUD, Stop status updates, Photo upload orchestration, Fine event management, Notification dispatch, Geofence validation, WebSocket for live map updates. |
| Data Layer | PostgreSQL + PostGIS for all relational and geospatial data. AWS S3 for photo blob storage. Redis (optional Phase 2) for API response caching and session store. |
| Simulation Layer (Mock loT) | Python script running on a cron job. Fires REST calls to backend mimicking real sensor hardware. Validates the full operational flow without physical devices. |

### 7.2 API Design Principles
* RESTful endpoints; JSON request/response bodies
* All endpoints prefixed: `/api/v1/`
* Pagination on all list endpoints (default page size: 20)
* Consistent error response format: `{ error: string, code: string, details?: object }`
* Rate limiting: 100 requests/minute per authenticated user; 20 requests/minute for unauthenticated
* All timestamps in ISO 8601 UTC format

### 7.3 Core API Endpoints

| Method + Path | Description | Auth Role |
| :--- | :--- | :--- |
| POST /api/v1/auth/login | OTP request and verification | Public |
| GET /api/v1/routes/my-route | Get current shift route for logged-in driver | DRIVER |
| PATCH /api/v1/stops/:id/complete | Mark stop as completed | DRIVER |
| PATCH /api/v1/stops/:id/skip | Mark stop as skipped with reason | DRIVER |
| POST /api/v1/stops/:id/photos | Upload geotagged photo for a stop | DRIVER |
| GET /api/v1/vehicles/live | Get all vehicle positions (for map) | ADMIN, SUPERVISOR |
| GET /api/v1/societies/:id/status | Get today's collection status for a society | CITIZEN |
| POST /api/v1/societies/:id/complaint | Submit missed collection complaint | CITIZEN |
| GET /api/v1/admin/backlog | Get all pending backlog entries | ADMIN |
| POST /api/v1/admin/fine-events/:id/approve | Approve a fine event | ADMIN |
| POST /api/v1/iot/telemetry | Receive vehicle telemetry from Mock IoT Engine | IOT SERVICE (API Key) |
| GET /api/v1/admin/mass-balance | Get mass balance data for date range | ADMIN |

---

## 8. Development Roadmap - Sprint Plan

> **TIMELINE:** 8 Sprints x 2 weeks = 16 weeks total. Each sprint ends with a working demo of that sprint's features. Stakeholder demo after Sprint 2, 4, 6, and 8.

### Sprint 1: Architecture & Data Foundations (Weeks 1-2)

| Task | Deliverable |
| :--- | :--- |
| Set up GitHub monorepo structure (backend, mobile, web, iot-engine) | Initialized codebase with folder structure and README |
| Design and finalize PostgreSQL schema (all entities) | Schema SQL + Prisma schema file |
| Write and run database migrations | All tables live in PostgreSQL |
| Set up Node.js/Express server with TypeScript | Running API server with health endpoint |
| Implement Auth module (OTP flow mocked SMS for prototype) | POST/auth/login and token verification working |
| Set up AWS S3 bucket (or Cloudflare R2) for photo storage | Photo upload tested via Postman |
| Build Python Mock IoT Engine v1 (GPS pings only) | Telemetry records appearing in DB every 30 seconds |
| Deploy backend to Render.com | Public API URL accessible |

### Sprint 2: Driver App Core (Weeks 3-4)

| Task | Deliverable |
| :--- | :--- |
| Set up React Native (Expo) project | App runs on Android emulator |
| Build Login screen (mobile number + OTP) | Auth flow end-to-end working |
| Build Route List screen (today's stops, status badges) | Driver sees their stops |
| Build Stop Detail screen with Complete / Skip buttons | Stop status updates to DB |
| Implement in-app camera for photo capture | Photo taken within app (no gallery) |
| Implement geofence validation on photo submission | Block submission if > 50m from stop |
| Build skip reason modal with 4 reason codes | Skip recorded with reason in DB |
| Backend: Auto-create backlog on skip | Backlog entry in DB |
| Stakeholder Demo 1: Driver App Walkthrough | Feedback session with Mr. Jagtap / mentors |

### Sprint 3: Admin Dashboard Core (Weeks 5-6)

| Task | Deliverable |
| :--- | :--- |
| Set up React.js + TypeScript + Tailwind project | Dashboard skeleton running |
| Build Admin Login screen | Auth working for admin role |
| Integrate Leaflet.js map with live vehicle positions (WebSocket) | Moving vehicle icons on map |
| Build Stop Status layer on map (color-coded stops) | Stops visible with status colors |
| Build Backlog Management table view | Admin can reassign backlogs |
| Build Route Management CRUD screens | Admin creates/edits routes and stops |
| Upgrade Mock loT Engine: add load cell simulation | Load percentage visible on vehicle panel |
| Build Truck Capacity Alert logic (85% threshold) | Alert generated in DB and shown on dashboard |
| Stakeholder Demo 2: Admin Dashboard + Driver App integrated | Full driver admin flow demonstrated |

### Sprint 4: Citizen App (Weeks 7-8)

| Task | Deliverable |
| :--- | :--- |
| Build Citizen App: Login, Home Screen with today's status | Citizen sees their society's pickup status |
| Implement FCM push notifications for skip events | Citizen receives notification within 2 min of skip |
| Build Notification History screen | Past 30 days of alerts visible |
| Build Missed Collection Complaint screen | Complaint saved to DB with photo |
| Multilingual support scaffold (English + Marathi labels) | Language toggle working |
| End-to-end integration test: Driver skips $\rightarrow$ Citizen notified Admin sees alert | Full loop validated |
| Stakeholder Demo 3: Full 3-portal integrated demo | All three portals demonstrated together |

### Sprint 5 & 6: Auto-Fining Wallet + Mass Balance (Weeks 9-12)

| Task | Deliverable |
| :--- | :--- |
| Build Society Wallet Ul in Admin Dashboard | Simulated balance visible |
| Build Fine Event review and approval workflow | Admin approves $\rightarrow$ balance deducted |
| Build Fine History view in Citizen App | Society manager sees fine log |
| Build Mass Balance data input screen (manual dumping yard weight entry) | Admin enters dumping weight |
| Build Mass Balance comparison view (collected vs dumped) | Discrepancy % displayed |
| Build Sankey Diagram (waste flow visualization) | Visual chart in dashboard |
| Build configurable alert threshold settings screen | Admin sets custom thresholds |

### Sprint 7: Polish, Security & Performance (Weeks 13-14)

| Task | Deliverable |
| :--- | :--- |
| Offline mode for Driver App (route caching, queue photo uploads) | App works without internet |
| Input validation and error handling audit (all forms) | No unhandled error states |
| Penetration testing basics: SQL injection, CSRF, JWT tampering | Security checklist completed |
| Performance profiling: identify and fix slow API endpoints | All endpoints < 500ms P95 |
| Accessibility audit on Admin Dashboard (keyboard navigation, ARIA) | WCAG AA compliance verified |
| Add Sentry error monitoring to backend and mobile app | Errors visible in Sentry dashboard |
| User acceptance testing with simulated BMC staff | Feedback collected and prioritized |

### Sprint 8: Final Deployment & Documentation (Weeks 15-16)

| Task | Deliverable |
| :--- | :--- |
| Deploy backend to production environment (AWS / Render with env vars) | Live public URL |
| Deploy Admin Dashboard to Vercel or Netlify | Live public dashboard URL |
| Build and distribute Citizen + Driver APKs for Android | Installable .apk files |
| Seed database with realistic demo data (10 vehicles, 50 stops, 20 societies) | Demo-ready system |
| Write API documentation (Swagger/OpenAPI) | All endpoints documented |
| Write Developer README (setup, env vars, running locally) | Open-source ready docs |
| Final Stakeholder Demo 4: Complete live system demo | Formal sign-off from BMC stakeholder |
| Record 5-minute product demo video | Submission asset |

---

## 9. UX Design Guidelines

### 9.1 Design Principles

| Principle | Application - Driver App | Application - Citizen App | Application - Admin Dashboard |
| :--- | :--- | :--- | :--- |
| Glove-Friendly | All tap targets $\ge$56dp. Primary actions (Complete/Skip) are full-width buttons at bottom of screen. | Standard touch targets acceptable. | N/A desktop mouse/keyboard. |
| Sunlight Readable | High contrast theme (dark navy text on white). No pastel colors. Minimum 4.5:1 contrast ratio. | Standard light theme acceptable. | Standard web contrast. |
| Offline First | Core screens (route list, stop detail) load from local cache. Photo queue stored locally, uploaded on reconnect. | Notification history cached. | N/A admin always connected. |
| One-Handed Use | Navigation at bottom (not top). Thumb zone design for primary actions. | Bottom navigation bar. | N/A desktop. |
| Minimal Cognitive Load | Max 3 actions per screen. No complex menus. Icon + label always. | Simple status view + alert feed. | Power-user Ul with filters and tables acceptable. |

### 9.2 Screen Inventory

#### Driver App Screens

| Screen | Key Elements |
| :--- | :--- |
| Splash / Login | BMC logo, mobile number input, OTP field, Submit button |
| Home / Route Overview | Progress bar, stop list (ordered), vehicle load indicator, shift info |
| Stop Detail | Society name, address, bin type badge, [Mark Complete] button, [Skip Stop] button, [View on Map] link |
| Photo Capture | Full-screen camera viewfinder, capture button, retake option, geofence status indicator |
| Skip Reason Modal | 4 reason buttons (WASTE_MIXED, TRUCK_FULL, INACCESSIBLE, OTHER), optional text note, [Confirm Skip] button |
| Truck Capacity View | Load gauge (circular), current kg / capacity kg, status banner |
| Route History | Past 7 days, completion %, any flagged stops |
| Profile / Settings | Driver info, logout button |

#### Citizen App Screens

| Screen | Key Elements |
| :--- | :--- |
| Login | Society name auto-filled after mobile verification |
| Home / Status | Today's pickup status (large badge), vehicle ETA/distance, segregation score, quick actions |
| Notification Detail | Skip reason (translated), vehicle name, backlog date, 'Lodge Complaint' CTА |
| Complaint Form | Description, in-app photo, submit button |
| Notification History | Chronological list, 30-day filter, read/unread states |
| Fine History | Fine list, wallet balance, each fine expandable with photo evidence |
| Profile / Settings | Language toggle, logout |

#### Admin Dashboard Screens

| Screen | Key Elements |
| :--- | :--- |
| Login | Email + password, 2FA code entry |
| Live Operations Map | Full-screen map, vehicle icons, stop layer, side vehicle panel, alert badge |
| Route Management | Searchable/filterable route table, create/edit route drawer, bulk CSV import |
| Stop Management | Stops table per route, drag-to-reorder, inline status editing |
| Backlog Queue | Sortable backlog table, assign-to-route dropdown, bulk actions |
| Society Management | Society list, wallet balance, fine history, compliance score |
| Fine Events | Pending fines queue, approve/reject with notes, monthly report export |
| Mass Balance | Date picker, collected vs dumped chart, discrepancy alerts, Sankey diagram |
| Alert Center | Alert feed, threshold configuration, resolve/dismiss actions |
| User Management | User table, create/edit/suspend accounts, role assignment |
| Reports | Exportable reports: Daily Route, Fine Collection, Mass Balance, Complaint Resolution |
| Settings | System configuration: geofence radius, fine amounts, alert thresholds, notification templates |

---

## 10. Recommended Project Folder Structure

> **MONOREPO:** All three apps and the backend live in a single GitHub repository for easier cross-team coordination and shared type definitions.

* `es-wms/`
    * `apps/`
        * `mobile/` - React Native (Expo) - Driver + Citizen App
            * `src/screens/driver/` - Driver-specific screens
            * `src/screens/citizen/` - Citizen-specific screens
            * `src/components/` - Shared Ul components
            * `src/services/` - API calls (Axios)
            * `src/stores/` - State management (Zustand)
        * `web/` - React.js Admin Dashboard
            * `src/pages/` - Route-level pages
            * `src/components/` - Reusable Ul components
            * `src/hooks/` - Custom React hooks
            * `src/services/` - API and WebSocket clients
    * `packages/`
        * `shared-types/` - TypeScript types shared across apps
    * `server/` - Node.js / Express Backend
        * `src/routes/` - Express route handlers
        * `src/controllers/` - Business logic
        * `src/middleware/` - Auth, rate-limit, validation
        * `src/services/` - Domain services (notification, geofence, etc.)
        * `src/models/` - Prisma schema + generated client
    * `iot-engine/` - Python Mock IoT Simulator
        * `simulator.py` - Main simulation loop
        * `vehicle_profiles.json` - Vehicle configurations
        * `route_waypoints.json` - GPS waypoints per route
    * `docs/` - PRD, API docs, architecture diagrams
    * `.github/workflows/` - GitHub Actions CI/CD

---

## 11. Testing Strategy

| Test Type | Scope | Tools |
| :--- | :--- | :--- |
| Unit Tests | Backend service functions, geofence validation logic, fine calculation logic | Jest (Node.js) |
| Integration Tests | API endpoint tests with real DB (test database) | Supertest + Jest + Docker |
| Component Tests | React components render correctly with mock data | React Testing Library |
| E2E Tests (Critical Path) | Driver completes stop $\rightarrow$ Admin sees completion Driver skips $\rightarrow$ Citizen notified | Detox (Mobile) / Playwright (Web) |
| Manual UAT | Field-simulation: tester acts as driver using physical Android device on a real route | Physical device testing |
| Load Testing (Mock) | Simulate 10 concurrent drivers sending telemetry | Artillery.io |
| Security Testing | OWASP Top 10 manual checks: injection, broken auth, IDOR | Manual + OWASP ZAP |

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Android device fragmentation (driver phones vary in GPS quality) | High | Medium | Test on minimum 3 physical Android devices; use Expo for consistent runtime |
| BMC political resistance to auto-fining feature | Medium | High | Frame as 'simulation dashboard' initially; manual approval required for any fine |
| Network unreliability in field (no 4G in certain wards) | High | High | Offline-first architecture in Driver App; sync queue implemented in Sprint 7 |
| Driver adoption resistance (tech literacy) | Medium | High | Icon-first UI; in-app tutorial; conduct one-day training session with Mukadam |
| Mock IoT data diverging from real-world behavior | Medium | Medium | Add configurable variance parameters to simulator; document assumptions clearly |
| Scope creep from stakeholder feedback | High | Medium | Strict sprint backlog management; 'Future Phase' log maintained; change requests need written approval |
| Database performance at scale (telemetry table growth) | Low (MVP) | High (Production) | Partition vehicle_telemetry by date; implement TTL for records > 90 days in Phase 2 |

---

## 13. Stakeholder Engagement Plan

| Activity | Details |
| :--- | :--- |
| Day-In-The-Life Shadowing | Before Sprint 2, spend one early morning (6:00 AM) with a garbage truck crew on their route. Document: button-press patterns while wearing gloves, lighting conditions, verbal commands between Mukadam and driver, time spent per stop. |
| Sprint Demo Sessions | After Sprint 2, 4, 6, and 8: place the phone directly in Mr. Jagtap's hands. Script: 'Here is what the driver sees when they skip a bin. Hit the Skip button.' Observe, don't explain. |
| WIIFM Framing - Admin | Lead every admin demo with the Penalty Dashboard and Contractor Accountability view. Revenue generation and accountability are primary motivators. |
| WIIFM Framing - Driver | Lead every driver demo showing how geotagged photos protect them from false complaints. Safety and self-protection are key motivators. |
| WIIFM Framing - Citizen | Lead citizen demo with the Skip Notification screen. Transparency and knowing the skip reason reduces frustration. |
| Feedback Loops | Bi-weekly written feedback form shared with mentors and BMC contact. Each form asks: 'If the dashboard shows X, what is the exact action you would take?' Build that action button in the next sprint. |
| Outcome Questions Template | 'If a vehicle reports Truck Full at 70% load - what administrative action would you take right now?' Build that trigger. |

---

## 14. SDG Alignment & Impact Metrics

| SDG Goal | ES-WMS Contribution | Projected KPΙ |
| :--- | :--- | :--- |
| SDG 11 - Sustainable Cities & Communities | Real-time waste logistics reduces overflow and illegal dumping in urban neighborhoods | 15-20% reduction in uncollected waste zones per ward |
| SDG 12 - Responsible Consumption & Production | Segregation enforcement drives wet/dry diversion; digital audit trail verifies recycling claims | Verifiable segregation rate replacing estimated 81% claim |
| SDG 16 - Peace, Justice & Strong Institutions | Automated enforcement reduces corruption in manual challan system; audit logs create accountability | 100% of contractor payments linked to verified GPS + weighbridge data |
| SDG 17 - Partnerships for the Goals | Open API design allows integration with NGO recyclers, informal sector pickers, and future IoT hardware vendors | API-first architecture enables third-party integrations |

---

## 15. MVP Acceptance Criteria

> **DEFINITION OF DONE:** The MVP is considered complete and ready for stakeholder sign-off when ALL Must-Have acceptance criteria below pass in a live demo environment with seeded demo data.

| Criteria | Pass Condition |
| :--- | :--- |
| Driver can log in via OTP and view today's route | Route loads within 3 seconds on Android device |
| Driver can mark a stop as COMPLETE with photo | Photo visible in Admin Dashboard within 10 seconds; geofence validation blocks photo > 50m from stop |
| Driver skips a stop $\rightarrow$ backlog auto-created | Backlog entry appears in Admin Dashboard within 30 seconds |
| Mock truck reaches 100% load $\rightarrow$ Admin alerted <br> Driver claims TRUCK FULL at < 85% load $\rightarrow$ flagged <br> Society receives push notification within 2 minutes of skip | Alert visible in Admin Dashboard alert center; remaining stops on route show SKIP-VALIDATED <br> Suspicious claim flag visible in Admin Dashboard <br> Notification received on Citizen App test device |
| Admin can view live vehicle positions on map | All 3 simulated vehicles visible, positions update every 30 seconds |
| Admin can reassign a backlog to another route | Backlog entry moves to new route; driver sees it in their stop list |
| Simulated fine generated for WASTE_MIXED skip | Fine event appears in Admin fine queue; Admin can approve/reject |
| All 3 portals accessible via public URL | Backend, Admin Dashboard deployed and accessible; APK installable |

---

## 16. Glossary

| Term | Definition |
| :--- | :--- |
| BMC | Brihanmumbai Municipal Corporation the civic body governing Mumbai |
| SWM | Solid Waste Management |
| ES-WMS | Eco-Smart Waste Management System the name of this project |
| MVP | Minimum Viable Product the first deployable, testable version |
| ICCC | Integrated Command and Control Centre the admin web dashboard |
| Mukadam | A field supervisor responsible for a garbage collection vehicle and crew |
| PRD | Product Requirements Document this document |
| PostGIS | A PostgreSQL extension that adds geospatial data types and queries |
| FCM | Firebase Cloud Messaging - Google's push notification service |
| loT | Internet of Things - networked physical sensors |
| LoRaWAN | Long Range Wide Area Network a low-power protocol for loT sensor communication |
| Mock loT Engine | A Python simulator that mimics real hardware sensor data for prototype testing |
| Geofence | A virtual perimeter around a real-world geographic location |
| WIIFM | What's In It For Me a stakeholder engagement framework |
| Mass Balance | A comparison of waste collected vs. waste received at dumping yard to detect leakage |
| FastTag | An Indian RFID-based automated toll collection system; used here as a metaphor for automated fine deduction |
| CHS | Co-operative Housing Society |
| RWA | Resident Welfare Association |
| Backlog | A missed collection stop automatically carried over to the next available shift |
| RBAC | Role-Based Access Control a security model restricting access based on user role |

---

## 17. Document Sign-Off

This document requires review and sign-off from the following stakeholders before development commences:

| Stakeholder | Role | Signature & Date |
| :--- | :--- | :--- |
| Mr. Jitendra Jagtap | BMC Representative, Chembur |  |
| Project Lead | Product Owner / Developer |  |
| Academic Mentor | Faculty Supervisor |  |
| Technical Lead | Lead Developer |  |

> **FEEDBACK:** All feedback, change requests, and queries regarding this document should be submitted in writing to the Project Team and logged in the Sprint Backlog for next review cycle.