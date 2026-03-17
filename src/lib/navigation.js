export function getCurrentPath() {
  return window.location.pathname || '/'
}

export function navigateTo(path, { replace = false } = {}) {
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function isDogDetailPath(path) {
  return /^\/dogs\/[^/]+$/.test(path)
}

export function isRaiseExpensePath(path) {
  return /^\/dogs\/[^/]+\/raise-expense$/.test(path)
}

export function getDogIdFromPath(path) {
  const match = path.match(/^\/dogs\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function getRaiseExpenseDogIdFromPath(path) {
  const match = path.match(/^\/dogs\/([^/]+)\/raise-expense$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function isProtectedPath(path) {
  return (
    path === '/dashboard' ||
    path === '/admin/users' ||
    path === '/profile' ||
    path === '/inventory' ||
    path === '/inventory/admin' ||
    path === '/inventory/new' ||
    path === '/dogs' ||
    path === '/dogs/new' ||
    path === '/complete-profile' ||
    isRaiseExpensePath(path) ||
    isDogDetailPath(path)
  )
}

export function isPublicAuthPath(path) {
  return path === '/signin' || path === '/signup' || path === '/sign-in' || path === '/sign-up'
}
