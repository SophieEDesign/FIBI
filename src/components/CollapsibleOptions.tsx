'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface CollapsibleOptionsProps {
  children: ReactNode
  className?: string
}

export default function CollapsibleOptions({ children, className = '' }: CollapsibleOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMoreButton, setShowMoreButton] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkOverflow = () => {
      if (!contentRef.current || !measureRef.current) return

      // Measure full height using the measure div (which is always expanded and hidden)
      const fullHeight = measureRef.current.scrollHeight
      
      // Estimate single line height (button height ~40px + gap ~8px = ~48px, rounded to 3rem = 48px)
      const singleLineHeight = 48

      // Show "more" button if content height exceeds one line
      setShowMoreButton(fullHeight > singleLineHeight)
    }

    // Check after DOM is ready
    const timer = setTimeout(checkOverflow, 50)
    
    // Check on window resize
    window.addEventListener('resize', checkOverflow)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkOverflow)
    }
  }, [children])

  // Sync width of measure div with content div
  useEffect(() => {
    if (!contentRef.current || !measureRef.current) return
    
    const syncWidth = () => {
      if (contentRef.current && measureRef.current) {
        const width = contentRef.current.offsetWidth || contentRef.current.clientWidth
        if (width > 0) {
          measureRef.current.style.width = `${width}px`
        }
      }
    }
    
    // Sync after a small delay to ensure layout is complete
    const timer = setTimeout(syncWidth, 0)
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(syncWidth, 0)
    })
    
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    
    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [children, isExpanded])

  return (
    <div className={className}>
      {/* Hidden div to measure full height */}
      <div 
        ref={measureRef}
        className="flex flex-wrap gap-2 invisible absolute pointer-events-none -z-10"
        style={{ top: '-9999px' }}
      >
        {children}
      </div>
      
      {/* Visible container */}
      <div
        ref={contentRef}
        className={`flex flex-wrap gap-2 transition-all duration-200 ${
          !isExpanded && showMoreButton ? 'overflow-hidden' : ''
        }`}
        style={{
          maxHeight: !isExpanded && showMoreButton ? '3rem' : 'none',
        }}
      >
        {children}
      </div>
      
      {showMoreButton && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          {isExpanded ? 'Show less' : 'more...'}
        </button>
      )}
    </div>
  )
}