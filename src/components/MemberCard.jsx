import { LANES } from '../constants'
import styles from './MemberCard.module.css'

export default function MemberCard({ name, checked, lanes, onToggleCheck, onToggleLane, disabled }) {
  return (
    <div
      className={`${styles.card} ${checked ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
      onClick={onToggleCheck}
    >
      <div className={styles.top}>
        <input
          type="checkbox"
          id={`chk-${name}`}
          checked={checked}
          onChange={onToggleCheck}
          onClick={e => e.stopPropagation()}
          disabled={disabled}
        />
        <label
          htmlFor={`chk-${name}`}
          className={styles.name}
          onClick={e => e.stopPropagation()}
        >
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
                onClick={e => { e.stopPropagation(); onToggleLane(lane) }}
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