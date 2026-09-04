'use server'

import { createServerSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function savePlayerVideoUrl(
  playerId: string,
  videoUrl: string
) {
  const s =
    await createServerSupabase()

  /*
   * TJEK LOGIN
   */
  const {
    data: { user },
  } = await s.auth.getUser()

  if (!user) {
    throw new Error(
      'Ikke autoriseret'
    )
  }

  /*
   * TJEK ADMIN
   */
  const {
    data: profile,
  } = await s
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    throw new Error(
      'Ikke administrator'
    )
  }

  if (!playerId) {
    throw new Error(
      'Spiller-ID mangler'
    )
  }

  if (!videoUrl) {
    throw new Error(
      'Video-URL mangler'
    )
  }

  /*
   * SIKKERHED:
   * URL'en skal komme fra vores
   * player-videos bucket.
   */
  if (
    !videoUrl.includes(
      '/storage/v1/object/public/player-videos/'
    )
  ) {
    throw new Error(
      'Ugyldig video-URL'
    )
  }

  /*
   * HENT SPILLER
   */
  const {
    data: player,
    error: playerError,
  } = await s
    .from('players')
    .select(
      'first_name,last_name'
    )
    .eq('id', playerId)
    .single()

  if (
    playerError ||
    !player
  ) {
    console.error(
      'SAVE PLAYER VIDEO PLAYER ERROR:',
      playerError
    )

    throw new Error(
      'Kunne ikke finde spilleren'
    )
  }

  /*
   * GEM URL
   */
  const {
    error: updateError,
  } = await s
    .from('players')
    .update({
      video_url: videoUrl,
    })
    .eq('id', playerId)

  if (updateError) {
    console.error(
      'SAVE PLAYER VIDEO URL ERROR:',
      updateError
    )

    throw new Error(
      'Kunne ikke gemme videoen på spilleren'
    )
  }

  /*
   * AUDIT LOG
   */
  await s
    .from('audit_logs')
    .insert({
      admin_id: user.id,

      action:
        `Uploadede spillervideo til ${player.first_name} ${player.last_name}`,
    })

  revalidatePath(
    '/admin/spillere'
  )

  revalidatePath('/trup')

  revalidatePath(
    `/trup/${playerId}`
  )

  return {
    success: true,
  }
}