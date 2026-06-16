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

  // ── 3. 未配置プレイヤーをすべて集める ──
  const assignedNames = new Set([
    ...teams.Blue.map(p => p.name),
    ...teams.Red.map(p => p.name),
  ])
  const unplacedHumans = humans
    .filter(p => !assignedNames.has(p.name))
    .sort(() => Math.random() - 0.5)
  const shuffledCpus = [...cpus].sort(() => Math.random() - 0.5)

  // ── 4. 人間が偶数のとき、Blue/Redの人間数を均等にする ──
  // 確定配置済みの人間数を考慮して残り人間を均等振り分け
  const humanBlueCount = teams.Blue.filter(p => !p.isCpu).length
  const humanRedCount = teams.Red.filter(p => !p.isCpu).length
  const remainingHumans = unplacedHumans.length
  const totalHumans = humans.length

  let humanForBlue = []
  let humanForRed = []

  if (totalHumans % 2 === 0) {
    // 偶数: Blue/Redの人間数を均等に
    const targetPerSide = totalHumans / 2
    const blueNeedsHuman = targetPerSide - humanBlueCount
    const redNeedsHuman = targetPerSide - humanRedCount
    humanForBlue = unplacedHumans.slice(0, Math.max(0, blueNeedsHuman))
    humanForRed = unplacedHumans.slice(
      Math.max(0, blueNeedsHuman),
      Math.max(0, blueNeedsHuman) + Math.max(0, redNeedsHuman)
    )
    // 端数があれば残りに追加
    const distributed = humanForBlue.length + humanForRed.length
    const leftoverHumans = unplacedHumans.slice(distributed)
    leftoverHumans.forEach((p, i) => {
      if (i % 2 === 0) humanForBlue.push(p)
      else humanForRed.push(p)
    })
  } else {
    // 奇数: 交互に振り分け
    unplacedHumans.forEach((p, i) => {
      if (i % 2 === 0) humanForBlue.push(p)
      else humanForRed.push(p)
    })
  }

  // ── 5. CPUをBlue/Redの残り枠に均等振り分け ──
  const blueHumanTotal = teams.Blue.length + humanForBlue.length
  const redHumanTotal = teams.Red.length + humanForRed.length
  const cpuForBlue = []
  const cpuForRed = []
  const cpuHalf = Math.floor(shuffledCpus.length / 2)
  const swapCpu = Math.random() < 0.5

  const cpuA = swapCpu ? shuffledCpus.slice(cpuHalf) : shuffledCpus.slice(0, cpuHalf)
  const cpuB = swapCpu ? shuffledCpus.slice(0, cpuHalf) : shuffledCpus.slice(cpuHalf)

  const blueSlots = 5 - blueHumanTotal
  const redSlots = 5 - redHumanTotal

  cpuA.slice(0, blueSlots).forEach(p => cpuForBlue.push(p))
  cpuB.slice(0, redSlots).forEach(p => cpuForRed.push(p))

  // 振り分けきれなかったCPUを残り枠に追加
  const distributedCpu = new Set([...cpuForBlue.map(p => p.name), ...cpuForRed.map(p => p.name)])
  const leftoverCpu = shuffledCpus.filter(p => !distributedCpu.has(p.name))
  for (const p of leftoverCpu) {
    if (cpuForBlue.length < blueSlots) cpuForBlue.push(p)
    else if (cpuForRed.length < redSlots) cpuForRed.push(p)
  }

  // ── 6. レーン割り当て ──
  const groups = {
    Blue: [...humanForBlue, ...cpuForBlue],
    Red: [...humanForRed, ...cpuForRed],
  }

  for (const side of ['Blue', 'Red']) {
    const pool = [...groups[side]]
    const unassigned = []

    while (pool.length > 0) {
      pool.sort((a, b) => {
        const aAvail = a.lanes.filter(l => !usedLanes[side].has(l)).length
        const bAvail = b.lanes.filter(l => !usedLanes[side].has(l)).length
        return aAvail - bAvail
      })

      const p = pool.shift()
      const available = p.lanes.filter(l => !usedLanes[side].has(l))

      if (available.length > 0 && teams[side].length < 5) {
        const lane = pickRandom(available)
        usedLanes[side].add(lane)
        teams[side].push({ ...p, lane })
      } else {
        unassigned.push(p)
      }
    }

    for (const p of unassigned) {
      const rest = LANES.filter(l => !usedLanes[side].has(l))
      if (rest.length === 0 || teams[side].length >= 5) continue
      const preferred = rest.filter(l => p.lanes.includes(l))
      const lane = preferred.length > 0 ? pickRandom(preferred) : pickRandom(rest)
      usedLanes[side].add(lane)
      const laneUnmatched = !p.lanes.includes(lane)
      teams[side].push({ ...p, lane, laneUnmatched })
    }
  }

  // ── 7. フェイルセーフ: 5人未満なら強制補填 ──
  for (const side of ['Blue', 'Red']) {
    while (teams[side].length < 5) {
      const rest = LANES.filter(l => !usedLanes[side].has(l))
      const lane = rest.length > 0 ? rest[0] : LANES[0]
      usedLanes[side].add(lane)
      teams[side].push({ name: 'AI', lanes: [...LANES], isCpu: true, lane })
    }
  }

  // ── 8. レーン順にソート ──
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