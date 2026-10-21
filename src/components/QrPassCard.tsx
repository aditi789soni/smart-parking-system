"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import {
  Clock,
  MapPin,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Accessibility,
  Car,
  X,
} from "lucide-react";

export interface ReservationData {
  id: string;
  bookingRef: string;
  qrToken: string;
  startTime: string;
  endTime: string;
  graceDeadline: string;
  totalCost: number;
  status: string;
  slot: {
    slotNumber: string;
    type: string;
    hourlyRate: number;
    zone: {
      zoneName: string;
      location: string;
      floor: number;
    };
  };
  payment?: {
    method: string;
    amount: number;
    status: string;
  };
}

interface QrPassCardProps {
  reservation: ReservationData;
  onClose?: () => void;
}

export default function QrPassCard({ reservation, onClose }: QrPassCardProps) {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 15,
    seconds: 0,
    isExpired: false,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function calculateCountdown() {
      const deadline = new Date(reservation.graceDeadline).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ minutes, seconds, isExpired: false });
    }

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [reservation.graceDeadline]);

  const copyToken = () => {
    navigator.clipboard.writeText(reservation.qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSlotTypeIcon = (type: string) => {
    if (type === "EV") return <Zap className="h-4 w-4 text-emerald-400" />;
    if (type === "ACCESSIBLE") return <Accessibility className="h-4 w-4 text-sky-400" />;
    return <Car className="h-4 w-4 text-indigo-400" />;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl text-slate-100 max-w-md w-full mx-auto">
      {/* Background glow effect */}
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              Digital Entry QR Pass
            </h3>
            <p className="text-[11px] text-slate-400">Present at gate barrier scanner</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Slot & Booking Key Info */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Slot Assigned
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black tracking-tight text-white">
              {reservation.slot.slotNumber}
            </span>
            <div className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
              {getSlotTypeIcon(reservation.slot.type)}
              {reservation.slot.type}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Booking Ref
          </span>
          <p className="text-xl font-mono font-bold tracking-wider text-sky-400 mt-1">
            {reservation.bookingRef}
          </p>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-white p-5 shadow-inner my-2">
        <QRCodeSVG
          value={reservation.qrToken}
          size={180}
          level="H"
          includeMargin={false}
          className="mx-auto"
        />
        <div className="mt-3 flex items-center gap-2 text-slate-800 text-[11px] font-mono font-semibold">
          <span>{reservation.qrToken.slice(0, 22)}...</span>
        </div>
      </div>

      {/* 15-Minute Grace Period Live Countdown */}
      <div
        className={`mt-4 rounded-xl border p-3 text-center transition-all ${
          timeLeft.isExpired
            ? "border-red-500/40 bg-red-950/40 text-red-300"
            : "border-amber-500/40 bg-amber-950/30 text-amber-300"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
          {timeLeft.isExpired ? (
            <>
              <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />
              <span>Grace Window Expired (Slot has been released)</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-amber-400 animate-spin-slow" />
              <span>15-Minute Entry Grace Window Remaining</span>
            </>
          )}
        </div>

        {!timeLeft.isExpired && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-black tracking-widest text-amber-400">
              {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
            </span>
            <span className="text-[11px] text-amber-200/80">until auto-expiration</span>
          </div>
        )}
      </div>

      {/* Location Details */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1.5 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-sky-400" /> Zone
          </span>
          <span className="font-medium text-slate-200">
            {reservation.slot.zone.zoneName} (Floor {reservation.slot.zone.floor})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Paid Total</span>
          <span className="font-semibold text-emerald-400">
            ${reservation.totalCost.toFixed(2)} ({reservation.payment?.method || "CARD"})
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={copyToken}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-slate-400" />
              Copy Token
            </>
          )}
        </button>

        <Link
          href={`/gate?token=${encodeURIComponent(reservation.qrToken)}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-indigo-500 transition-all"
        >
          <span>Test at Gate</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
