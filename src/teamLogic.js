import { LANES, LANE_ORDER } from './constants'

export function generateTeams(players) {
  const humans = players.filter(p => !p.isCpu)
  // CPUに一時IDを付与（名前が全員"AI"で重複するため）
  const cpus = players
    .filter(p => p.isCpu)
    .map((p, i) => ({ ...p, _id: `cpu_${i}` }))

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

  // ── 3. 未配置の人間を集める ──
  const assignedNames = new Set([
    ...teams.Blue.map(p => p.name),
    ...teams.Red.map(p => p.name),
  ])
  const unplacedHumans = humans
    .filter(p => !assignedNames.has(p.name))
    .sort(() => Math.random() - 0.5)

  const totalHumans = humans.length
  const humanBlueConfirmed = teams.Blue.length
  const humanRedConfirmed = teams.Red.length

  // ── 4. 人間の振り分け ──
  // 偶数: 均等（n vs n）、奇数: n vs n+1
  let humanForBlue = []
  let humanForRed = []

  const targetBlue = Math.floor(totalHumans / 2)
  const targetRed = Math.ceil(totalHumans / 2)

  const blueNeedsHuman = Math.max(0, targetBlue - humanBlueConfirmed)
  const redNeedsHuman = Math.max(0, targetRed - humanRedConfirmed)

  humanForBlue = unplacedHumans.slice(0, blueNeedsHuman)
  humanForRed = unplacedHumans.slice(blueNeedsHuman, blueNeedsHuman + redNeedsHuman)

  // 端数（確定配置で偏った場合）は枠が少ない方に追加
  const leftoverHumans = unplacedHumans.slice(blueNeedsHuman + redNeedsHuman)
  for (const p of leftoverHumans) {
    const blueTotal = humanBlueConfirmed + humanForBlue.length
    const redTotal = humanRedConfirmed + humanForRed.length
    if (blueTotal <= redTotal) humanForBlue.push(p)
    else humanForRed.push(p)
  }

  // ── 5. CPUを残り枠に振り分け ──
  const blueSlots = 5 - (humanBlueConfirmed + humanForBlue.length)
  const redSlots = 5 - (humanRedConfirmed + humanForRed.length)

  const shuffledCpus = [...cpus].sort(() => Math.random() - 0.5)
  const swapCpu = Math.random() < 0.5
  const cpuHalf = Math.floor(shuffledCpus.length / 2)
  const cpuA = swapCpu ? shuffledCpus.slice(cpuHalf) : shuffledCpus.slice(0, cpuHalf)
  const cpuB = swapCpu ? shuffledCpus.slice(0, cpuHalf) : shuffledCpus.slice(cpuHalf)

  const cpuForBlue = cpuA.slice(0, blueSlots)
  const cpuForRed = cpuB.slice(0, redSlots)

  // 振り分けきれなかったCPUを残り枠に追加（_idで重複管理）
  const distributedIds = new Set([
    ...cpuForBlue.map(p => p._id),
    ...cpuForRed.map(p => p._id),
  ])
  const leftoverCpu = shuffledCpus.filter(p => !distributedIds.has(p._id))
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

  // ── 7. フェイルセーフ ──
  for (const side of ['Blue', 'Red']) {
    while (teams[side].length < 5) {
      const rest = LANES.filter(l => !usedLanes[side].has(l))
      const lane = rest.length > 0 ? rest[0] : LANES[0]
      usedLanes[side].add(lane)
      teams[side].push({ name: 'AI', lanes: [...LANES], isCpu: true, lane })
    }
  }

  // ── 8. _id除去 & レーン順ソート ──
  for (const side of ['Blue', 'Red']) {
    teams[side] = teams[side].map(({ _id, ...p }) => p)
    teams[side].sort(
      (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane)
    )
  }

  return teams
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}