export function parseFoto(item) {
  if (!item) return { url: '', kommentar: '' }
  try {
    const p = JSON.parse(item)
    if (p && p.url) return { url: p.url, kommentar: p.kommentar || '' }
  } catch {}
  return { url: item, kommentar: '' }
}

export function encodeFoto(url, kommentar) {
  return kommentar?.trim() ? JSON.stringify({ url, kommentar: kommentar.trim() }) : url
}
