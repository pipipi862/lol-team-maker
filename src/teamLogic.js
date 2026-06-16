import { LANES, LANE_ORDER } from './constants'

export function generateTeams(players) {
  const humans = players.filter(p => !p.isCpu)
  const cpus = players.filter(p => p.isCpu)
  const hasCpu = cpus.length > 0
  const humanCount = humans.length

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

  // ── 6. CPU補填あり・人間が偶数のとき、対面レーン保証 ──
  // 確定済みレーンを除いた残りレーンでペアを作り、
  // 人間を片方・AIをもう片方に配置する
  if (hasCpu && humanCount % 2 === 0) {
    const pairedLanes = LANES.filter(
      l => !usedLanes.Blue.has(l) && !usedLanes.Red.has(l)
    )

    // 残り人間フレキシブルをBlue/Redに振り分け済みのものを使って
    // 対面レーンにペア配置する
    const humanBluePool = [...humanForBlue]
    const humanRedPool = [...humanForRed]
    const cpuBluePool = cpuBlue.slice(0, cpuBlueCount)
    const cpuRedPool = cpuRed.slice(0, cpuRedCount)

    for (const lane of pairedLanes) {
      if (teams.Blue.length >= 5 || teams.Red.length >= 5) break

      // Blueに人間、Redに人間 or CPU のペアを置く
      const blueHuman = humanBluePool.find(p =>
        p.lanes.includes(lane) && !usedLanes.Blue.has(lane)
      )
      const redHuman = humanRedPool.find(p =>
        p.lanes.includes(lane) && !usedLanes.Red.has(lane)
      )
      const blueCpu = cpuBluePool.find(() => !usedLanes.Blue.has(lane))
      const redCpu = cpuRedPool.find(() => !usedLanes.Red.has(lane))

      const bluePlayer = blueHuman ?? blueCpu ?? null
      const redPlayer = redHuman ?? redCpu ?? null

      if (bluePlayer && redPlayer && teams.Blue.length < 5 && teams.Red.length < 5) {
        if (!usedLanes.Blue.has(lane)) {
          usedLanes.Blue.add(lane)
          teams.Blue.push({ ...bluePlayer, lane })
          if (blueHuman) humanBluePool.splice(humanBluePool.indexOf(blueHuman), 1)
          else cpuBluePool.splice(cpuBluePool.indexOf(bluePlayer), 1)
        }
        if (!usedLanes.Red.has(lane)) {
          usedLanes.Red.add(lane)
          teams.Red.push({ ...redPlayer, lane })
          if (redHuman) humanRedPool.splice(humanRedPool.indexOf(redHuman), 1)
          else cpuRedPool.splice(cpuRedPool.indexOf(redPlayer), 1)
        }
      }
    }

    // 対面保証後の残りを通常割り当て
    const remainBlue = [...humanBluePool, ...cpuBluePool].filter(
      p => !teams.Blue.some(t => t.name === p.name)
    )
    const remainRed = [...humanRedPool, ...cpuRedPool].filter(
      p => !teams.Red.some(t => t.name === p.name)
    )

    assignFlex(remainBlue, 'Blue', teams, usedLanes)
    assignFlex(remainRed, 'Red', teams, usedLanes)
  } else {
    // 通常割り当て
    const groups = {
      Blue: [...humanForBlue, ...cpuBlue.slice(0, cpuBlueCount)],
      Red: [...humanForRed, ...cpuRed.slice(0, cpuRedCount)],
    }
    assignFlex(groups.Blue, 'Blue', teams, usedLanes)
    assignFlex(groups.Red, 'Red', teams, usedLanes)
  }

  // ── 7. レーン順にソート ──
  for (const side of ['Blue', 'Red']) {
    teams[side].sort(
      (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane)
    )
  }

  return teams
}

function assignFlex(pool, side, teams, usedLanes) {
  const unassigned = []
  let remaining = [...pool]

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const aAvail = a.lanes.filter(l => !usedLanes[side].has(l)).length
      const bAvail = b.lanes.filter(l => !usedLanes[side].has(l)).length
      return aAvail - bAvail
    })

    const p = remaining.shift()
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
    teams[side].push({ ...p, lane })
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}