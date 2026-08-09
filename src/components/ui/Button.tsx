'use client'

import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'gradient' | 'secondary' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'href'> {
  variant?: Variant
  size?: Size
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  /** When set, renders Next.js Link (internal) or <a> (external). */
  href?: string
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium tracking-[-0.006em] rounded-full border border-transparent whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform,filter,opacity] duration-fast ease-standard active:scale-[0.985] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100'

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-[15px]',
  lg: 'h-12 px-7 text-[17px]',
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-soft hover:bg-accent-hover',
  gradient: 'bg-fibi-gradient text-indigo-900 shadow-soft-md hover:brightness-105',
  secondary:
    'bg-white text-[color:var(--text-primary)] border-[color:var(--border-default)] hover:bg-[color:var(--bg-subtle)] hover:border-[color:var(--border-strong)]',
  ghost:
    'bg-transparent text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-inset)] hover:text-[color:var(--text-primary)]',
  soft: 'bg-accent-soft text-sky-700 hover:bg-sky-200',
  danger: 'bg-[color:var(--red-500)] text-white hover:bg-[color:var(--red-700)]',
}

function join(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  disabled,
  href,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = join(
    base,
    sizes[size],
    variants[variant],
    fullWidth && 'w-full',
    className
  )

  const content = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  )

  if (href) {
    const isExternal = /^https?:\/\//i.test(href) || href.startsWith('mailto:')
    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={disabled || undefined}
          onClick={disabled ? (e) => e.preventDefault() : undefined}
        >
          {content}
        </a>
      )
    }
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled || undefined}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
      >
        {content}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled} className={classes} {...rest}>
      {content}
    </button>
  )
}
