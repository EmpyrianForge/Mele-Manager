import { useState, useRef } from 'react'
import { Camera, ImagePlus, X, Loader, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parseFoto, encodeFoto } from '../lib/fotoUtils'

export default function PhotoUpload({
  bucket = 'fotos',
  folder = 'allgemein',
  onUploaded,
  onRemove,
  onCommentChange,
  existingUrls = [],
  maxPhotos = 10,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editingComment, setEditingComment] = useState(null) // index of photo being commented
  const [commentDraft, setCommentDraft] = useState('')
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  const total = existingUrls.length
  const canAdd = total < maxPhotos

  async function handleFiles(files) {
    if (!files?.length) return
    setError('')
    setUploading(true)

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 10 * 1024 * 1024) { setError('Max. 10 MB pro Foto'); continue }

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      })
      if (upErr) { setError('Upload fehlgeschlagen: ' + upErr.message); continue }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onUploaded?.(data.publicUrl)
    }

    setUploading(false)
  }

  function startComment(i) {
    const { kommentar } = parseFoto(existingUrls[i])
    setCommentDraft(kommentar)
    setEditingComment(i)
  }

  function saveComment(i) {
    const { url } = parseFoto(existingUrls[i])
    const newEncoded = encodeFoto(url, commentDraft)
    onCommentChange?.(existingUrls[i], newEncoded)
    setEditingComment(null)
  }

  return (
    <div>
      {existingUrls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
          {existingUrls.map((encoded, i) => {
            const { url, kommentar } = parseFoto(encoded)
            return (
              <div key={encoded} style={{ position: 'relative' }}>
                <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => window.open(url, '_blank')}
                  />
                  {kommentar && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.65)', padding: '3px 6px',
                      fontSize: '0.7rem', color: 'white', lineHeight: 1.2,
                    }}>
                      {kommentar}
                    </div>
                  )}
                  {onRemove && (
                    <button onClick={() => onRemove(encoded)} style={{
                      position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)',
                      border: 'none', borderRadius: '50%', width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white',
                    }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                {onCommentChange && (
                  editingComment === i ? (
                    <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Kommentar..."
                        value={commentDraft}
                        onChange={e => setCommentDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveComment(i); if (e.key === 'Escape') setEditingComment(null) }}
                        style={{ flex: 1, fontSize: '0.75rem', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)' }}
                      />
                      <button onClick={() => saveComment(i)} style={{ background: 'var(--orange)', border: 'none', borderRadius: 6, color: 'white', padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>OK</button>
                    </div>
                  ) : (
                    <button onClick={() => startComment(i)} style={{
                      marginTop: 4, width: '100%', background: 'var(--bg-input)', border: 'none',
                      borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--text-muted)',
                      fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
                    }}>
                      <MessageSquare size={11} /> {kommentar ? 'Kommentar bearbeiten' : '+ Kommentar'}
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {canAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => cameraRef.current?.click()} style={{ padding: '12px 8px', fontSize: '0.85rem', gap: 6 }}>
            {uploading ? <Loader size={18} className="spin" /> : <Camera size={18} />}
            Kamera
          </button>

          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => galleryRef.current?.click()} style={{ padding: '12px 8px', fontSize: '0.85rem', gap: 6 }}>
            <ImagePlus size={18} /> Galerie
          </button>
        </div>
      )}

      {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 6 }}>{error}</div>}
      {uploading && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6, textAlign: 'center' }}>Wird hochgeladen...</div>}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{total}/{maxPhotos} Fotos</div>
    </div>
  )
}
