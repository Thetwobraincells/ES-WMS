import { prisma } from "../utils/prisma";
import { FineStatus } from "@prisma/client";
import { env } from "../config/env";

/**
 * Auto-generate a fine event when a stop is skipped due to WASTE_MIXED.
 * Per PRD FR-ADM-11: auto-fine event created for the society.
 */
export async function createFineForMixedWaste(
  societyId: string,
  stopId: string,
  driverId: string
): Promise<void> {
  await prisma.fineEvent.create({
    data: {
      society_id: societyId,
      stop_id: stopId,
      reason: `Waste not segregated (mixed waste detected). Driver: ${driverId}`,
      amount: env.DEFAULT_FINE_AMOUNT,
      status: FineStatus.PENDING,
    },
  });

  console.log(
    `💰 Fine event created: ₹${env.DEFAULT_FINE_AMOUNT} for society ${societyId} (WASTE_MIXED at stop ${stopId})`
  );
}

/**
 * Admin approves a fine — deducts from society wallet.
 * Per PRD FR-ADM-13.
 */
export async function approveFine(fineId: string, adminId: string): Promise<void> {
  const fine = await prisma.fineEvent.findUniqueOrThrow({ where: { id: fineId } });

  if (fine.status !== FineStatus.PENDING) {
    throw new Error(`Fine ${fineId} is already ${fine.status}.`);
  }

  // Deduct from society wallet
  await prisma.$transaction([
    prisma.fineEvent.update({
      where: { id: fineId },
      data: { status: FineStatus.APPROVED, admin_id: adminId },
    }),
    prisma.society.update({
      where: { id: fine.society_id },
      data: { wallet_balance: { decrement: fine.amount } },
    }),
  ]);

  console.log(`✅ Fine ${fineId} approved by admin ${adminId}. ₹${fine.amount} deducted from society ${fine.society_id}.`);
}

/**
 * Admin rejects a fine with notes.
 */
export async function rejectFine(fineId: string, adminId: string, notes: string): Promise<void> {
  const fine = await prisma.fineEvent.findUniqueOrThrow({ where: { id: fineId } });

  if (fine.status !== FineStatus.PENDING) {
    throw new Error(`Fine ${fineId} is already ${fine.status}.`);
  }

  await prisma.fineEvent.update({
    where: { id: fineId },
    data: {
      status: FineStatus.REJECTED,
      admin_id: adminId,
      notes,
    },
  });

  console.log(`❌ Fine ${fineId} rejected by admin ${adminId}.`);
}
