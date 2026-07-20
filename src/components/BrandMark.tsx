export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className="brand-mark" aria-label="There I Was">{compact ? 'TIW' : 'There I Was'}</span>
}
