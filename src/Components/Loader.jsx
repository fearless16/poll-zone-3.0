import styles from './Loader.module.css'

/**
 * Pure-CSS spinner.
 * Renders a circular ring that spins indefinitely.
 */
const Loader = () => (
  <div className={styles.loaderOverlay}>
    <div className={`${styles.spinner} ${styles.large}`} role="status" aria-label="Loading">
      <span className="visually-hidden">Loading…</span>
    </div>
  </div>
)

export default Loader
