export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="There I Was">
      <svg viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="15.5" />
        <path d="M7.5 22c4.2-9.6 8.8-10.6 18.4-10.1" />
        <circle cx="8" cy="22" r="2.2" />
        <circle cx="26" cy="12" r="2.2" />
      </svg>
      {!compact && <span>There I Was</span>}
    </div>
  )
}

