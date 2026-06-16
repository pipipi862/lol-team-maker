import { LANES } from '../constants'
import styles from './MemberCard.module.css'

export default function MemberCard({ name, checked, lanes, onToggleCheck, onToggleLane, onSelectAll, disabled }) {
  const allSelected = LANES.every(l => lanes.includes(l))

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
        {checked && (
          <button
            className={`${styles.allBtn} ${allSelected ? styles.allBtnOn : ''}`}
            onClick={e => { e.stopPropagation(); onSelectAll() }}
            type="button"
          >
            全選択
          </button>
        )}
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