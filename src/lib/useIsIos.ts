'use client'

import { useEffect, useState } from 'react'

/** True on iPhone, iPad, and iPadOS desktop-mode Safari. */
export function useIsIos() {
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    setIsIos(/iPad|iPhone|iPod/.test(ua) || iPadOs)
  }, [])

  return isIos
}
