import type { SVGProps } from 'react'

export type IconName = 'arrow' | 'back' | 'calendar' | 'check' | 'chevron' | 'close' | 'edit' | 'flight' | 'lock' | 'map' | 'pause' | 'photo' | 'play' | 'plus' | 'route' | 'spark' | 'trash' | 'upload'

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m5 12 14 0m-5-5 5 5-5 5" />,
  back: <path d="m15 18-6-6 6-6" />,
  calendar: <><path d="M7 3v3m10-3v3M4 9h16" /><rect x="4" y="5" width="16" height="16" rx="2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  flight: <path d="M2 16.5 22 12 2 7.5v3l14 1.5-14 1.5Z" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15m6-12v15" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  photo: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 4.5-4.5 3.5 3 2.5-2.5 5.5 5" /></>,
  play: <path d="m8 5 11 7-11 7Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h1" /></>,
  spark: <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6Z" />,
  trash: <><path d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8Z" /><path d="m6 7 1 14h10l1-14" /></>,
  upload: <><path d="m12 16V4m-5 5 5-5 5 5" /><path d="M5 15v5h14v-5" /></>,
}

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}
