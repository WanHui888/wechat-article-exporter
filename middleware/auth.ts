export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client
  if (import.meta.server) return

  const publicPaths = ['/login', '/register']
  const isPublicPath = publicPaths.includes(to.path)

  const { fetchUser, isLoggedIn } = useAuth()

  // Try to fetch user if we have a token
  if (!isLoggedIn.value) {
    await fetchUser()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn.value && !isPublicPath) {
    return navigateTo('/login')
  }

  // Redirect to dashboard if already authenticated
  if (isLoggedIn.value && isPublicPath) {
    return navigateTo('/dashboard')
  }
})
