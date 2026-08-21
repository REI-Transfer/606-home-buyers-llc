export function isYouTubeUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.hostname === "youtu.be"
      || u.hostname === "www.youtube.com"
      || u.hostname === "youtube.com"
      || u.hostname === "m.youtube.com"
  } catch {
    return false
  }
}

export function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`
    }
    if (u.pathname === "/watch") {
      const v = u.searchParams.get("v")
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    if (u.pathname.startsWith("/embed/")) {
      return `https://www.youtube.com${u.pathname}`
    }
  } catch {}
  return url
}
