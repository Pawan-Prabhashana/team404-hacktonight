/**
 * Notifications repository — scoped to the authenticated user.
 */
import { query } from '@/lib/db'
import { ensureDatabase } from '@/lib/platform-db'

type NotificationRow = {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
}

export type SafeNotification = {
  id: number
  type: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

function toSafeNotification(row: NotificationRow): SafeNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  }
}

export async function listNotificationsForUser(
  userId: number
): Promise<SafeNotification[]> {
  await ensureDatabase()
  const result = await query<NotificationRow>(
    `SELECT id, user_id, type, title, message, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  )
  return result.rows.map(toSafeNotification)
}

export async function markNotificationRead(
  userId: number,
  notificationId: number
): Promise<boolean> {
  await ensureDatabase()
  const result = await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId]
  )
  return (result.rowCount ?? 0) > 0
}
