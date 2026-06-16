import { useState } from 'react'
import { LANE_COLORS } from '../constants'
import styles from './TeamResult.module.css'

export default function TeamResult({ teams }) {
  const [copied, setCopied] = useState(false)

  if (!teams) return null

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
      </div>

      <div className={styles.grid}>
        {['Blue', 'Red'].map(side => (
          <div key={side} className={`${styles.teamCard} ${styles[side.toLowerCase()]}`}>
            <div className={`${styles.teamHeader} ${styles[`header${side}`]}`}>
              {side === 'Blue' ? '🔵 Blue チーム' : '🔴 Red チーム'}
            </div>
            <div className={styles.teamBody}>
              {teams[side].map((p, i) => (
                <div key={i} className={styles.playerRow}>
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
              ))}
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