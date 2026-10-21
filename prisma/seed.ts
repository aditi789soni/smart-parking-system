import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Clean existing records in correct relation order
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.parkingSlot.deleteMany();
  await prisma.parkingZone.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const regularUser = await prisma.user.create({
    data: {
      name: "Alex Demo",
      email: "user@example.com",
      password: "user123", // In production hash with bcrypt
      role: "REGULAR_USER",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: "Sarah Admin",
      email: "admin@example.com",
      password: "admin123",
      role: "ADMIN",
    },
  });

  const attendantUser = await prisma.user.create({
    data: {
      name: "Mike Attendant",
      email: "attendant@example.com",
      password: "attendant123",
      role: "ATTENDANT",
    },
  });

  console.log("Seeded users:", regularUser.email, adminUser.email, attendantUser.email);

  // 2. Create Zones
  const zoneA = await prisma.parkingZone.create({
    data: {
      zoneName: "Zone A - Ground Floor",
      location: "Main Building Level 1, West Concourse",
      floor: 1,
    },
  });

  const zoneB = await prisma.parkingZone.create({
    data: {
      zoneName: "Zone B - EV Deck",
      location: "East Plaza Level 2, Green Tech Hub",
      floor: 2,
    },
  });

  console.log("Seeded zones:", zoneA.zoneName, zoneB.zoneName);

  // 3. Create 12 Parking Slots
  // 6 Regular slots (A1-A6): in Zone A
  // 3 EV slots (EV1-EV3): in Zone B
  // 3 Accessible slots (ACC1-ACC3): in Zone A
  // 2 slots set to OCCUPIED initially (A2 and EV2), rest AVAILABLE

  const slotsData = [
    // Regular Slots (Zone A)
    { slotNumber: "A1", zoneId: zoneA.id, type: "REGULAR", status: "AVAILABLE", hourlyRate: 4.5 },
    { slotNumber: "A2", zoneId: zoneA.id, type: "REGULAR", status: "OCCUPIED", hourlyRate: 4.5 },
    { slotNumber: "A3", zoneId: zoneA.id, type: "REGULAR", status: "AVAILABLE", hourlyRate: 4.5 },
    { slotNumber: "A4", zoneId: zoneA.id, type: "REGULAR", status: "AVAILABLE", hourlyRate: 4.5 },
    { slotNumber: "A5", zoneId: zoneA.id, type: "REGULAR", status: "AVAILABLE", hourlyRate: 4.5 },
    { slotNumber: "A6", zoneId: zoneA.id, type: "REGULAR", status: "AVAILABLE", hourlyRate: 4.5 },

    // EV Charging Slots (Zone B)
    { slotNumber: "EV1", zoneId: zoneB.id, type: "EV", status: "AVAILABLE", hourlyRate: 7.0 },
    { slotNumber: "EV2", zoneId: zoneB.id, type: "EV", status: "OCCUPIED", hourlyRate: 7.0 },
    { slotNumber: "EV3", zoneId: zoneB.id, type: "EV", status: "AVAILABLE", hourlyRate: 7.0 },

    // Accessible Slots (Zone A - Ground level proximity)
    { slotNumber: "ACC1", zoneId: zoneA.id, type: "ACCESSIBLE", status: "AVAILABLE", hourlyRate: 4.0 },
    { slotNumber: "ACC2", zoneId: zoneA.id, type: "ACCESSIBLE", status: "AVAILABLE", hourlyRate: 4.0 },
    { slotNumber: "ACC3", zoneId: zoneA.id, type: "ACCESSIBLE", status: "AVAILABLE", hourlyRate: 4.0 },
  ];

  const createdSlots = [];
  for (const slot of slotsData) {
    const s = await prisma.parkingSlot.create({ data: slot });
    createdSlots.push(s);
  }

  console.log(`Seeded ${createdSlots.length} parking slots.`);

  // 4. Create sample reservations for the 2 OCCUPIED slots and 1 CONFIRMED slot for quick gate testing
  const now = new Date();
  const slotA2 = createdSlots.find((s) => s.slotNumber === "A2")!;
  const slotEV2 = createdSlots.find((s) => s.slotNumber === "EV2")!;
  const slotA3 = createdSlots.find((s) => s.slotNumber === "A3")!;

  // A2 is active/occupied
  const res1 = await prisma.reservation.create({
    data: {
      bookingRef: "PK-1001",
      userId: regularUser.id,
      slotId: slotA2.id,
      startTime: new Date(now.getTime() - 45 * 60 * 1000), // 45 min ago
      endTime: new Date(now.getTime() + 75 * 60 * 1000), // in 1h 15m
      totalCost: 9.0,
      status: "ACTIVE",
      qrToken: "PARK-DEMO-ACTIVE-A2",
      graceDeadline: new Date(now.getTime() - 30 * 60 * 1000),
      checkInTime: new Date(now.getTime() - 40 * 60 * 1000),
      payment: {
        create: {
          amount: 9.0,
          status: "SUCCESS",
          method: "CARD",
        },
      },
    },
  });

  // EV2 is active/occupied
  const res2 = await prisma.reservation.create({
    data: {
      bookingRef: "PK-1002",
      userId: regularUser.id,
      slotId: slotEV2.id,
      startTime: new Date(now.getTime() - 20 * 60 * 1000),
      endTime: new Date(now.getTime() + 100 * 60 * 1000),
      totalCost: 14.0,
      status: "ACTIVE",
      qrToken: "PARK-DEMO-ACTIVE-EV2",
      graceDeadline: new Date(now.getTime() - 5 * 60 * 1000),
      checkInTime: new Date(now.getTime() - 18 * 60 * 1000),
      payment: {
        create: {
          amount: 14.0,
          status: "SUCCESS",
          method: "UPI",
        },
      },
    },
  });

  // Seed a ready-to-test CONFIRMED reservation on A4 or set slot to RESERVED
  const slotA4 = createdSlots.find((s) => s.slotNumber === "A4")!;
  await prisma.parkingSlot.update({
    where: { id: slotA4.id },
    data: { status: "RESERVED" },
  });

  const res3 = await prisma.reservation.create({
    data: {
      bookingRef: "PK-9823",
      userId: regularUser.id,
      slotId: slotA4.id,
      startTime: new Date(now.getTime()),
      endTime: new Date(now.getTime() + 120 * 60 * 1000),
      totalCost: 9.0,
      status: "CONFIRMED",
      qrToken: "PARK-PASS-9823-DEMO",
      graceDeadline: new Date(now.getTime() + 15 * 60 * 1000), // 15 min remaining
      payment: {
        create: {
          amount: 9.0,
          status: "SUCCESS",
          method: "WALLET",
        },
      },
    },
  });

  console.log("Seeded sample reservations:", res1.bookingRef, res2.bookingRef, res3.bookingRef);
  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
