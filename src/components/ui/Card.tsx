import type { HTMLAttributes, ReactNode } from 'react'

type Elevation = 'none' | 'sm' | 'md' | 'lg'
type Tone = 'surface' | 'subtle' | 'night' | 'brand'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
  interactive?: boolean
  tone?: Tone
  children?: ReactNode
}

const elevations: Record<Elevation, string> = {
  none: 'shadow-none',
  sm: 'shadow-soft',
  md: 'shadow-soft-md',
  lg: 'shadow-[var(--shadow-lg)]',
}

const tones: Record<Tone, string> = {
  surface: 'bg-white border border-[color:var(--border-subtle)]',
  subtle: 'bg-[color:var(--bg-subtle)] border border-transparent',
  night: 'bg-fibi-bg-dark text-white border border-indigo-700',
  brand: 'bg-fibi-brand-soft border border-transparent',
}

function join(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  elevation = 'sm',
  interactive,
  tone = 'surface',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={join(
        'rounded-2xl p-5 transition-[box-shadow,transform] duration-base ease-out',
        elevations[elevation],
        tones[tone],
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
