/**
 * Web Push Notifications
 * Arbeiter bekommt Benachrichtigung wenn er eingeplant wird
 */
import { supabase } from './supabase'

// VAPID Public Key – generiere einen neuen auf: https://vapidkeys.com
// Trage den PUBLIC key hier ein, den PRIVATE key in Supabase Edge Function
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushPermission() {
  if (!await isPushSupported()) return 'unsupported'
  return Notification.permission
}

export async function subscribeToPush(userId) {
  if (!await isPushSupported()) return false
  if (!VAPID_PUBLIC_KEY) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) await existing.unsubscribe()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    // Subscription in Supabase speichern
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    })

    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

export async function unsubscribeFromPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    return true
  } catch { return false }
}

// Lokale Test-Notification (ohne Server)
export function showLocalNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' })
  }
}
