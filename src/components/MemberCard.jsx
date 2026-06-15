import { LANES, LANE_COLORS } from '../constants'
import styles from './MemberCard.module.css'

export default function MemberCard({ name, checked, lanes, onToggleCheck, onToggleLane, disabled }) {
  return (
    <div className={`${styles.card} ${checked ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}>
      <div className={styles.top}>
        <input
          type="checkbox"
          id={`chk-${name}`}
          checked={checked}
          onChange={onToggleCheck}
          disabled={disabled}
        />
        <label htmlFor={`chk-${name}`} className={styles.name}>
          {name}
        </label>
      </div>

      {checked && (
        <div className={styles.laneRow}>
          {LANES.map(lane => {
            const active = lanes.includes(lane)
            return (
              <button
                key={lane}
                className={`${styles.chip} ${active ? styles.chipOn : ''}`}
                style={active ? { background: LANE_COLORS[lane], color: lane === 'MID' ? '#1a1a1a' : '#fff' } : {}}
                onClick={() => onToggleLane(lane)}
                type="button"
              >
                {lane}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}