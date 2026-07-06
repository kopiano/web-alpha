
const apiBase = import.meta.env.VITE_API_URL as string || ""
const backendOrigin = apiBase.replace(/\/api\/v1.*$/, "").replace(/:5000/, ":8000")

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i

export function isLikelyAvatarAsset(avatar: string | null | undefined): boolean {
  const value = String(avatar || "").trim()
  if (!value) return false
  if (/^data:image\//i.test(value)) return true
  if (value.startsWith("/api/v1/avatar/")) return true
  if (value.startsWith("/src/assets/avatar/")) return true
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      if (url.pathname.startsWith("/api/v1/avatar/")) return true
      return IMAGE_EXT_RE.test(url.pathname)
    } catch {
      return IMAGE_EXT_RE.test(value)
    }
  }
  if (value.startsWith("/")) return IMAGE_EXT_RE.test(value)
  return IMAGE_EXT_RE.test(value)
}

export function resolveAvatar(avatar: string | null | undefined): string | null {
  if (!avatar) return null
  if (avatar.startsWith("http")) return avatar
  // Compat: old stored paths like /src/assets/avatar/... → /api/v1/avatar/...
  const normalized = avatar.replace("/src/assets/avatar", "/api/v1/avatar")
  if (normalized.startsWith("/api/v1/avatar/")) return `${backendOrigin}${normalized}`
  return `${backendOrigin}${normalized}`
}

export function resolveImageAvatar(avatar: string | null | undefined): string | null {
  if (!isLikelyAvatarAsset(avatar)) return null
  return resolveAvatar(avatar)
}

export function compressImageToBlob(file: File, maxWidth = 256, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img
      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Failed to get canvas context")); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Failed to compress image"))
        },
        "image/jpeg",
        quality,
      )
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export function compressImageToDataUrl(file: File, maxWidth = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img
      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Failed to get canvas context")); return }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL("image/jpeg", quality))
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}
