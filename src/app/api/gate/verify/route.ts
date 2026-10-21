import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { gateVerifySchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate payload
    const validationResult = gateVerifySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { qrToken, action } = validationResult.data;
    const now = new Date();

    // Find reservation by qrToken (case-insensitive trim)
    const reservation = await prisma.reservation.findFirst({
      where: {
        qrToken: {
          equals: qrToken.trim(),
        },
      },
      include: {
        slot: {
          include: {
            zone: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          error: "QR Token not recognized. No reservation found.",
          gateState: "BLOCKED",
        },
        { status: 404 }
      );
    }

    // CHECK-IN ACTION
    if (action === "CHECK_IN") {
      if (reservation.status === "ACTIVE") {
        return NextResponse.json(
          {
            success: false,
            error: "Vehicle is already checked in and currently inside the bay.",
            gateState: "BLOCKED",
            reservation,
          },
          { status: 400 }
        );
      }

      if (reservation.status === "COMPLETED") {
        return NextResponse.json(
          {
            success: false,
            error: "This reservation pass has already been used and completed.",
            gateState: "BLOCKED",
            reservation,
          },
          { status: 400 }
        );
      }

      if (reservation.status === "EXPIRED" || reservation.status === "CANCELLED") {
        return NextResponse.json(
          {
            success: false,
            error: `Reservation is ${reservation.status.toLowerCase()}. Entry denied.`,
            gateState: "BLOCKED",
            reservation,
          },
          { status: 400 }
        );
      }

      if (reservation.status === "CONFIRMED") {
        const isGracePeriodValid = now <= reservation.graceDeadline;

        if (isGracePeriodValid) {
          // Valid Check-In: Transition reservation to ACTIVE, slot to OCCUPIED
          const updatedReservation = await prisma.$transaction(async (tx) => {
            const updatedRes = await tx.reservation.update({
              where: { id: reservation.id },
              data: {
                status: "ACTIVE",
                checkInTime: now,
              },
              include: {
                slot: {
                  include: {
                    zone: true,
                  },
                },
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            });

            await tx.parkingSlot.update({
              where: { id: reservation.slotId },
              data: { status: "OCCUPIED" },
            });

            return updatedRes;
          });

          return NextResponse.json(
            {
              success: true,
              message: "Access Granted! Barrier Open.",
              gateState: "OPEN",
              actionType: "CHECK_IN",
              reservation: updatedReservation,
            },
            { status: 200 }
          );
        } else {
          // Grace period exceeded: Expire reservation and free slot
          await prisma.$transaction([
            prisma.reservation.update({
              where: { id: reservation.id },
              data: { status: "EXPIRED" },
            }),
            prisma.parkingSlot.update({
              where: { id: reservation.slotId },
              data: { status: "AVAILABLE" },
            }),
          ]);

          return NextResponse.json(
            {
              success: false,
              message: "Reservation expired (15-min grace window passed). Slot released.",
              gateState: "BLOCKED",
              actionType: "CHECK_IN_EXPIRED",
            },
            { status: 410 }
          );
        }
      }
    }

    // CHECK-OUT ACTION
    if (action === "CHECK_OUT") {
      if (reservation.status !== "ACTIVE") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot check out: reservation status is ${reservation.status} (must be ACTIVE).`,
            gateState: "BLOCKED",
            reservation,
          },
          { status: 400 }
        );
      }

      // Valid Check-Out: Transition reservation to COMPLETED, release slot to AVAILABLE
      const updatedReservation = await prisma.$transaction(async (tx) => {
        const updatedRes = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: "COMPLETED",
            checkOutTime: now,
          },
          include: {
            slot: {
              include: {
                zone: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        await tx.parkingSlot.update({
          where: { id: reservation.slotId },
          data: { status: "AVAILABLE" },
        });

        return updatedRes;
      });

      return NextResponse.json(
        {
          success: true,
          message: "Thank you for parking! Barrier Open.",
          gateState: "OPEN",
          actionType: "CHECK_OUT",
          reservation: updatedReservation,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Gate verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during gate verification" },
      { status: 500 }
    );
  }
}
