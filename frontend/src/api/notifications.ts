import client from './client'

export interface Notification {
  id: string
  notification_type: 'task_confirmed' | 'task_rejected' | 'task_submitted' | 'level_up'
  message: string
  is_read: boolean
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  const res = await client.get('/notification/notifications/')
  return res.data
}

export async function markNotificationRead(id: string): Promise<void> {
  await client.patch(`/notification/notifications/${id}/read/`)
}
