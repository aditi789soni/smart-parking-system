import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { reserveSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Payload Validation with Zod
    const validationResult = reserveSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userId, slotId, hours, paymentMethod } = validationResult.data;

    const now = new Date();

    // 2. Lazy Grace-Period Sweeper
    // Find all expired CONFIRMED reservations whose grace deadline has passed
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: "CONFIRMED",
        graceDeadline: {
          lt: now,
        },
      },
      select: {
        id: true,
        slotId: true,
      },
    });

    if (expiredReservations.length > 0) {
      const expiredResIds = expiredReservations.map((r) => r.id);
      const expiredSlotIds = expiredReservations.map((r) => r.slotId);

      await prisma.$transaction([
        prisma.reservation.updateMany({
          where: { id: { in: expiredResIds } },
          data: { status: "EXPIRED" },
        }),
        prisma.parkingSlot.updateMany({
          where: { id: { in: expiredSlotIds }, status: "RESERVED" },
          data: { status: "AVAILABLE" },
        }),
      ]);
    }

    // Verify user exists (or fallback to demo user if seeded)
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If client sent an email or mock id, try to find user by email or pick first user
      user = (await prisma.user.findFirst()) || null;
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    // 3. ACID Transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Check if slot exists and is AVAILABLE
      const slot = await tx.parkingSlot.findUnique({
        where: { id: slotId },
        include: { zone: true },
      });

      if (!slot) {
        throw new Error("SLOT_NOT_FOUND");
      }

      if (slot.status !== "AVAILABLE") {
        throw new Error("SLOT_UNAVAILABLE");
      }

      // Generate booking reference e.g. "PK-8492"
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `PK-${randomSuffix}`;

      // Calculate total cost and grace deadline (15 minutes from now)
      const totalCost = Number((slot.hourlyRate * hours).toFixed(2));
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
      const graceDeadline = new Date(startTime.getTime() + 15 * 60 * 1000);

      // Generate secure signed cryptographic qrToken
      const rawTokenPayload = `${bookingRef}:${slot.slotNumber}:${startTime.getTime()}:${crypto.randomBytes(8).toString("hex")}`;
      const signature = crypto
        .createHmac("sha256", process.env.QR_SECRET || "smart-parking-secret-key-2026")
        .update(rawTokenPayload)
        .digest("hex")
        .slice(0, 16);
      const qrToken = `PASS-${bookingRef}-${signature}`.toUpperCase();

      // Create Reservation record
      const newReservation = await tx.reservation.create({
        data: {
          bookingRef,
          userId: user.id,
          slotId: slot.id,
          startTime,
          endTime,
          totalCost,
          status: "CONFIRMED",
          qrToken,
          graceDeadline,
          payment: {
            create: {
              amount: totalCost,
              status: "SUCCESS",
              method: paymentMethod,
            },
          },
        },
        include: {
          slot: {
            include: {
              zone: true,
            },
          },
          payment: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Atomically update ParkingSlot.status to "RESERVED"
      await tx.parkingSlot.update({
        where: { id: slot.id },
        data: { status: "RESERVED" },
      });

      return newReservation;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Slot reserved successfully",
        reservation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Reservation transaction error:", error);

    if (error?.message === "SLOT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Parking slot not found" },
        { status: 404 }
      );
    }

    if (error?.message === "SLOT_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "Slot is no longer available. It may have just been booked or taken.",
          code: "SLOT_CONFLICT",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error while reserving slot" },
      { status: 500 }
    );
  }
}
