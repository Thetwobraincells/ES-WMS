import { prisma } from "../utils/prisma";
import { BacklogStatus, SkipReason } from "@prisma/client";

/**
 * Auto-create a backlog entry when a stop is skipped.
 * Per PRD FR-DRV-05: on SKIP, the system auto-creates a BACKLOG entry
 * assigned to the next available shift for that route.
 */
export async function createBacklogForSkippedStop(
  stopId: string,
  reason: SkipReason
): Promise<void> {
  // Check if a backlog already exists for this stop
  const existing = await prisma.backlogEntry.findFirst({
    where: {
      original_stop_id: stopId,
      status: { not: BacklogStatus.RESOLVED },
    },
  });

  if (existing) {
    console.log(`⚠️ Backlog already exists for stop ${stopId}, skipping duplicate creation.`);
    return;
  }

  await prisma.backlogEntry.create({
    data: {
      original_stop_id: stopId,
      reason: reason.toString(),
      status: BacklogStatus.PENDING,
    },
  });

  console.log(`📋 Backlog created for skipped stop ${stopId} (reason: ${reason})`);
}

/**
 * Reassign a backlog entry to a new route.
 */
export async function reassignBacklog(
  backlogId: string,
  newRouteId: string
): Promise<void> {
  await prisma.backlogEntry.update({
    where: { id: backlogId },
    data: {
      new_route_id: newRouteId,
      status: BacklogStatus.ASSIGNED,
    },
  });
}

/**
 * Resolve a backlog entry (mark as completed).
 */
export async function resolveBacklog(backlogId: string): Promise<void> {
  await prisma.backlogEntry.update({
    where: { id: backlogId },
    data: {
      status: BacklogStatus.RESOLVED,
      resolved_at: new Date(),
    },
  });
}
