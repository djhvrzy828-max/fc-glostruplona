'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'

const schema = z.object({
  first_name: z.string().min(2).max(60),
  last_name: z.string().min(2).max(60),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
  shirt_name: z.string().max(20).optional(),
  shirt_number: z.coerce.number().int().min(0).max(99).optional(),
  comment: z.string().max(500).optional(),
})

export async function createOrder(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    throw new Error('Ugyldige ordreoplysninger')
  }

  // Server-only Supabase-klient.
  // Service role key bliver IKKE sendt til browseren.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const payload = {
    ...parsed.data,
    price: 599,
    payment_status: 'Afventer betaling',
    order_status: 'Afventer betaling',
  }

  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('order_number')
    .single()

  if (error) {
    console.error('ORDER ERROR:', error)
    throw new Error('Kunne ikke oprette bestillingen')
  }

  // Email-notifikation – aktiveres først når RESEND_API_KEY er sat.
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'FC Glostruplona <orders@resend.dev>',
      to:
        process.env.ORDER_NOTIFICATION_EMAIL ||
        'fcglostruplona@gmail.com',
      subject: `Ny FCG forudbestilling ${data.order_number}`,
      text: `Ny ordre ${data.order_number}

${parsed.data.first_name} ${parsed.data.last_name}
${parsed.data.email}
${parsed.data.phone}

Størrelse: ${parsed.data.size}
Ryg: ${parsed.data.shirt_name || '-'}
Nummer: ${parsed.data.shirt_number ?? '-'}

Pris: 599 kr.`,
    })
  }

  redirect(`/shop?order=${encodeURIComponent(data.order_number)}`)
}