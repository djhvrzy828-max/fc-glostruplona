'use client'

import {
  useRef,
  useState,
} from 'react'

import {
  createBrowserClient,
} from '@supabase/ssr'

import {
  savePlayerVideoUrl,
} from '@/app/admin/spillere/video-actions'

export default function PlayerVideoUploader({
  playerId,
  playerName,
  currentVideoUrl,
}: {
  playerId: string
  playerName: string
  currentVideoUrl?: string | null
}) {
  const inputRef =
    useRef<HTMLInputElement>(
      null
    )

  const [
    uploading,
    setUploading,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    videoUrl,
    setVideoUrl,
  ] = useState(
    currentVideoUrl || ''
  )

  async function uploadVideo() {
    const file =
      inputRef.current
        ?.files?.[0]

    if (!file) {
      setMessage(
        'Vælg en video først.'
      )

      return
    }

    /*
     * 25 MB burde være rigeligt
     * til en kort jubelvideo.
     */
    const maxSize =
      25 * 1024 * 1024

    if (
      file.size >
      maxSize
    ) {
      setMessage(
        'Videoen må højst fylde 25 MB.'
      )

      return
    }

    if (
      !file.type.startsWith(
        'video/'
      )
    ) {
      setMessage(
        'Den valgte fil er ikke en video.'
      )

      return
    }

    setUploading(true)
    setMessage(
      'Uploader video...'
    )

    try {
      const supabase =
        createBrowserClient(
          process.env
            .NEXT_PUBLIC_SUPABASE_URL!,
          process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

      /*
       * Find filendelse
       */
      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ''
          ) || 'mp4'

      /*
       * Unikt filnavn.
       *
       * Dermed undgår vi cache-problemer,
       * når en video bliver erstattet.
       */
      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`

      const storagePath =
        `${playerId}/${fileName}`

      /*
       * DIREKTE UPLOAD:
       *
       * Browser → Supabase Storage
       *
       * Ingen Vercel-body-limit.
       */
      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          'player-videos'
        )
        .upload(
          storagePath,
          file,
          {
            cacheControl:
              '3600',

            upsert: false,

            contentType:
              file.type,
          }
        )

      if (uploadError) {
        console.error(
          'DIRECT VIDEO UPLOAD ERROR:',
          uploadError
        )

        throw new Error(
          uploadError.message
        )
      }

      /*
       * Hent offentlig URL
       */
      const {
        data: publicUrlData,
      } = supabase.storage
        .from(
          'player-videos'
        )
        .getPublicUrl(
          storagePath
        )

      const newVideoUrl =
        publicUrlData.publicUrl

      if (!newVideoUrl) {
        throw new Error(
          'Kunne ikke hente videoens URL'
        )
      }

      /*
       * Gem kun URL'en via server action.
       *
       * Det er kun få bytes.
       */
      await savePlayerVideoUrl(
        playerId,
        newVideoUrl
      )

      setVideoUrl(
        newVideoUrl
      )

      setMessage(
        '✓ Video uploadet og gemt'
      )

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          ''
      }
    } catch (error) {
      console.error(
        'PLAYER VIDEO ERROR:',
        error
      )

      setMessage(
        error instanceof Error
          ? `Fejl: ${error.message}`
          : 'Der skete en fejl under upload.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-black">
          🎬 Spiller-video
        </div>

        <div className="mt-1 text-xs leading-5 text-neutral-500">
          Upload en kort
          2–3 sekunders video til{' '}
          {playerName}. MP4
          anbefales. Maks. 25 MB.
        </div>
      </div>

      {/* PREVIEW */}
      {videoUrl && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video
            key={videoUrl}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="aspect-video w-full object-cover sm:max-h-72"
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="text-xs font-black text-green-400">
              ✓ VIDEO UPLOADET
            </span>

            <span className="text-xs text-neutral-600">
              •
            </span>

            <span className="text-xs text-neutral-500">
              Upload en ny video
              for at erstatte den.
            </span>
          </div>
        </div>
      )}

      {/* UPLOAD */}
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-neutral-400">
            Vælg videofil
          </span>

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            disabled={
              uploading
            }
            className="block w-full cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-red-700 file:px-3 file:py-2 file:text-xs file:font-black file:text-white disabled:opacity-50"
          />
        </label>

        <button
          type="button"
          onClick={
            uploadVideo
          }
          disabled={
            uploading
          }
          className="btn mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {uploading
            ? 'UPLOADER...'
            : '🎬 UPLOAD VIDEO'}
        </button>

        {message && (
          <div
            className={
              message.startsWith(
                '✓'
              )
                ? 'mt-3 text-sm font-bold text-green-400'
                : message.startsWith(
                      'Fejl'
                    )
                  ? 'mt-3 text-sm font-bold text-red-400'
                  : 'mt-3 text-sm text-neutral-400'
            }
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}