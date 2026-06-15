import { LANES, LANE_ORDER } from './constants'

export function generateTeams(players) {
  const humans = players.filter(p => !p.isCpu)
  const cpus = players.filter(p => p.isCpu)

  // ── 1. 希望レーン1つのメンバーをレーンごとに集計 ──
  // 同じレーンを1つだけ希望している人が何人いるかを集計し
  // 先着2人を「確定枠」、3人目以降を「あふれ」とする
  const fixedSlots = []   // { player, lane, side } side は後で決める
  const overflowPlayers = new Set()

  for (const lane of LANES) {
    const candidates = players
      .filter(p => p.lanes.length === 1 && p.lanes[0] === lane)
      .sort(() => Math.random() - 0.5)

    candidates.forEach((p, i) => {
      if (i < 2) fixedSlots.push({ player: p, lane })
      else overflowPlayers.add(p.name)
    })
  }

  const fixedNames = new Set(fixedSlots.map(f => f.player.name))

  // ── 2. 確定枠をBlue/Redに1つずつ振り分け ──
  // 同じレーンの確定枠が2つある場合は1つをBlue、1つをRed
  const confirmedByLane = {}
  for (const lane of LANES) {
    const slots = fixedSlots.filter(f => f.lane === lane)
    if (slots.length === 0) continue
    if (slots.length === 1) {
      // 1人だけの場合はどちらに入れるか後で決める（pendingとして保留）
      confirmedByLane[lane] = { pending: slots[0].player }
    } else {
      // 2人なら1人ずつ確定
      const [a, b] = slots.sort(() => Math.random() - 0.5)
      confirmedByLane[lane] = { Blue: a.player, Red: b.player }
    }
  }

  // ── 3. 確定・あふれ・フレキシブルを分類 ──
  const confirmedBlue = []
  const confirmedRed = []
  const pendingFixed = [] // 1人だけ希望の確定枠（チーム未決）

  for (const lane of LANES) {
    const entry = confirmedByLane[lane]
    if (!entry) continue
    if (entry.Blue) confirmedBlue.push({ ...entry.Blue, lane })
    if (entry.Red) confirmedRed.push({ ...entry.Red, lane })
    if (entry.pending) pendingFixed.push({ player: entry.pending, lane })
  }

  // 確定・あふれ以外のメンバー（複数希望 or CPU）
  const flexiblePlayers = players.filter(
    p => !fixedNames.has(p.name) || overflowPlayers.has(p.name)
  )

  // ── 4. チーム人数を5対5に調整しながら残りを振り分け ──
  // Blue/Redの確定人数から残り枠を計算
  let blueCount = confirmedBlue.length
  let redCount = confirmedRed.length

  // pendingFixed をどちらかに振り分け
  const pendingShuffled = pendingFixed.sort(() => Math.random() - 0.5)
  const pendingForBlue = []
  const pendingForRed = []
  for (const { player, lane } of pendingShuffled) {
    if (blueCount <= redCount && blueCount < 5) {
      pendingForBlue.push({ ...player, lane })
      blueCount++
    } else if (redCount < 5) {
      pendingForRed.push({ ...player, lane })
      redCount++
    } else {
      pendingForBlue.push({ ...player, lane })
      blueCount++
    }
  }

  // 残り枠
  const blueSlots = 5 - blueCount
  const redSlots = 5 - redCount

  // CPU を half/half に
  const shuffledCpus = [...cpus].sort(() => Math.random() - 0.5)
  const cpuHalf = Math.floor(cpus.length / 2)
  const swapCpu = Math.random() < 0.5
  const cpuForBlue = swapCpu
    ? shuffledCpus.slice(cpuHalf)
    : shuffledCpus.slice(0, cpuHalf)
  const cpuForRed = swapCpu
    ? shuffledCpus.slice(0, cpuHalf)
    : shuffledCpus.slice(cpuHalf)

  // 確定・pending以外の人間フレキシブル
  const flexHumans = flexiblePlayers
    .filter(p => !p.isCpu)
    .sort(() => Math.random() - 0.5)

  // Blue/Red の残り枠にフレキシブル人間を振り分け
  // CPU分を除いた枠を人間で埋める
  const cpuBlueCount = Math.min(cpuForBlue.length, blueSlots)
  const cpuRedCount = Math.min(cpuForRed.length, redSlots)
  const humanBlueSlots = blueSlots - cpuBlueCount
  const humanRedSlots = redSlots - cpuRedCount

  const humanForBlue = flexHumans.slice(0, humanBlueSlots)
  const humanForRed = flexHumans.slice(humanBlueSlots, humanBlueSlots + humanRedSlots)

  // ── 5. チームグループを確定 ──
  const groups = {
    Blue: [
      ...confirmedBlue,
      ...pendingForBlue,
      ...humanForBlue,
      ...cpuForBlue.slice(0, cpuBlueCount),
    ],
    Red: [
      ...confirmedRed,
      ...pendingForRed,
      ...humanForRed,
      ...cpuForRed.slice(0, cpuRedCount),
    ],
  }

  // ── 6. レーン割り当て ──
  const teams = { Blue: [], Red: [] }
  const usedLanes = { Blue: new Set(), Red: new Set() }

  for (const side of ['Blue', 'Red']) {
    const members = groups[side]

    // 確定レーン（confirmed / pending）を先に配置
    const preAssigned = members.filter(m => m.lane)
    const unAssigned = members.filter(m => !m.lane)

    for (const p of preAssigned) {
      if (!usedLanes[side].has(p.lane) && teams[side].length < 5) {
        usedLanes[side].add(p.lane)
        teams[side].push(p)
      } else {
        // 万が一レーン競合したらフレキシブルに回す
        unAssigned.push({ ...p, lane: undefined, lanes: LANES })
      }
    }

    // フレキシブルを希望優先で割り当て
    const stillUnassigned = []
    for (const p of unAssigned.sort(() => Math.random() - 0.5)) {
      if (!tryAssign(p, side, teams, usedLanes)) {
        stillUnassigned.push(p)
      }
    }

    // 残レーンに強制配置
    for (const p of stillUnassigned) {
      const rest = LANES.filter(l => !usedLanes[side].has(l))
      if (rest.length > 0 && teams[side].length < 5) {
        const lane = pickRandom(rest)
        usedLanes[side].add(lane)
        teams[side].push({ ...p, lane })
      }
    }

    teams[side].sort(
      (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane)
    )
  }

  return teams
}

function tryAssign(player, side, teams, usedLanes) {
  if (teams[side].length >= 5) return false
  const available = (player.lanes ?? LANES).filter(l => !usedLanes[side].has(l))
  if (available.length === 0) return false
  const lane = pickRandom(available)
  usedLanes[side].add(lane)
  teams[side].push({ ...player, lane })
  return true
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}