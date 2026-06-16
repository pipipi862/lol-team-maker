import { useState } from 'react'
import { MEMBERS, LANES } from './constants'
import { generateTeams } from './teamLogic'
import MemberCard from './components/MemberCard'
import TeamResult from './components/TeamResult'
import styles from './App.module.css'

const MAX_PLAYERS = 10

function initState() {
  const s = {}
  MEMBERS.forEach(m => { s[m] = { checked: false, lanes: [] } })
  return s
}

export default function App() {
  const [memberState, setMemberState] = useState(initState)
  const [teams, setTeams] = useState(null)
  const [error, setError] = useState('')

  const selectedCount = MEMBERS.filter(m => memberState[m].checked).length

  function toggleMember(name) {
    setMemberState(prev => {
      const s = { ...prev, [name]: { ...prev[name] } }
      s[name].checked = !s[name].checked
      if (!s[name].checked) s[name].lanes = []
      return s
    })
    setTeams(null)
    setError('')
  }

  function toggleLane(name, lane) {
    setMemberState(prev => {
      const lanes = [...prev[name].lanes]
      const idx = lanes.indexOf(lane)
      if (idx === -1) lanes.push(lane)
      else lanes.splice(idx, 1)
      return { ...prev, [name]: { ...prev[name], lanes } }
    })
  }
  function selectAllLanes(name) {
  setMemberState(prev => ({
    ...prev,
    [name]: {
      ...prev[name],
      lanes: prev[name].lanes.length === LANES.length ? [] : [...LANES],
    },
  }))
}

function handleGenerate() {
  setError('')
  if (selectedCount === 0) {
    setError('参加者を1人以上選択してください。')
    return
  }

  // 希望レーン未選択のメンバーを確認
  const noLaneMembers = MEMBERS.filter(
    m => memberState[m].checked && memberState[m].lanes.length === 0
  )
  if (noLaneMembers.length > 0) {
    setError(`希望レーンを1か所以上選択してください（未選択: ${noLaneMembers.join('、')}）`)
    return
  }

  const players = MEMBERS
    .filter(m => memberState[m].checked)
    .map(m => ({
      name: m,
      lanes: [...memberState[m].lanes],
      isCpu: false,
    }))

// CPU補填
const need = MAX_PLAYERS - players.length
for (let i = 0; i < need; i++) {
  players.push({ name: 'AI', lanes: [...LANES], isCpu: true })
}
  const result = generateTeams(players)
  setTeams(result)
}

  return (
    <div className={styles.app}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          <img src="./ring.png" alt="" className={styles.titleIcon} />
          {' '}Doran's Ring チーム分けツール{' '}
          <img src="./garen.jpg" alt="" className={styles.titleIcon} />
        </h1>
        <p className={styles.subtitle}>
          参加メンバーと希望レーンを選択してね
        </p>
        <ul className={styles.notes}>
  <li>希望レーンを1箇所のみ選択した場合、原則としてそのレーンに優先配置されます。</li>
  <li>希望レーンが1箇所のメンバーが3人以上の場合は、ランダムで2名が希望レーンに配属され、残りのメンバーは他レーンへ配置されます。</li>
  <li>参加人数が10人未満の時は、AIが補填されます。</li>
  <li>チーム分け後、手動でメンバーの入れ替えが可能です。</li>
</ul>
      </header>

      {/* メンバー選択 */}
      <section className={styles.card}>
        <p className={styles.sectionLabel}>参加メンバー選択</p>
        <p className={styles.counter}>
          選択中: <strong>{selectedCount}</strong> / {MAX_PLAYERS}人
          {selectedCount > 0 && selectedCount < MAX_PLAYERS && (
            <span className={styles.cpuNote}>
              　→ AI {MAX_PLAYERS - selectedCount}人で補填します
            </span>
          )}
        </p>
        <div className={styles.memberGrid}>
          {MEMBERS.map(name => (
            <MemberCard
  key={name}
  name={name}
  checked={memberState[name].checked}
  lanes={memberState[name].lanes}
  disabled={!memberState[name].checked && selectedCount >= MAX_PLAYERS}
  onToggleCheck={() => toggleMember(name)}
  onToggleLane={lane => toggleLane(name, lane)}
  onSelectAll={() => selectAllLanes(name)}
/>
          ))}
        </div>
      </section>

      {/* 生成ボタン */}
      <div className={styles.generateArea}>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={selectedCount === 0}
          type="button"
        >
          チーム分けを実行する
        </button>
      </div>

      {/* 結果表示 */}
      <TeamResult teams={teams} onReroll={handleGenerate} />

<footer className={styles.footer}>
        <p className={styles.footerMain}>今日も元気にリーグオブレジェンド</p>
        <p className={styles.footerSub}>Powered by Doran's Ring</p>
      </footer>
    </div>
  )
}