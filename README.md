# ParkSmart Pro — Smart Parking Slot Reservation & Gate Verification System

A production-ready, full-stack IoT Smart Parking Slot Reservation System built with Next.js (App Router), TypeScript, SQLite with Prisma ORM, Tailwind CSS, Lucide Icons, and QR Code generation.

---

## 🌟 Key Features

### 1. Interactive 2D Parking Grid (`/`)
- **Real-Time Bay Telemetry**: Color-coded bay indicators (Green for Available, Rose for Occupied, Amber for Reserved, Slate for Maintenance).
- **Vehicle Classification**: Dedicated slot types for Regular vehicles, EV Charging bays (with lightning badge), and Accessible parking (with wheelchair badge).
- **Smart Slot Recommendation**: One-click AI matching engine that evaluates vehicle category, lowest floor proximity, and competitive rates to recommend the optimal space.
- **Booking Modal & Instant Simulation**: Configurable duration picker (1–12 hrs), transparent price breakdown, and instant simulated payment (Card, UPI, Wallet).
- **Digital QR Entry Pass**: Automatically renders high-density SVG QR Code passes with an active **15-minute grace-period countdown timer**, booking reference, and assigned bay number.

### 2. Gate Attendant & Optical Barrier Simulator (`/gate`)
- **Hardware Barrier Emulation**: Visual physical boom barrier that rotates up (-75°) upon valid scan and smoothly lowers, paired with dynamic Red/Green traffic status lights.
- **Dual Verification Modes**:
  - **Quick-Select Dropdown**: Instant 1-click testing of active and confirmed reservations on laptop without requiring a webcam.
  - **Optical Scanner / Token Entry**: Enter or paste any cryptographic QR token (also supports `?token=...` URL pre-filling).
- **Synthesized Audio Feedback**: Built-in Web Audio API chimes for access granted and low-frequency warnings for expired or rejected passes.
- **Audit Logging**: Live event stream of every barrier transaction with timestamp and response details.

### 3. Admin & Facility Performance Analytics (`/admin`)
- **Metric Cards**:
  - **Total Managed Slots** with real-time availability breakdown.
  - **Occupancy Rate %** with graphical capacity meter.
  - **Active EV Charging Sessions** monitoring green deck grid usage.
  - **Daily (24h) & All-Time Revenue** calculated directly from verified payment records.
- **Maintenance Override Controls**: Operator override switches to lock out bays for sensor calibration or maintenance, automatically preventing conflicts.

### 4. Demo Role Switcher
- Header dropdown allows instant switching between:
  - **Alex Demo** (`user@example.com` — Regular User)
  - **Sarah Admin** (`admin@example.com` — Facility Manager)
  - **Mike Attendant** (`attendant@example.com` — Gate Operations)

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript
- **Database**: SQLite (`prisma/dev.db`)
- **ORM**: Prisma Client v6 with composite performance indexes:
  - `@@index([status, type])`
  - `@@index([zoneId, status])`
  - `@@index([qrToken])`
  - `@@index([status, graceDeadline])`
- **Validation**: Zod (strict schema validation on all POST/PATCH payloads)
- **Styling**: Tailwind CSS with custom glassmorphism and keyframe barrier animations
- **Icons**: Lucide React
- **QR Engine**: `qrcode.react`

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup & Seeding
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/slots` | Fetch all parking slots with zone details and automatic lazy sweep of expired reservations |
| `POST` | `/api/reserve` | Create a reservation within an ACID transaction; validates payload with Zod, checks availability, creates payment, locks slot |
| `POST` | `/api/gate/verify` | Gate barrier check-in (validates 15-min grace period) or check-out (releases slot back to available) |
| `GET` | `/api/reservations` | Retrieve reservations list (filterable by `?status=CONFIRMED,ACTIVE`) |
| `PATCH` | `/api/slots/:id` | Admin toggle for slot status (`MAINTENANCE` <-> `AVAILABLE`) |
| `GET` | `/api/admin/stats` | Compute occupancy rate, active EV sessions, and daily revenue |
| `GET` | `/api/users` | List demo users for the role switcher |

---

## 🧪 Automated Integration Testing
To test the entire reservation, double-booking conflict prevention, gate check-in, and check-out lifecycle:
```bash
node scratch/test_flow.js
```
