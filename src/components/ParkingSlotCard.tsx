"use client";

import React from "react";
import { Zap, Accessibility, Car, Wrench, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { SlotItem } from "./BookingModal";

interface ParkingSlotCardProps {
  slot: SlotItem;
  onSelect: (slot: SlotItem) => void;
  isRecommended?: boolean;
}

export default function ParkingSlotCard({
  slot,
  onSelect,
  isRecommended = false,
}: ParkingSlotCardProps) {
  const isAvailable = slot.status === "AVAILABLE";
  const isOccupied = slot.status === "OCCUPIED";
  const isReserved = slot.status === "RESERVED";
  const isMaintenance = slot.status === "MAINTENANCE";

  const getTypeIcon = () => {
    switch (slot.type) {
      case "EV":
        return <Zap className="h-4 w-4 text-emerald-400" />;
      case "ACCESSIBLE":
        return <Accessibility className="h-4 w-4 text-sky-400" />;
      default:
        return <Car className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = () => {
    if (isAvailable) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Available
        </span>
      );
    }
    if (isOccupied) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
          Occupied
        </span>
      );
    }
    if (isReserved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="h-2.5 w-2.5" />
          Reserved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-700/40 text-slate-400 border border-slate-600/40">
        <Wrench className="h-2.5 w-2.5" />
        Maintenance
      </span>
    );
  };

  const getCardStyle = () => {
    if (isRecommended) {
      return "border-sky-400/80 bg-gradient-to-b from-sky-950/40 to-slate-900 shadow-xl shadow-sky-500/20 ring-2 ring-sky-400/50";
    }
    if (isAvailable) {
      return "border-emerald-600/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/80 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer";
    }
    if (isOccupied) {
      return "border-rose-900/40 bg-gradient-to-b from-rose-950/20 to-slate-900/80 opacity-90 cursor-not-allowed";
    }
    if (isReserved) {
      return "border-amber-900/40 bg-gradient-to-b from-amber-950/20 to-slate-900/80 opacity-95 cursor-not-allowed";
    }
    return "border-slate-800 bg-slate-950/60 opacity-60 cursor-not-allowed";
  };

  return (
    <div
      onClick={() => isAvailable && onSelect(slot)}
      className={`relative group rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${getCardStyle()}`}
    >
      {/* Recommended Tag */}
      {isRecommended && (
        <div className="absolute -top-3 left-4 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
          <Sparkles className="h-3 w-3" />
          AI Best Match
        </div>
      )}

      {/* Top row: Slot Number & Status */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Bay ID
          </span>
          <h3 className="text-2xl font-black tracking-tight text-white group-hover:scale-105 transition-transform">
            {slot.slotNumber}
          </h3>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Center 2D Bay Parking Graphic */}
      <div className="my-3.5 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 py-3 relative overflow-hidden">
        {/* Parking Bay Lines */}
        <div className="absolute inset-x-2 top-0 h-[2px] bg-slate-700/60"></div>
        <div className="absolute inset-x-2 bottom-0 h-[2px] bg-slate-700/60"></div>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
            {getTypeIcon()}
          </div>
        </div>

        <span className="text-[11px] font-medium text-slate-300 capitalize">
          {slot.type.toLowerCase()} Space
        </span>
      </div>

      {/* Bottom details: Rate and action */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 block">Rate</span>
          <span className="text-xs font-bold text-slate-100 font-mono">
            ${slot.hourlyRate.toFixed(2)}
            <span className="text-[10px] font-normal text-slate-400">/hr</span>
          </span>
        </div>

        {isAvailable ? (
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Book
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-500 capitalize">
            {slot.status.toLowerCase()}
          </span>
        )}
      </div>
    </div>
  );
}
