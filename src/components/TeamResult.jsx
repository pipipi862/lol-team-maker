import { useState, useEffect, useRef } from 'react'
import { LANE_COLORS } from '../constants'
import styles from './TeamResult.module.css'

export default function TeamResult({ teams: initialTeams }) {
  const [teams, setTeams] = useState(initialTeams)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [copied, setCopied] = useState(false)
  const dragRef = useRef(null)

  useEffect(() => {
    setTeams(initialTeams)
  }, [initialTeams])

  if (!teams) return null

  function handleDragStart(e, side, index) {
    dragRef.current = { side, index }
    setDragging({ side, index })
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, side, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ side, index })
  }

  function handleDrop(e, toSide, toIndex) {
    e.preventDefault()
    const from = dragRef.current
    if (!from) return
    const { side: fromSide, index: fromIndex } = from

    if (fromSide === toSide && fromIndex === toIndex) {
      setDragging(null)
      setDragOver(null)
      dragRef.current = null
      return
    }

    setTeams(prev => {
      const newTeams = {
        Blue: prev.Blue.map(p => ({ ...p })),
        Red: prev.Red.map(p => ({ ...p })),
      }
      // 名前とisCpuだけ入れ替え、レーンはそのまま
      const fromName = newTeams[fromSide][fromIndex].name
      const fromIsCpu = newTeams[fromSide][fromIndex].isCpu
      const toName = newTeams[toSide][toIndex].name
      const toIsCpu = newTeams[toSide][toIndex].isCpu

      newTeams[fromSide][fromIndex].name = toName
      newTeams[fromSide][fromIndex].isCpu = toIsCpu
      newTeams[toSide][toIndex].name = fromName
      newTeams[toSide][toIndex].isCpu = fromIsCpu

      return newTeams
    })

    setDragging(null)
    setDragOver(null)
    dragRef.current = null
  }

  function handleDragEnd() {
    setDragging(null)
    setDragOver(null)
    dragRef.current = null
  }

  function handleCopy() {
    const LANE_ORDER = ['TOP', 'JG', 'MID', 'ADC', 'SUP']
    const lines = []
    for (const side of ['Blue', 'Red']) {
      lines.push(`【${side === 'Blue' ? '🔵 Blue' : '🔴 Red'} チーム】`)
      const sorted = [...teams[side]].sort(
        (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane)
      )
      for (const p of sorted) {
        lines.push(`  ${p.lane.padEnd(3)}  ${p.name}`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.label}>チーム分け結果</p>
        <p className={styles.hint}>・ドラッグ＆ドロップでメンバーを入れ替えできます（スマホ不可）</p>
      </div>

      <div className={styles.grid}>
        {['Blue', 'Red'].map(side => (
          <div key={side} className={`${styles.teamCard} ${styles[side.toLowerCase()]}`}>
            <div className={`${styles.teamHeader} ${styles[`header${side}`]}`}>
              {side === 'Blue' ? '🔵 Blue チーム' : '🔴 Red チーム'}
            </div>
            <div className={styles.teamBody}>
              {teams[side].map((p, i) => {
                const isDraggingThis = dragging?.side === side && dragging?.index === i
                const isDragOver = dragOver?.side === side && dragOver?.index === i
                return (
                  <div
                    key={i}
                    className={`${styles.playerRow} ${isDraggingThis ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, side, i)}
                    onDragOver={e => handleDragOver(e, side, i)}
                    onDrop={e => handleDrop(e, side, i)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className={styles.dragHandle}>⠿</span>
                    <span
                      className={styles.laneBadge}
                      style={{
                        background: LANE_COLORS[p.lane] + '28',
                        color: LANE_COLORS[p.lane],
                      }}
                    >
                      {p.lane}
                    </span>
                    <span className={`${styles.playerName} ${p.isCpu ? styles.cpu : ''}`}>
                      {p.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button className={styles.copyBtn} onClick={handleCopy} type="button">
        {copied ? '✓ コピーしました' : 'クリップボードにコピー'}
      </button>
    </div>
  )
}