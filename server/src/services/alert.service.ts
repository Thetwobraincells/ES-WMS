import { AlertType, NotificationType } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { getSetting } from "./settings.service";
import { createNotification } from "./notification.service";

interface CreateAlertParams {
  alertType: AlertType;
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical";
  referenceId?: string;
}

/**
 * Create an admin alert record and notify active admins.
 */
export async function createAdminAlert(params: CreateAlertParams) {
  const alert = await prisma.adminAlert.create({
    data: {
      alert_type: params.alertType,
      title: params.title,
      body: params.body,
      severity: params.severity ?? "warning",
      reference_id: params.referenceId,
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", is_active: true },
    select: { id: true },
  });

  for (const admin of admins) {
    await createNotification({
      targetUserId: admin.id,
      type: NotificationType.SYSTEM_ALERT,
      title: params.title,
      body: params.body,
    });
  }

  console.log(`Admin alert created: [${params.alertType}] ${params.title}`);
  return alert;
}

export async function createFalseTruckFullAlert(params: {
  driverId: string;
  driverName: string;
  vehicleId: string;
  loadPercent: number;
}) {
  const threshold = await getSetting("TRUCK_FULL_THRESHOLD_PERCENT");
  const existing = await prisma.adminAlert.findFirst({
    where: {
      alert_type: AlertType.FALSE_TRUCK_FULL,
      reference_id: params.driverId,
      status: "OPEN",
      created_at: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (existing) {
    return existing;
  }

  return createAdminAlert({
    alertType: AlertType.FALSE_TRUCK_FULL,
    title: "Suspicious truck-full claim",
    body:
      `Driver ${params.driverName} claimed truck full for vehicle ${params.vehicleId} ` +
      `at ${params.loadPercent}% load, below the ${threshold}% threshold.`,
    severity: "warning",
    referenceId: params.driverId,
  });
}

/**
 * Check if a driver has flagged INACCESSIBLE more than the threshold in the past week.
 */
export async function checkInaccessibleFrequency(
  driverId: string,
  driverName: string
): Promise<void> {
  const threshold = await getSetting("INACCESSIBLE_ALERT_WEEKLY_LIMIT");

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const count = await prisma.stop.count({
    where: {
      skip_reason: "INACCESSIBLE",
      skipped_at: { gte: oneWeekAgo },
      route: { driver_id: driverId },
    },
  });

  if (count >= threshold) {
    const existingAlert = await prisma.adminAlert.findFirst({
      where: {
        alert_type: AlertType.REPEATED_INACCESSIBLE,
        reference_id: driverId,
        created_at: { gte: oneWeekAgo },
        status: "OPEN",
      },
    });

    if (!existingAlert) {
      await createAdminAlert({
        alertType: AlertType.REPEATED_INACCESSIBLE,
        title: "Repeated inaccessible claims",
        body: `Driver ${driverName} has flagged ${count} stop(s) as INACCESSIBLE in the past week.`,
        severity: "warning",
        referenceId: driverId,
      });
    }
  }
}

/**
 * Check if a society has had consecutive non-segregation violations.
 */
export async function checkConsecutiveNonSegregation(
  societyId: string,
  societyName: string
): Promise<void> {
  const threshold = await getSetting("NON_SEGREGATION_CONSECUTIVE_DAYS");

  const recentSkips = await prisma.stop.findMany({
    where: {
      society_id: societyId,
      skip_reason: "WASTE_MIXED",
      status: "SKIPPED",
    },
    orderBy: { skipped_at: "desc" },
    take: threshold,
    select: { skipped_at: true },
  });

  if (recentSkips.length < threshold) {
    return;
  }

  const nDaysAgo = new Date();
  nDaysAgo.setDate(nDaysAgo.getDate() - threshold);

  const allRecent = recentSkips.every(
    (skip) => skip.skipped_at && skip.skipped_at >= nDaysAgo
  );

  if (!allRecent) {
    return;
  }

  const existingAlert = await prisma.adminAlert.findFirst({
    where: {
      alert_type: AlertType.CONSECUTIVE_NON_SEGREGATION,
      reference_id: societyId,
      created_at: { gte: nDaysAgo },
      status: "OPEN",
    },
  });

  if (!existingAlert) {
    await createAdminAlert({
      alertType: AlertType.CONSECUTIVE_NON_SEGREGATION,
      title: "Consecutive non-segregation",
      body: `Society "${societyName}" has had waste mixed on ${threshold}+ consecutive days.`,
      severity: "critical",
      referenceId: societyId,
    });
  }
}

/**
 * Create a mass balance discrepancy alert.
 */
export async function createMassBalanceDiscrepancyAlert(
  vehicleRegistration: string,
  variancePercent: number,
  vehicleId: string
): Promise<void> {
  await createAdminAlert({
    alertType: AlertType.MASS_BALANCE_DISCREPANCY,
    title: "Mass balance discrepancy",
    body: `Vehicle ${vehicleRegistration} shows ${variancePercent.toFixed(1)}% variance between collected and dumped weight.`,
    severity: variancePercent > 30 ? "critical" : "warning",
    referenceId: vehicleId,
  });
}
