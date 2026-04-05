import { prisma } from "../utils/prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  targetUserId?: string;
  targetSocietyId?: string;
  type: NotificationType;
  title: string;
  body: string;
}

/**
 * Create a notification record.
 * In production, this would also trigger FCM push notification delivery.
 * For MVP, we just persist to DB (PRD FR-CIT-02 — push within 2 minutes).
 */
export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      target_user_id: params.targetUserId,
      target_society_id: params.targetSocietyId,
      type: params.type,
      title: params.title,
      body: params.body,
    },
  });

  console.log(`🔔 Notification created: [${params.type}] ${params.title}`);

  // TODO: trigger FCM push notification here
  // await sendFcmPush(params.targetUserId, params.title, params.body);

  return notification;
}

/**
 * Notify all citizens of a society about a skip event.
 * Per PRD FR-CIT-02: push notification with reason + expected backlog date.
 */
export async function notifySocietyOfSkip(
  societyId: string,
  reason: string,
  backlogDate?: string
) {
  // Get all citizen members of this society
  const members = await prisma.societyMember.findMany({
    where: { society_id: societyId },
    include: { user: true },
  });

  const bodyParts = [`Reason: ${reason}`];
  if (backlogDate) {
    bodyParts.push(`Expected next pickup: ${backlogDate}`);
  }

  // Create notification for the society
  await createNotification({
    targetSocietyId: societyId,
    type: NotificationType.SKIP_ALERT,
    title: "Collection Skipped for Your Society",
    body: bodyParts.join(". "),
  });

  // Create individual notifications for each member
  for (const member of members) {
    if (member.user.is_active) {
      await createNotification({
        targetUserId: member.user_id,
        type: NotificationType.SKIP_ALERT,
        title: "Today's Waste Collection Was Skipped",
        body: bodyParts.join(". "),
      });
    }
  }

  console.log(
    `📨 Notified ${members.length} member(s) of society ${societyId} about skip.`
  );
}

/**
 * Notify supervisor about a suspicious truck-full claim.
 * Per PRD FR-DRV-17.
 */
export async function notifyFalseFullClaim(
  supervisorId: string,
  driverName: string,
  vehicleId: string,
  loadPercent: number
) {
  await createNotification({
    targetUserId: supervisorId,
    type: NotificationType.FALSE_CLAIM_ALERT,
    title: "⚠️ Suspicious Truck Full Claim",
    body: `Driver ${driverName} claimed TRUCK_FULL but vehicle ${vehicleId} is only at ${loadPercent}% capacity.`,
  });
}
