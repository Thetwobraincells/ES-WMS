import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

function serializeAuditValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Audit logging service.
 * Per PRD §6.2: audit_logs is an immutable event log.
 * All state-changing operations should call this service.
 */
export async function logAudit(params: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_value: serializeAuditValue(params.oldValue),
      new_value: serializeAuditValue(params.newValue),
    },
  });
}
