import Link from 'next/link'

interface SiteFooterProps {
  /** Show "Sign in" link (e.g. on landing page when user is not logged in) */
  showSignIn?: boolean
  /** Optional extra class for the footer container */
  className?: string
}

/**
 * Shared footer with legal links and copyright. Used on landing (with Sign in)
 * and in the app when logged in (without Sign in).
 */
export default function SiteFooter({ showSignIn = false, className = '' }: SiteFooterProps) {
  return (
    <footer className={`border-t border-gray-100 bg-white ${className}`.trim()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Fibi. Save places before you lose them.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:hello@fibi.world"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Contact
            </a>
            {showSignIn && (
              <Link
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
