"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Car,
  Zap,
  Accessibility,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import ParkingSlotCard from "@/components/ParkingSlotCard";
import BookingModal, { SlotItem } from "@/components/BookingModal";
import QrPassCard, { ReservationData } from "@/components/QrPassCard";

interface ZoneItem {
  id: string;
  zoneName: string;
  location: string;
  floor: number;
}

export default function ParkingGridPage() {
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedZone, setSelectedZone] = useState<string>("ALL");

  // Recommendation State
  const [recommendedSlotId, setRecommendedSlotId] = useState<string | null>(null);
  const [recommendationMsg, setRecommendationMsg] = useState<string | null>(null);

  // Modal States
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<SlotItem | null>(null);
  const [activeReservation, setActiveReservation] = useState<ReservationData | null>(null);

  const fetchSlots = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/slots");
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setZones(data.zones || []);
      }
    } catch (err) {
      console.error("Failed to load slots:", err);
    } finally {
      setLoading(false);
      if (isRefresh) setTimeout(() => setRefreshing(false), 400);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
    // Auto refresh every 10 seconds to catch state changes from gate or lazy expirations
    const interval = setInterval(() => fetchSlots(), 10000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  // Smart Slot Recommendation Engine
  const handleSmartRecommend = () => {
    // Determine category preference based on current filter or default to ANY available
    let availableSlots = slots.filter((s) => s.status === "AVAILABLE");

    if (selectedCategory !== "ALL") {
      const categorySpecific = availableSlots.filter((s) => s.type === selectedCategory);
      if (categorySpecific.length > 0) {
        availableSlots = categorySpecific;
      }
    }

    if (availableSlots.length === 0) {
      setRecommendationMsg("No available slots found matching criteria.");
      setRecommendedSlotId(null);
      setTimeout(() => setRecommendationMsg(null), 4000);
      return;
    }

    // Recommendation logic: prefer lower floor, lowest rate, or first slot
    const bestSlot = availableSlots.sort((a, b) => {
      if (a.zone.floor !== b.zone.floor) return a.zone.floor - b.zone.floor;
      if (a.hourlyRate !== b.hourlyRate) return a.hourlyRate - b.hourlyRate;
      return a.slotNumber.localeCompare(b.slotNumber);
    })[0];

    setRecommendedSlotId(bestSlot.id);
    setRecommendationMsg(
      `Recommended: Slot ${bestSlot.slotNumber} in ${bestSlot.zone.zoneName} ($${bestSlot.hourlyRate}/hr)`
    );

    // Clear highlight message after 5 seconds
    setTimeout(() => {
      setRecommendationMsg(null);
    }, 6000);
  };

  // Filtered slots list
  const filteredSlots = slots.filter((slot) => {
    const matchesCategory =
      selectedCategory === "ALL" || slot.type === selectedCategory;
    const matchesZone =
      selectedZone === "ALL" || slot.zone.id === selectedZone;
    return matchesCategory && matchesZone;
  });

  // Aggregated Counts
  const totalCount = slots.length;
  const availableCount = slots.filter((s) => s.status === "AVAILABLE").length;
  const occupiedCount = slots.filter((s) => s.status === "OCCUPIED").length;
  const reservedCount = slots.filter((s) => s.status === "RESERVED").length;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Live IoT Grid
            </span>
            <span className="text-xs text-slate-400">12 Connected Bay Sensors</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Smart Slot Reservation
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Select an available parking space to generate an instant QR gate entry pass with automated 15-minute grace window enforcement.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSmartRecommend}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-indigo-500 transition-all hover:scale-105"
          >
            <Sparkles className="h-4 w-4" />
            Smart Slot Match
          </button>

          <button
            onClick={() => fetchSlots(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            title="Refresh grid"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-sky-400" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Recommendation Notification Banner */}
      {recommendationMsg && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-sky-500/40 bg-sky-950/40 p-4 text-xs text-sky-200 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 font-medium">
            <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
            <span>{recommendationMsg}</span>
          </div>
          <button
            onClick={() => {
              if (recommendedSlotId) {
                const s = slots.find((item) => item.id === recommendedSlotId);
                if (s) setSelectedSlotForBooking(s);
              }
            }}
            className="rounded-lg bg-sky-500 px-3 py-1 font-bold text-slate-950 hover:bg-sky-400 transition-colors"
          >
            Book Now
          </button>
        </div>
      )}

      {/* Status Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Bays</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Available</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{availableCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Reserved (Pending)</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{reservedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Occupied</p>
            <p className="text-2xl font-black text-rose-400 mt-0.5">{occupiedCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Car className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-2 hidden sm:inline flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
            Vehicle:
          </span>

          {[
            { id: "ALL", label: "All Types", icon: Layers },
            { id: "REGULAR", label: "Regular", icon: Car },
            { id: "EV", label: "EV Charging", icon: Zap },
            { id: "ACCESSIBLE", label: "Accessible", icon: Accessibility },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                    : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Zone Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Zones & Decks</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.zoneName} (Floor {z.floor})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Slots */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-sky-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading live parking bay telemetry...</p>
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-slate-800 bg-slate-900/30 p-8">
          <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Slots Match Current Filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the category or zone selector above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSlots.map((slot) => (
            <ParkingSlotCard
              key={slot.id}
              slot={slot}
              isRecommended={slot.id === recommendedSlotId}
              onSelect={(s) => setSelectedSlotForBooking(s)}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedSlotForBooking && (
        <BookingModal
          slot={selectedSlotForBooking}
          isOpen={!!selectedSlotForBooking}
          onClose={() => setSelectedSlotForBooking(null)}
          onBookingSuccess={(res) => {
            setSelectedSlotForBooking(null);
            setActiveReservation(res);
            fetchSlots(); // Refresh grid state to show slot as RESERVED
          }}
        />
      )}

      {/* Digital QR Entry Pass Modal */}
      {activeReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <QrPassCard
            reservation={activeReservation}
            onClose={() => setActiveReservation(null)}
          />
        </div>
      )}
    </div>
  );
}
