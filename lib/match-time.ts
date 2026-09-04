export function getMatchState(
  date: string | null,
  kickoffTime: string | null,
  status?: string | null
) {
  /*
    VIGTIGT:
    En kamp bliver nu KUN afsluttet, hvis status
    er sat til "Slut" manuelt.

    Tiden alene kan aldrig afslutte kampen.
  */

  if (status?.toLowerCase() === 'slut') {
    return {
      phase: 'Slut',
      minute: 60,
      isLive: false,
    }
  }

  if (!date || !kickoffTime) {
    return {
      phase: 'Kommende',
      minute: null,
      isLive: false,
    }
  }

  // Aktuelt klokkeslæt i Danmark
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(new Date())

  const getPart = (type: string) =>
    Number(
      parts.find((part) => part.type === type)?.value || 0
    )

  const nowYear = getPart('year')
  const nowMonth = getPart('month')
  const nowDay = getPart('day')
  const nowHour = getPart('hour')
  const nowMinute = getPart('minute')
  const nowSecond = getPart('second')

  const [matchYear, matchMonth, matchDay] = date
    .split('-')
    .map(Number)

  const [kickoffHour, kickoffMinute] = kickoffTime
    .split(':')
    .map(Number)

  /*
    UTC bruges kun som neutral værdi til at sammenligne
    de danske dato- og klokkeslætsdele.
  */
  const nowValue = Date.UTC(
    nowYear,
    nowMonth - 1,
    nowDay,
    nowHour,
    nowMinute,
    nowSecond
  )

  const kickoffValue = Date.UTC(
    matchYear,
    matchMonth - 1,
    matchDay,
    kickoffHour,
    kickoffMinute,
    0
  )

  const diffMinutes = Math.floor(
    (nowValue - kickoffValue) / 60000
  )

  // Ikke startet
  if (diffMinutes < 0) {
    return {
      phase: 'Kommende',
      minute: null,
      isLive: false,
    }
  }

  // 1. halvleg
  if (diffMinutes < 30) {
    return {
      phase: '1. halvleg',
      minute: diffMinutes + 1,
      isLive: true,
    }
  }

  // Pause
  if (diffMinutes < 35) {
    return {
      phase: 'Pause',
      minute: 30,
      isLive: true,
    }
  }

  // 2. halvleg
  if (diffMinutes < 65) {
    return {
      phase: '2. halvleg',
      minute: diffMinutes - 4,
      isLive: true,
    }
  }

  /*
    Ordinær tid er gået.

    KAMPEN SLUTTER IKKE AUTOMATISK.

    Den forbliver live indtil admin trykker
    "Afslut kamp".
  */
  return {
    phase: 'Overtid',
    minute: diffMinutes - 4,
    isLive: true,
  }
}