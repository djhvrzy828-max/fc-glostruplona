'use client'

export default function DeleteMatchButton({
  matchName,
}: {
  matchName: string
}) {
  return (
    <button
      type="submit"
      className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 font-black text-red-400 transition hover:bg-red-500/20"
      onClick={(event) => {
        const confirmed = window.confirm(
          `Er du sikker på, at du vil slette ${matchName}?\n\nKampen og alle dens hændelser, opstilling og statistik bliver slettet permanent.`
        )

        if (!confirmed) {
          event.preventDefault()
        }
      }}
    >
      🗑️ SLET KAMP
    </button>
  )
}