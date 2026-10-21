"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import {
  CreditCard,
  Wallet,
  Smartphone,
  Clock,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  X,
  Zap,
  Accessibility,
  Car,
} from "lucide-react";

export interface SlotItem {
  id: string;
  slotNumber: string;
  type: string;
  status: string;
  hourlyRate: number;
  zone: {
    id: string;
    zoneName: string;
    location: string;
    floor: number;
  };
}

interface BookingModalProps {
  slot: SlotItem;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (reservationData: any) => void;
}

export default function BookingModal({
  slot,
  isOpen,
  onClose,
  onBookingSuccess,
}: BookingModalProps) {
  const { currentUser } = useUser();
  const [hours, setHours] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "UPI" | "WALLET">("CARD");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCost = Number((slot.hourlyRate * hours).toFixed(2));

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || "demo-user-alex",
          slotId: slot.id,
          hours: Number(hours),
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reservation failed. Please try another slot.");
      }

      onBookingSuccess(data.reservation);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reserve slot");
    } finally {
      setSubmitting(false);
    }
  };

  const getSlotTypeIcon = (type: string) => {
    if (type === "EV") return <Zap className="h-4 w-4 text-emerald-400" />;
    if (type === "ACCESSIBLE") return <Accessibility className="h-4 w-4 text-sky-400" />;
    return <Car className="h-4 w-4 text-indigo-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md">
            {getSlotTypeIcon(slot.type)}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Reserve Slot {slot.slotNumber}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              {slot.zone.zoneName} (Floor {slot.zone.floor})
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleBooking} className="space-y-5">
          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                Select Parking Duration
              </label>
              <span className="text-xs font-bold text-sky-400">{hours} Hours</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 4, 8].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    hours === h
                      ? "border-sky-500 bg-sky-500/20 text-sky-300 shadow-sm shadow-sky-500/20"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {h} hr{h > 1 ? "s" : ""}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="12"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: "CARD", label: "Credit Card", icon: CreditCard },
                { id: "UPI", label: "Instant UPI", icon: Smartphone },
                { id: "WALLET", label: "Park Wallet", icon: Wallet },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-500/15 text-white shadow-sm"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-sky-400" : "text-slate-400"}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Hourly Rate</span>
              <span>${slot.hourlyRate.toFixed(2)} / hr</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Duration</span>
              <span>{hours} hour{hours > 1 ? "s" : ""}</span>
            </div>
            <div className="border-t border-slate-800/80 pt-2 flex justify-between font-bold text-sm">
              <span className="text-slate-200">Total Due</span>
              <span className="text-emerald-400 font-mono text-base">${totalCost.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              * Includes 15-minute grace entry period upon booking confirmation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/3 py-2.5 rounded-xl border border-slate-800 bg-slate-800/50 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Securing Slot...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Simulate Instant Payment & Reserve
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
