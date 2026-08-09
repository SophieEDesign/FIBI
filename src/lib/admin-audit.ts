import type { SupabaseClient } from '@supabase/supabase-js'

export async function writeAdminAuditLog(
  admin: SupabaseClient,
  input: {
    actorId: string | null
    action: string
    targetType?: string | null
    targetId?: string | null
    meta?: Record<string, unknown>
  }
) {
  try {
    await admin.from('admin_audit_logs').insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      meta: input.meta ?? {},
    })
  } catch (e) {
    console.error('admin_audit_logs write failed', e)
  }
}
