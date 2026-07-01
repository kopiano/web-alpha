const apiBase = import.meta.env.VITE_API_BASE_URL as string || ""
const backendOrigin = apiBase.replace(/\/api\/v1.*$/, "").replace(/:5000/, ":8000")

export function resolveAvatar(avatar: string | null | undefined): string | null {
  if (!avatar) return null
  if (avatar.startsWith("http")) return avatar
  // Compat: old stored paths like /src/assets/avatar/... → /api/v1/avatar/...
  const normalized = avatar.replace("/src/assets/avatar", "/api/v1/avatar")
  return `${backendOrigin}${normalized}`
}
