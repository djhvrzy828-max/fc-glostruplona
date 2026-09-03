import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY!

const vapidSubject =
  process.env.VAPID_SUBJECT ||
  'mailto:fcglostruplona@gmail.com'

webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
)

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

export async function sendPushToAll({
  title,
  body,
  url = '/',
}: {
  title: string
  body: string
  url?: string
}) {
  const { data: subscriptions, error } =
    await supabase
      .from('push_subscriptions')
      .select('*')

  if (error) {
    console.error(
      'PUSH SUBSCRIPTIONS ERROR:',
      error
    )
    return
  }

  if (!subscriptions?.length) {
    return
  }

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint:
            subscription.endpoint,

          keys: {
            p256dh:
              subscription.p256dh,

            auth:
              subscription.auth,
          },
        },

        JSON.stringify({
          title,
          body,
          url,
        })
      )
    } catch (error: any) {
      console.error(
        'PUSH SEND ERROR:',
        error
      )

      if (
        error?.statusCode === 404 ||
        error?.statusCode === 410
      ) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq(
            'endpoint',
            subscription.endpoint
          )
      }
    }
  }
}