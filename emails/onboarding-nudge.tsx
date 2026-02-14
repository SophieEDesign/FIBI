import * as React from 'react'
import { Section, Heading, Text, Button } from '@react-email/components'
import { EmailLayout } from 'emails/layout'

const APP_URL = 'https://fibi.world/app'

export interface OnboardingNudgeEmailProps {
  hasPlaces: boolean
}

export function OnboardingNudgeEmail({ hasPlaces }: OnboardingNudgeEmailProps) {
  const heading = hasPlaces
    ? 'Nice start 👀'
    : 'Have you added your first place yet?'
  const ctaText = hasPlaces ? 'Build your first trip' : 'Add your first place'
  const bodyCopy = hasPlaces
    ? "You've added places to FIBI. Create a trip to group them, or keep saving — your list, your way."
    : "FIBI is ready for you. Save a place you've had on your list (from Instagram, TikTok, or anywhere) and see it in one place."

  return (
    <EmailLayout>
      <Heading
        style={{
          margin: '0 0 16px',
          fontSize: 24,
          fontWeight: 600,
          color: '#171717',
        }}
      >
        {heading}
      </Heading>
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        {bodyCopy}
      </Text>
      <Section style={{ textAlign: 'center' as const }}>
        <Button
          href={APP_URL}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {ctaText}
        </Button>
      </Section>
      <Text
        style={{
          margin: '24px 0 0',
          fontSize: 14,
          color: '#6b7280',
        }}
      >
        Reply to this email if you need anything.
      </Text>
    </EmailLayout>
  )
}
