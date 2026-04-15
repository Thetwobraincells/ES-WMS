import { NotificationType, SkipReason } from "@prisma/client";
import { prisma } from "../utils/prisma";

interface CreateNotificationParams {
  targetUserId?: string;
  targetSocietyId?: string;
  type: NotificationType;
  title: string;
  body: string;
}

function formatDateForNotification(value: Date | null | undefined) {
  if (!value) {
    return "Next available shift";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getSkipReasonTranslations(reason: SkipReason | string) {
  switch (reason) {
    case SkipReason.WASTE_MIXED:
      return {
        english: "Waste was not segregated properly.",
        hindi: "Kachra alag-alag nahi kiya gaya tha.",
        marathi: "Kachara yogya prakarane vegala kela navhta.",
      };
    case SkipReason.TRUCK_FULL:
      return {
        english: "Truck reached full capacity.",
        hindi: "Gaadi ki capacity poori ho gayi thi.",
        marathi: "Gaadi purna kshamateparyant bharli hoti.",
      };
    case SkipReason.INACCESSIBLE:
      return {
        english: "Pickup point was inaccessible.",
        hindi: "Collection point tak pahunch sambhav nahi thi.",
        marathi: "Collection point par pohachane shakya navhate.",
      };
    default:
      return {
        english: "Collection was skipped for an operational reason.",
        hindi: "Collection ek operational wajah se skip hua.",
        marathi: "Collection operation sambandhit karanane skip jhale.",
      };
  }
}

/**
 * Create a notification record.
 * In production, this would also trigger FCM push notification delivery.
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

  console.log(`Notification created: [${params.type}] ${params.title}`);
  return notification;
}

/**
 * Notify all citizens of a society about a skip event.
 * Per PRD FR-CIT-02: push notification with translated reason + expected backlog date.
 */
export async function notifySocietyOfSkip(
  societyId: string,
  reason: SkipReason,
  expectedPickupAt?: Date | null
) {
  const members = await prisma.societyMember.findMany({
    where: { society_id: societyId },
    include: { user: true },
  });

  const translatedReason = getSkipReasonTranslations(reason);
  const pickupDate = formatDateForNotification(expectedPickupAt);
  const body =
    `Reason: ${translatedReason.english} ` +
    `Hindi: ${translatedReason.hindi} ` +
    `Marathi: ${translatedReason.marathi} ` +
    `Expected next pickup: ${pickupDate}.`;

  await createNotification({
    targetSocietyId: societyId,
    type: NotificationType.SKIP_ALERT,
    title: "Collection Skipped for Your Society",
    body,
  });

  for (const member of members) {
    if (member.user.is_active) {
      await createNotification({
        targetUserId: member.user_id,
        type: NotificationType.SKIP_ALERT,
        title: "Today's Waste Collection Was Skipped",
        body,
      });
    }
  }

  console.log(`Notified ${members.length} member(s) of society ${societyId} about skip.`);
}

/**
 * Notify supervisor about a suspicious truck-full claim.
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
    title: "Suspicious Truck Full Claim",
    body: `Driver ${driverName} claimed TRUCK_FULL but vehicle ${vehicleId} is only at ${loadPercent}% capacity.`,
  });
}
