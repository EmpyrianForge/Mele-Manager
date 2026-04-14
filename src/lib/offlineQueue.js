/**
 * Offline-Queue: speichert Supabase-Inserts in localStorage,
 * sync automatisch wenn wieder online
 */
import { supabase } from './supabase'

const QUEUE_KEY = 'mele_offline_queue'

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') }
  catch { return [] }
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

export function queueInsert(table, data) {
  const q = getQueue()
  q.push({ id: crypto.randomUUID(), table, data, ts: Date.now() })
  saveQueue(q)
}

export function queueCount() {
  return getQueue().length
}

export async function syncQueue() {
  const q = getQueue()
  if (!q.length) return { synced: 0, failed: 0 }

  let synced = 0, failed = 0
  const remaining = []

  for (const item of q) {
    const { error } = await supabase.from(item.table).insert(item.data)
    if (error) { remaining.push(item); failed++ }
    else synced++
  }

  saveQueue(remaining)
  return { synced, failed }
}

// Auto-sync wenn online
export function initOfflineSync(onSync) {
  window.addEventListener('online', async () => {
    if (queueCount() > 0) {
      const result = await syncQueue()
      onSync?.(result)
    }
  })
}
