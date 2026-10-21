import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slotStatusToggleSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = slotStatusToggleSchema.safeParse({
      slotId: id,
      status: body.status,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid status value", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { status } = validation.data;

    // Check slot
    const slot = await prisma.parkingSlot.findUnique({
      where: { id },
    });

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    // If setting to MAINTENANCE, verify it's not currently OCCUPIED or active
    if (status === "MAINTENANCE" && slot.status === "OCCUPIED") {
      return NextResponse.json(
        {
          error: "Cannot place an actively occupied slot into maintenance.",
        },
        { status: 400 }
      );
    }

    const updatedSlot = await prisma.parkingSlot.update({
      where: { id },
      data: { status },
      include: { zone: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Slot ${updatedSlot.slotNumber} updated to ${status}`,
        slot: updatedSlot,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating slot status:", error);
    return NextResponse.json(
      { error: "Internal server error updating slot" },
      { status: 500 }
    );
  }
}
