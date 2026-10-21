import { z } from "zod";

export const reserveSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  slotId: z.string().min(1, "Slot ID is required"),
  hours: z
    .number()
    .int("Hours must be an integer")
    .min(1, "Minimum reservation is 1 hour")
    .max(24, "Maximum reservation is 24 hours"),
  paymentMethod: z.enum(["CARD", "UPI", "WALLET"]),
});

export const gateVerifySchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
  action: z.enum(["CHECK_IN", "CHECK_OUT"]),
});

export const slotStatusToggleSchema = z.object({
  slotId: z.string().min(1, "Slot ID required"),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "OCCUPIED", "RESERVED"]),
});
