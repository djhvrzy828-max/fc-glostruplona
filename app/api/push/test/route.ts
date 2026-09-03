import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { sendPushToAll } from '@/lib/send-push'

export async function POST() {
  try {
    const supabase =
      await createServerSupabase()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'Ikke logget ind.',
        },
        {
          status: 401,
        }
      )
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (
      profileError ||
      !profile?.is_admin
    ) {
      return NextResponse.json(
        {
          error:
            'Du har ikke adgang til denne funktion.',
        },
        {
          status: 403,
        }
      )
    }

    await sendPushToAll({
      title:
        '⚽ FC Glostruplona',
      body:
        'Push-notifikationer virker! 🔔',
      url: '/',
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      'TEST PUSH ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Kunne ikke sende testnotifikation.',
      },
      {
        status: 500,
      }
    )
  }
}