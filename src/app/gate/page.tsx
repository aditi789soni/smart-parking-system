"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  QrCode,
  ArrowRightCircle,
  ArrowLeftCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Car,
  Volume2,
  VolumeX,
  History,
} from "lucide-react";

interface QuickBooking {
  id: string;
  bookingRef: string;
  qrToken: string;
  status: string;
  graceDeadline: string;
  slot: {
    slotNumber: string;
    type: string;
    zone: {
      zoneName: string;
    };
  };
  user: {
    name: string;
    email: string;
  };
}

interface ScanEvent {
  id: string;
  timestamp: string;
  action: "CHECK_IN" | "CHECK_OUT";
  success: boolean;
  message: string;
  bookingRef?: string;
  slotNumber?: string;
}

function GateSimulatorContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");

  const [qrToken, setQrToken] = useState("");
  const [quickBookings, setQuickBookings] = useState<QuickBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Gate Hardware State Simulation
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [trafficLight, setTrafficLight] = useState<"RED" | "GREEN">("RED");
  const [verifying, setVerifying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Result Banner
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    actionType?: string;
    reservation?: any;
  } | null>(null);

  // Scan History
  const [scanHistory, setScanHistory] = useState<ScanEvent[]>([]);

  // Sound Synthesizer via Web Audio API
  const playSound = (type: "SUCCESS" | "ERROR") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "SUCCESS") {
        // High two-tone chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        // Low error buzz
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        osc.frequency.setValueAtTime(120, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Web audio playback not allowed or supported:", e);
    }
  };

  const fetchActiveBookings = async () => {
    setLoadingBookings(true);
    try {
      // Fetch CONFIRMED and ACTIVE bookings for quick testing
      const res = await fetch("/api/reservations?status=CONFIRMED,ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setQuickBookings(data.reservations || []);
      }
    } catch (e) {
      console.error("Failed to load active bookings:", e);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();
    if (tokenParam) {
      setQrToken(tokenParam);
    }
  }, [tokenParam]);

  const handleQuickSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    const selected = quickBookings.find((b) => b.id === bookingId);
    if (selected) {
      setQrToken(selected.qrToken);
    }
  };

  const handleVerify = async (action: "CHECK_IN" | "CHECK_OUT") => {
    if (!qrToken.trim()) {
      setLastResult({
        success: false,
        message: "Please enter or select a valid QR Token first.",
      });
      playSound("ERROR");
      return;
    }

    setVerifying(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/gate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: qrToken.trim(),
          action,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Access Granted!
        setBarrierOpen(true);
        setTrafficLight("GREEN");
        playSound("SUCCESS");

        setLastResult({
          success: true,
          message: data.message,
          actionType: action,
          reservation: data.reservation,
        });

        // Add to history
        const newEvent: ScanEvent = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          action,
          success: true,
          message: data.message,
          bookingRef: data.reservation?.bookingRef,
          slotNumber: data.reservation?.slot?.slotNumber,
        };
        setScanHistory((prev) => [newEvent, ...prev.slice(0, 9)]);

        // Refresh bookings in dropdown
        fetchActiveBookings();

        // Auto lower barrier after 4.5 seconds
        setTimeout(() => {
          setBarrierOpen(false);
          setTrafficLight("RED");
        }, 4500);
      } else {
        // Access Denied / Expired / Error
        setBarrierOpen(false);
        setTrafficLight("RED");
        playSound("ERROR");

        setLastResult({
          success: false,
          message: data.message || data.error || "Gate verification rejected.",
          actionType: action,
          reservation: data.reservation,
        });

        const newEvent: ScanEvent = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString(),
          action,
          success: false,
          message: data.message || data.error || "Denied",
          bookingRef: data.reservation?.bookingRef,
          slotNumber: data.reservation?.slot?.slotNumber,
        };
        setScanHistory((prev) => [newEvent, ...prev.slice(0, 9)]);

        fetchActiveBookings();
      }
    } catch (err: any) {
      setBarrierOpen(false);
      setTrafficLight("RED");
      playSound("ERROR");
      setLastResult({
        success: false,
        message: err.message || "Network error verifying token",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Hardware Emulation
            </span>
            <span className="text-xs text-slate-400">Entry/Exit Optical Reader</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Gate Barrier Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Simulate physical RFID/QR optical gate scanners. Test automated check-in grace period validation and check-out slot releases in real-time.
          </p>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors self-start sm:self-auto ${
            soundEnabled
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-400"
              : "border-slate-700 bg-slate-900 text-slate-400"
          }`}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span>Audio: {soundEnabled ? "ON" : "MUTED"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Boom Barrier Physical Simulation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient gate lighting */}
            <div
              className={`absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
                trafficLight === "GREEN" ? "bg-emerald-500/20" : "bg-rose-500/15"
              }`}
            ></div>

            {/* Top Bar with Status Display */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                {/* Traffic Light Display */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-slate-950 border border-slate-800">
                  <span
                    className={`h-4 w-4 rounded-full transition-all duration-300 ${
                      trafficLight === "RED"
                        ? "bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse"
                        : "bg-rose-950 opacity-40"
                    }`}
                  ></span>
                  <span
                    className={`h-4 w-4 rounded-full transition-all duration-300 ${
                      trafficLight === "GREEN"
                        ? "bg-emerald-400 shadow-lg shadow-emerald-400/80 animate-pulse"
                        : "bg-emerald-950 opacity-40"
                    }`}
                  ></span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">Main Plaza Gate 01</h3>
                  <p className="text-[11px] text-slate-400">Optical Laser Verification Post</p>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                  barrierOpen
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                }`}
              >
                Barrier {barrierOpen ? "OPEN / PASS" : "LOWERED / STOP"}
              </div>
            </div>

            {/* 2D Animated Boom Barrier SVG Scene */}
            <div className="relative h-64 w-full rounded-2xl bg-slate-950/80 border border-slate-800 flex items-end justify-center p-6 overflow-hidden">
              {/* Road Markings */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-slate-900 border-t-2 border-slate-800 flex items-center justify-center">
                <div className="flex gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-1.5 w-8 bg-amber-400/60 rounded"></div>
                  ))}
                </div>
              </div>

              {/* Vehicle in Lane Graphic */}
              <div
                className={`absolute bottom-6 left-12 transition-all duration-700 flex items-center gap-2 ${
                  barrierOpen ? "translate-x-48 opacity-40" : "translate-x-0 opacity-100"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="h-12 w-20 rounded-xl bg-sky-600/80 border border-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
                    <Car className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-[10px] text-sky-300 font-mono mt-1 font-bold">CAR IN BAY</span>
                </div>
              </div>

              {/* Gate Post & Arm Assembly */}
              <div className="relative z-10 flex items-end ml-24 sm:ml-40">
                {/* Gate Housing Station */}
                <div className="w-14 h-32 rounded-t-xl bg-gradient-to-t from-slate-800 to-slate-700 border-2 border-slate-600 shadow-2xl flex flex-col items-center justify-between p-2">
                  {/* Status Indicator Screen */}
                  <div className="w-full h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <span
                      className={`text-[9px] font-mono font-bold ${
                        barrierOpen ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {barrierOpen ? "PASS" : "WAIT"}
                    </span>
                  </div>
                  {/* Pivot joint */}
                  <div className="h-6 w-6 rounded-full bg-amber-500 border-2 border-slate-900 shadow"></div>
                </div>

                {/* Animated Boom Barrier Arm */}
                <div
                  className={`absolute bottom-6 left-10 origin-bottom-left transition-transform duration-700 ease-out z-20 ${
                    barrierOpen ? "-rotate-75" : "rotate-0"
                  }`}
                  style={{
                    transformOrigin: "4px 8px",
                  }}
                >
                  <div className="h-4 w-60 sm:w-80 rounded-r-full shadow-2xl flex overflow-hidden border border-slate-900">
                    {/* Reflective Red & White stripes */}
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-full ${
                          i % 2 === 0 ? "bg-rose-600" : "bg-white"
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Result Feedback Banner */}
            {lastResult && (
              <div
                className={`mt-6 rounded-2xl border p-4 text-xs transition-all animate-in fade-in slide-in-from-bottom duration-300 ${
                  lastResult.success
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                    : "border-rose-500/40 bg-rose-950/40 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">{lastResult.message}</p>
                    {lastResult.reservation && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-400 block">Ref:</span>
                          <span className="font-mono font-bold text-sky-400">
                            {lastResult.reservation.bookingRef}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Slot:</span>
                          <span className="font-bold text-white">
                            {lastResult.reservation.slot?.slotNumber} (
                            {lastResult.reservation.slot?.type})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Status:</span>
                          <span className="font-bold uppercase text-emerald-400">
                            {lastResult.reservation.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dual Input Scanner & Quick Testing Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
            <h3 className="font-bold text-base text-white flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-sky-400" />
              Scanner & Token Controls
            </h3>

            {/* Quick-Select Dropdown Mode */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Quick Select Active Booking:
                </label>
                <button
                  onClick={fetchActiveBookings}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingBookings ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <select
                value={selectedBookingId}
                onChange={(e) => handleQuickSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-medium text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="">-- Choose a live seeded/booked reservation --</option>
                {quickBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.status}] {b.bookingRef} — Slot {b.slot.slotNumber} ({b.user.name})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                * 1-Click quick test on laptop without needing camera scanner.
              </p>
            </div>

            {/* Manual Token Input */}
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Scanned QR Cryptographic Token:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="e.g. PASS-PK-9823-A4C3F1B2"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-xs font-mono text-sky-300 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Check-In and Check-Out Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleVerify("CHECK_IN")}
                disabled={verifying}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 p-3.5 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5">
                  <ArrowRightCircle className="h-4 w-4" />
                  <span>Check-In (Entry)</span>
                </div>
                <span className="text-[10px] font-normal text-emerald-100">
                  Enforces 15m Grace
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleVerify("CHECK_OUT")}
                disabled={verifying}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 p-3.5 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5">
                  <ArrowLeftCircle className="h-4 w-4" />
                  <span>Check-Out (Exit)</span>
                </div>
                <span className="text-[10px] font-normal text-indigo-100">
                  Frees Bay to Available
                </span>
              </button>
            </div>
          </div>

          {/* Audit Log / Scan History */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-sky-400" />
              Recent Barrier Event Log
            </h4>

            {scanHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No scan events recorded this session. Try verifying a token above!
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {scanHistory.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      {ev.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">
                          {ev.action === "CHECK_IN" ? "Entry" : "Exit"} {ev.bookingRef ? `(${ev.bookingRef})` : ""}
                        </span>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {ev.message}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{ev.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <GateSimulatorContent />
    </Suspense>
  );
}
