import { BacklogStatus, SkipReason, Shift } from "@prisma/client";
import { prisma } from "../utils/prisma";

interface BacklogCreationResult {
  backlogId: string;
  status: BacklogStatus;
  newRouteId: string | null;
  expectedPickupAt: Date | null;
}

function getNextShiftWindow(shift: Shift, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  if (shift === Shift.AM) {
    return {
      shift: Shift.PM,
      date: startOfDay,
    };
  }

  const nextDay = new Date(startOfDay);
  nextDay.setDate(nextDay.getDate() + 1);

  return {
    shift: Shift.AM,
    date: nextDay,
  };
}

/**
 * Auto-create a backlog entry when a stop is skipped.
 * Per PRD FR-DRV-05: on SKIP, the system auto-creates a BACKLOG entry
 * assigned to the next available shift for that route.
 */
export async function createBacklogForSkippedStop(
  stopId: string,
  reason: SkipReason
): Promise<BacklogCreationResult> {
  const existing = await prisma.backlogEntry.findFirst({
    where: {
      original_stop_id: stopId,
      status: { not: BacklogStatus.RESOLVED },
    },
  });

  if (existing) {
    console.log(`Backlog already exists for stop ${stopId}, skipping duplicate creation.`);
    return {
      backlogId: existing.id,
      status: existing.status,
      newRouteId: existing.new_route_id,
      expectedPickupAt: null,
    };
  }

  const stop = await prisma.stop.findUniqueOrThrow({
    where: { id: stopId },
    include: {
      route: true,
    },
  });

  const nextWindow = getNextShiftWindow(stop.route.shift, stop.route.date);
  const nextWindowEnd = new Date(nextWindow.date);
  nextWindowEnd.setDate(nextWindowEnd.getDate() + 1);

  const nextRoute = await prisma.route.findFirst({
    where: {
      ward_id: stop.route.ward_id,
      is_active: true,
      shift: nextWindow.shift,
      date: {
        gte: nextWindow.date,
        lt: nextWindowEnd,
      },
    },
    orderBy: { created_at: "asc" },
  });

  const created = await prisma.backlogEntry.create({
    data: {
      original_stop_id: stopId,
      reason: reason.toString(),
      status: nextRoute ? BacklogStatus.ASSIGNED : BacklogStatus.PENDING,
      new_route_id: nextRoute?.id,
    },
  });

  console.log(`Backlog created for skipped stop ${stopId} (reason: ${reason})`);

  return {
    backlogId: created.id,
    status: created.status,
    newRouteId: created.new_route_id,
    expectedPickupAt: nextRoute?.date ?? nextWindow.date,
  };
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
