import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const slots = await prisma.parkingSlot.findMany({
      include: {
        zone: true,
      },
    });

    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === "OCCUPIED").length;
    const reservedSlots = slots.filter((s) => s.status === "RESERVED").length;
    const availableSlots = slots.filter((s) => s.status === "AVAILABLE").length;
    const maintenanceSlots = slots.filter((s) => s.status === "MAINTENANCE").length;

    // Occupancy rate calculation (Occupied / Total * 100)
    const occupancyRate =
      totalSlots > 0 ? Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) : 0;

    // Active EV sessions (slots of type EV with status OCCUPIED)
    const activeEVSessions = slots.filter(
      (s) => s.type === "EV" && s.status === "OCCUPIED"
    ).length;

    // Daily Revenue: Sum of payments created in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        createdAt: {
          gte: oneDayAgo,
        },
      },
      select: {
        amount: true,
      },
    });

    const dailyRevenue = Number(
      payments.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)
    );

    // Total lifetime revenue
    const allPayments = await prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    });
    const totalRevenue = Number((allPayments._sum.amount ?? 0).toFixed(2));

    return NextResponse.json({
      totalSlots,
      occupiedSlots,
      reservedSlots,
      availableSlots,
      maintenanceSlots,
      occupancyRate,
      activeEVSessions,
      dailyRevenue,
      totalRevenue,
      slots,
    });
  } catch (error) {
    console.error("Error computing admin stats:", error);
    return NextResponse.json(
      { error: "Failed to compute admin statistics" },
      { status: 500 }
    );
  }
}
