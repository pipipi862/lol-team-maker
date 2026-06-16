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

  // ── 3. 残りの人間・CPUをプールに集める ──
  const flexHumans = humans
    .filter(p => !confirmedNames.has(p.name) || overflowSet.has(p.name))
    .sort(() => Math.random() - 0.5)

  const shuffledCpus = [...cpus].sort(() => Math.random() - 0.5)

  // ── 4. Blue/Redの残り枠を計算 ──
  const blueRemain = 5 - teams.Blue.length
  const redRemain = 5 - teams.Red.length

  // CPUをBlue/Redに振り分け（奇数はランダムで±1）
  const cpuHalf = Math.floor(shuffledCpus.length / 2)
  const swapCpu = Math.random() < 0.5
  const cpuForBlue = (swapCpu ? shuffledCpus.slice(cpuHalf) : shuffledCpus.slice(0, cpuHalf))
  const cpuForRed = (swapCpu ? shuffledCpus.slice(0, cpuHalf) : shuffledCpus.slice(cpuHalf))

  // 人間をBlue/Redに振り分け
  const humanForBlue = flexHumans.slice(0, blueRemain - Math.min(cpuForBlue.length, blueRemain))
  const humanForRed = flexHumans.slice(humanForBlue.length, humanForBlue.length + (redRemain - Math.min(cpuForRed.length, redRemain)))

  // Blue/Redそれぞれのフレキシブルプール（人間+CPU）
  // CPU数が枠を超えないよう調整
  const blueFlexPool = [
    ...humanForBlue,
    ...cpuForBlue.slice(0, blueRemain - humanForBlue.length),
  ]
  const redFlexPool = [
    ...humanForRed,
    ...cpuForRed.slice(0, redRemain - humanForRed.length),
  ]

  // ── 5. CPU補填あり・人間が偶数のとき対面レーン保証 ──
  if (hasCpu && humanCount % 2 === 0) {
    const pairedLanes = LANES.filter(
      l => !usedLanes.Blue.has(l) && !usedLanes.Red.has(l)
    )

    for (const lane of pairedLanes) {
      if (teams.Blue.length >= 5 || teams.Red.length >= 5) break

      const blueIdx = blueFlexPool.findIndex(p => p.lanes.includes(lane))
      const redIdx = redFlexPool.findIndex(p => p.lanes.includes(lane))

      // 両チームに配置できる候補がいる場合のみペア配置
      if (blueIdx !== -1 && redIdx !== -1) {
        const bluePlayer = blueFlexPool.splice(blueIdx, 1)[0]
        const redPlayer = redFlexPool.splice(redIdx, 1)[0]
        usedLanes.Blue.add(lane)
        usedLanes.Red.add(lane)
        teams.Blue.push({ ...bluePlayer, lane })
        teams.Red.push({ ...redPlayer, lane })
      }
    }
  }

  // ── 6. 残りをフレキシブル割り当て ──
  // すでに配置済みのメンバーを除いて割り当て
  const remainBlue = blueFlexPool.filter(p => !teams.Blue.some(t => t.name === p.name))
  const remainRed = redFlexPool.filter(p => !teams.Red.some(t => t.name === p.name))

  assignFlex(remainBlue, 'Blue', teams, usedLanes)
  assignFlex(remainRed, 'Red', teams, usedLanes)

  // ── 7. それでも5人未満なら残プールから強制補填 ──
  // （どのプールにも入らなかったプレイヤーを拾う）
  const allAssigned = new Set([
    ...teams.Blue.map(p => p.name),
    ...teams.Red.map(p => p.name),
  ])
  const leftover = players.filter(p => !allAssigned.has(p.name))

  for (const side of ['Blue', 'Red']) {
    while (teams[side].length < 5 && leftover.length > 0) {
      const p = leftover.shift()
      const rest = LANES.filter(l => !usedLanes[side].has(l))
      if (rest.length === 0) continue
      const preferred = rest.filter(l => p.lanes.includes(l))
      const lane = preferred.length > 0 ? pickRandom(preferred) : pickRandom(rest)
      usedLanes[side].add(lane)
      const laneUnmatched = !p.lanes.includes(lane)
      teams[side].push({ ...p, lane, laneUnmatched })
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

function assignFlex(pool, side, teams, usedLanes) {
  const unassigned = []
  const remaining = [...pool]

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
    const laneUnmatched = !p.lanes.includes(lane)
    teams[side].push({ ...p, lane, laneUnmatched })
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}