
const apiBase = import.meta.env.VITE_API_BASE_URL as string || ""
const backendOrigin = apiBase.replace(/\/api\/v1.*$/, "").replace(/:5000/, ":8000")

export function resolveAvatar(avatar: string | null | undefined): string | null {
  if (!avatar) return null
  if (avatar.startsWith("http")) return avatar
  // Compat: old stored paths like /src/assets/avatar/... → /api/v1/avatar/...
  const normalized = avatar.replace("/src/assets/avatar", "/api/v1/avatar")
  return `${backendOrigin}${normalized}`
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
