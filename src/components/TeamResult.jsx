import { LANE_COLORS } from '../constants'
import styles from './TeamResult.module.css'

export default function TeamResult({ teams, onReroll }) {
  if (!teams) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.label}>チーム分け結果</p>
        <button className={styles.rerollBtn} onClick={onReroll} type="button">
          再抽選
        </button>
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
    </div>
  )
}