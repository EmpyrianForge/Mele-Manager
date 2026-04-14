import { useState, useRef } from 'react'
import { Camera, ImagePlus, X, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * PhotoUpload – mobile-first Foto-Upload via Kamera oder Galerie
 *
 * Props:
 *   bucket      string  – Supabase Storage Bucket (default: 'fotos')
 *   folder      string  – Unterordner im Bucket (z.B. 'berichte/123')
 *   onUploaded  fn(url) – Callback mit der öffentlichen URL nach Upload
 *   onRemove    fn(url) – Callback wenn ein Foto entfernt wird
 *   existingUrls string[] – bereits vorhandene Foto-URLs
 *   maxPhotos   number  – max. Anzahl Fotos (default: 10)
 */
export default function PhotoUpload({
  bucket = 'fotos',
  folder = 'allgemein',
  onUploaded,
  onRemove,
  existingUrls = [],
  maxPhotos = 10,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
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
      if (file.size > 10 * 1024 * 1024) {
        setError('Max. 10 MB pro Foto')
        continue
      }

      // Dateiname: timestamp + zufällige ID
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

      if (upErr) {
        setError('Upload fehlgeschlagen: ' + upErr.message)
        continue
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onUploaded?.(data.publicUrl)
    }

    setUploading(false)
  }

  return (
    <div>
      {/* Vorschau-Grid */}
      {existingUrls.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          marginBottom: 10,
        }}>
          {existingUrls.map((url, i) => (
            <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onClick={() => window.open(url, '_blank')}
              />
              {onRemove && (
                <button
                  onClick={() => onRemove(url)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    borderRadius: '50%', width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload-Buttons */}
      {canAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* Kamera direkt öffnen */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
            style={{ padding: '12px 8px', fontSize: '0.85rem', gap: 6 }}
          >
            {uploading ? <Loader size={18} className="spin" /> : <Camera size={18} />}
            Kamera
          </button>

          {/* Galerie */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={uploading}
            onClick={() => galleryRef.current?.click()}
            style={{ padding: '12px 8px', fontSize: '0.85rem', gap: 6 }}
          >
            <ImagePlus size={18} />
            Galerie
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 6 }}>{error}</div>
      )}

      {uploading && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6, textAlign: 'center' }}>
          Wird hochgeladen...
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
        {total}/{maxPhotos} Fotos
      </div>
    </div>
  )
}
