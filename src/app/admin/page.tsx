"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Percent,
  Zap,
  DollarSign,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  Car,
  Accessibility,
} from "lucide-react";

interface SlotData {
  id: string;
  slotNumber: string;
  type: string;
  status: string;
  hourlyRate: number;
  zone: {
    zoneName: string;
    floor: number;
  };
}

interface AdminStats {
  totalSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  availableSlots: number;
  maintenanceSlots: number;
  occupancyRate: number;
  activeEVSessions: number;
  dailyRevenue: number;
  totalRevenue: number;
  slots: SlotData[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "SUCCESS" | "ERROR" } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMaintenance = async (slot: SlotData) => {
    const nextStatus = slot.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    setUpdatingSlotId(slot.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update slot status");
      }

      setFeedback({
        message: `Slot ${slot.slotNumber} changed to ${nextStatus}`,
        type: "SUCCESS",
      });
      fetchStats();
    } catch (err: any) {
      setFeedback({
        message: err.message || "Could not update slot status",
        type: "ERROR",
      });
    } finally {
      setUpdatingSlotId(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filteredSlots = stats?.slots.filter((s) => {
    const matchesSearch =
      s.slotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.zone.zoneName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin & Operations Console
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Facility Performance & Controls
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time occupancy analytics, automated revenue tracking, and hardware maintenance switches.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4 text-sky-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            feedback.type === "SUCCESS"
              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/40 text-rose-300"
          }`}
        >
          {feedback.type === "SUCCESS" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Metric 1: Total Slots */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Managed Slots
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {stats ? stats.totalSlots : "..."}
            </span>
            <span className="text-xs text-slate-400">bays online</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="text-emerald-400 font-medium">
              {stats ? stats.availableSlots : 0} Available
            </span>
            <span>•</span>
            <span className="text-rose-400 font-medium">
              {stats ? stats.occupiedSlots : 0} Occupied
            </span>
          </div>
        </div>

        {/* Metric 2: Occupancy Rate % */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Occupancy Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-400">
              {stats ? `${stats.occupancyRate}%` : "..."}
            </span>
            <span className="text-xs text-slate-400">capacity used</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats ? stats.occupancyRate : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Active EV Sessions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active EV Charging
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">
              {stats ? stats.activeEVSessions : "..."}
            </span>
            <span className="text-xs text-slate-400">vehicles plugged in</span>
          </div>
          <div className="mt-3 text-[11px] text-emerald-300/80 border-t border-slate-800/80 pt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Green Deck Power Grid Active
          </div>
        </div>

        {/* Metric 4: Daily Revenue */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Daily Revenue (24h)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">
              ${stats ? stats.dailyRevenue.toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
            <span>All-Time Total:</span>
            <span className="font-semibold text-slate-200 font-mono">
              ${stats ? stats.totalRevenue.toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
      </div>

      {/* Slot Management Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="h-4 w-4 text-sky-400" />
              Slot Maintenance & Override Controls
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle any bay into Maintenance mode to lock out bookings for repairs, cleaning, or sensor calibration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bay ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Slot ID</th>
                <th className="px-5 py-3.5">Zone & Deck</th>
                <th className="px-5 py-3.5">Bay Type</th>
                <th className="px-5 py-3.5">Hourly Rate</th>
                <th className="px-5 py-3.5">Current Status</th>
                <th className="px-5 py-3.5 text-right">Maintenance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No slots match search query.
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => {
                  const isUpdating = updatingSlotId === slot.id;
                  const isMaintenance = slot.status === "MAINTENANCE";
                  const isOccupied = slot.status === "OCCUPIED";

                  return (
                    <tr
                      key={slot.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4 font-black text-white text-sm">
                        {slot.slotNumber}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-200">
                          {slot.zone.zoneName}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Floor {slot.zone.floor}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          {slot.type === "EV" ? (
                            <Zap className="h-3.5 w-3.5 text-emerald-400" />
                          ) : slot.type === "ACCESSIBLE" ? (
                            <Accessibility className="h-3.5 w-3.5 text-sky-400" />
                          ) : (
                            <Car className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          {slot.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-200">
                        ${slot.hourlyRate.toFixed(2)}/hr
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            slot.status === "AVAILABLE"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : slot.status === "OCCUPIED"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : slot.status === "RESERVED"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-slate-700/40 text-slate-400 border border-slate-600/40"
                          }`}
                        >
                          {slot.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleToggleMaintenance(slot)}
                          disabled={isUpdating || isOccupied}
                          title={
                            isOccupied
                              ? "Cannot put occupied bay into maintenance"
                              : "Toggle slot maintenance status"
                          }
                          className={`px-3 py-1.5 rounded-xl font-semibold transition-all inline-flex items-center gap-1.5 text-xs ${
                            isMaintenance
                              ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/40"
                              : isOccupied
                              ? "bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed"
                              : "bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40"
                          }`}
                        >
                          {isUpdating ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : isMaintenance ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Wrench className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isMaintenance ? "Reset to Available" : "Set Maintenance"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
