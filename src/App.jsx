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

  const need = MAX_PLAYERS - players.length
  for (let i = 1; i <= need; i++) {
    players.push({ name: `CPU ${i}`, lanes: [...LANES], isCpu: true })
  }

  const result = generateTeams(players)
  setTeams(result)
}

  return (
    <div className={styles.app}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          
          {' '}Doran's Ring チーム分けツール{' '}
          
        </h1>
        <p className={styles.subtitle}>
          参加メンバーを選んでレーン希望を入力してね
        </p>
      </header>

      {/* メンバー選択 */}
      <section className={styles.card}>
        <p className={styles.sectionLabel}>参加メンバー選択</p>
        <p className={styles.counter}>
          選択中: <strong>{selectedCount}</strong> / {MAX_PLAYERS}人
          {selectedCount > 0 && selectedCount < MAX_PLAYERS && (
            <span className={styles.cpuNote}>
              　→ CPU {MAX_PLAYERS - selectedCount}人で補填します
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
          チームを生成する
        </button>
      </div>

      {/* 結果表示 */}
      <TeamResult teams={teams} onReroll={handleGenerate} />
    </div>
  )
}