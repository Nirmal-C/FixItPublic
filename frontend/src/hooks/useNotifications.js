// Notification hook — wraps the browser Notifications API and service worker
// showNotification for a consistent interface across all pages.
//
// Usage:
//   const { permission, request, notify } = useNotifications()
//   await request()
//   notify('Your report was received', { body: 'Ref #1234' })

import { useState, useEffect } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  // Keep local state in sync if the user changes the permission externally.
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    setPermission(Notification.permission)
  }, [])

  // Ask for notification permission. Returns the final permission state.
  const request = async () => {
    if (typeof Notification === 'undefined') return 'unsupported'
    if (Notification.permission !== 'default') {
      setPermission(Notification.permission)
      return Notification.permission
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  // Fire a notification — prefers showing via the SW (so it works in the
  // background) but falls back to a plain Notification for desktop.
  const notify = async (title, options = {}) => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    const opts = {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [150, 80, 150],
      ...options,
    }

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(title, opts)
        return
      } catch {
        // SW not ready — fall through to inline Notification
      }
    }

    // Fallback: inline notification (no SW)
    new Notification(title, opts) // eslint-disable-line no-new
  }

  return { permission, request, notify }
}
