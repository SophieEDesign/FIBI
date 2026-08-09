'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils'

type SocialAuthButtonsProps = {
  disabled?: boolean
  onError?: (message: string) => void
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.84.9-2.22 1.6-3.38 1.5-.14-1.08.42-2.22 1.18-3.02.84-.92 2.28-1.6 3.38-1.5zM20.5 17.36c-.58 1.34-.86 1.92-1.62 3.1-1.06 1.62-2.56 3.64-4.42 3.66-1.66.02-2.1-1.08-4.36-1.06-2.26.02-2.74 1.1-4.4 1.08-1.86-.02-3.28-1.84-4.34-3.46C-.02 17.3-.9 12.9.86 9.86c1.1-1.9 2.84-3.1 4.8-3.1 1.78 0 2.9 1.1 4.38 1.1 1.44 0 2.32-1.12 4.4-1.12 1.58 0 3.24.86 4.34 2.34-3.8 2.08-3.18 7.5.72 8.28z" />
    </svg>
  )
}

export default function SocialAuthButtons({ disabled, onError }: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null)

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider)
    onError?.('')

    try {
      const supabase = createClient()
      const siteUrl = getSiteUrl()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams:
            provider === 'google'
              ? { prompt: 'select_account' }
              : undefined,
        },
      })

      if (error) {
        onError?.(error.message || "That didn't work. Try again.")
        setLoadingProvider(null)
      }
      // On success the browser redirects away; keep button in loading state
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "That didn't work. Try again."
      onError?.(message)
      setLoadingProvider(null)
    }
  }

  const busy = disabled || loadingProvider !== null

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => signInWithProvider('google')}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 border border-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
      >
        <GoogleIcon className="w-5 h-5 shrink-0" />
        {loadingProvider === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <button
        type="button"
        onClick={() => signInWithProvider('apple')}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 bg-accent text-white py-3 px-4 rounded-full font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
      >
        <AppleIcon className="w-5 h-5 shrink-0" />
        {loadingProvider === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
      </button>
    </div>
  )
}
