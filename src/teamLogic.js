import { LANES, LANE_ORDER } from './constants'

export function generateTeams(players) {
  const humans = players.filter(p => !p.isCpu)
  const cpus = players.filter(p => p.isCpu)

  // ── 1. 希望レーンが1つのメンバーをレーンごとに集計 ──
  const confirmedBlue = []
  const confirmedRed = []
  const overflowSet = new Set()

  for (const lane of LANES) {
    const candidates = humans
      .filter(p => p.lanes.length === 1 && p.lanes[0] === lane)
      .sort(() => Math.random() - 0.5)

    if (candidates.length >= 1) confirmedBlue.push({ player: candidates[0], lane })
    if (candidates.length >= 2) confirmedRed.push({ player: candidates[1], lane })
    for (const p of candidates.slice(2)) overflowSet.add(p.name)
  }

  const confirmedNames = new Set([
    ...confirmedBlue.map(f => f.player.name),
    ...confirmedRed.map(f => f.player.name),
    ...overflowSet,
  ])

  // ── 2. 確定メンバーをチームに配置 ──
  const teams = { Blue: [], Red: [] }
  const usedLanes = { Blue: new Set(), Red: new Set() }

  for (const { player, lane } of confirmedBlue) {
    if (!usedLanes.Blue.has(lane) && teams.Blue.length < 5) {
      usedLanes.Blue.add(lane)
      teams.Blue.push({ ...player, lane })
    } else {
      overflowSet.add(player.name)
    }
  }

  for (const { player, lane } of confirmedRed) {
    if (!usedLanes.Red.has(lane) && teams.Red.length < 5) {
      usedLanes.Red.add(lane)
      teams.Red.push({ ...player, lane })
    } else {
      overflowSet.add(player.name)
    }
  }

  // ── 3. 残りの人間をプールに集める ──
  const flexHumans = humans
    .filter(p => !confirmedNames.has(p.name) || overflowSet.has(p.name))
    .sort(() => Math.random() - 0.5)

  // ── 4. CPUをhalf/halfに振り分け ──
  const shuffledCpus = [...cpus].sort(() => Math.random() - 0.5)
  const cpuHalf = Math.floor(cpus.length / 2)
  const swapCpu = Math.random() < 0.5
  const cpuBlue = swapCpu ? shuffledCpus.slice(cpuHalf) : shuffledCpus.slice(0, cpuHalf)
  const cpuRed = swapCpu ? shuffledCpus.slice(0, cpuHalf) : shuffledCpus.slice(cpuHalf)

  // ── 5. 残り枠を計算して人間・CPUを振り分け ──
  const blueRemain = 5 - teams.Blue.length
  const redRemain = 5 - teams.Red.length

  const cpuBlueCount = Math.min(cpuBlue.length, blueRemain)
  const cpuRedCount = Math.min(cpuRed.length, redRemain)
  const humanBlueCount = blueRemain - cpuBlueCount
  const humanRedCount = redRemain - cpuRedCount

  const humanForBlue = flexHumans.slice(0, humanBlueCount)
  const humanForRed = flexHumans.slice(humanBlueCount, humanBlueCount + humanRedCount)

  const groups = {
    Blue: [...humanForBlue, ...cpuBlue.slice(0, cpuBlueCount)],
    Red: [...humanForRed, ...cpuRed.slice(0, cpuRedCount)],
  }

  // ── 6. フレキシブルメンバーのレーン割り当て ──
  // 希望レーンが競合した場合に備え、複数パスで割り当てる
  for (const side of ['Blue', 'Red']) {
    const members = [...groups[side]]

    // パス1: 希望レーンが1つだけ空いているメンバーを優先
    const getAvailable = (p) =>
      p.lanes.filter(l => !usedLanes[side].has(l))

    // 希望の空き数が少ない順に並べて優先割り当て（競合を減らす）
    const sorted = members.sort((a, b) =>
      getAvailable(a).length - getAvailable(b).length
    )

    const unassigned = []
    for (const p of sorted) {
      const available = getAvailable(p)
      if (available.length > 0 && teams[side].length < 5) {
        const lane = pickRandom(available)
        usedLanes[side].add(lane)
        teams[side].push({ ...p, lane })
      } else {
        unassigned.push(p)
      }
    }

    // パス2: 希望レーンが全部埋まっていたメンバーは希望レーン内で再試行
    // （他のメンバーが配置された後に空きが生まれた場合）
    const stillUnassigned = []
    for (const p of unassigned) {
      const available = getAvailable(p)
      if (available.length > 0 && teams[side].length < 5) {
        const lane = pickRandom(available)
        usedLanes[side].add(lane)
        teams[side].push({ ...p, lane })
      } else {
        stillUnassigned.push(p)
      }
    }

    // パス3: それでも入れない場合のみ残レーンに配置（希望外もやむなし）
    for (const p of stillUnassigned) {
      const rest = LANES.filter(l => !usedLanes[side].has(l))
      if (rest.length === 0 || teams[side].length >= 5) continue
      const preferred = rest.filter(l => p.lanes.includes(l))
      const lane = preferred.length > 0 ? pickRandom(preferred) : pickRandom(rest)
      usedLanes[side].add(lane)
      teams[side].push({ ...p, lane })
    }
  }

  // ── 7. レーン順にソート ──
  for (const side of ['Blue', 'Red']) {
    teams[side].sort(
      (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane)
    )
  }

  return teams
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}