import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    // Optional sweep of expired reservations on slot listing to ensure live state
    const now = new Date();
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
      const expiredIds = expiredReservations.map((r) => r.id);
      const slotIds = expiredReservations.map((r) => r.slotId);

      await prisma.$transaction([
        prisma.reservation.updateMany({
          where: { id: { in: expiredIds } },
          data: { status: "EXPIRED" },
        }),
        prisma.parkingSlot.updateMany({
          where: { id: { in: slotIds }, status: "RESERVED" },
          data: { status: "AVAILABLE" },
        }),
      ]);
    }

    const whereClause: {
      zoneId?: string;
      type?: string;
      status?: string;
    } = {};

    if (zoneId && zoneId !== "ALL") whereClause.zoneId = zoneId;
    if (type && type !== "ALL") whereClause.type = type;
    if (status && status !== "ALL") whereClause.status = status;

    // Selective query fetching only necessary fields
    const slots = await prisma.parkingSlot.findMany({
      where: whereClause,
      select: {
        id: true,
        slotNumber: true,
        type: true,
        status: true,
        hourlyRate: true,
        zone: {
          select: {
            id: true,
            zoneName: true,
            location: true,
            floor: true,
          },
        },
      },
      orderBy: [
        { zone: { floor: "asc" } },
        { slotNumber: "asc" },
      ],
    });

    // Also fetch available zones for quick filter tabs
    const zones = await prisma.parkingZone.findMany({
      select: {
        id: true,
        zoneName: true,
        location: true,
        floor: true,
      },
      orderBy: { floor: "asc" },
    });

    return NextResponse.json({ slots, zones }, { status: 200 });
  } catch (error) {
    console.error("Error fetching parking slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch parking slots" },
      { status: 500 }
    );
  }
}
