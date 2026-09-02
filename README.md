# FC Glostruplona webapp

En Next.js/Supabase-startversion bygget ud fra FC Glostruplona-specifikationen.

## Kom i gang
1. Opret et Supabase-projekt.
2. Kør `supabase/schema.sql` i Supabase SQL Editor.
3. Kopiér `.env.example` til `.env.local` og udfyld Supabase-nøglerne.
4. Opret admin-brugere i Supabase Authentication.
5. Indsæt deres auth UUID i `profiles` og sæt `is_admin = true`.
6. Valgfrit: opret Resend API key og sæt `RESEND_API_KEY` for ordre-mails.
7. Kør `npm install` og `npm run dev`.

## Indeholder
- Offentlig forside, kampoversigt og Match Centre
- Trup, tabel og statistik-placeholder
- Trøje-forudbestilling til 599 kr. med MobilePay Box 9799GP
- Unikke ordrenumre FCG-0001 osv.
- Ordre-email via Resend
- Supabase Auth + adminbeskyttelse
- Admin dashboard, kampoprettelse, ordrestatus og klubmeddelelser
- RLS-politikker og audit log
- FC Glostruplona-logo i `public/fcg-logo.png`

## Mangler / næste iteration
Denne første deploybare version har ikke endnu fuldt UI til redigering/sletning af alle kampfelter, kamp-events, spillerredigering, shop-billedupload, PWA-manifest eller automatisk statistikberegning. Databasen er forberedt til de vigtigste dele, og de kan bygges videre ovenpå uden at ændre grundstrukturen.
