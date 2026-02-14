import * as React from 'react'
import { Section, Heading, Text, Button } from '@react-email/components'
import { EmailLayout } from 'emails/layout'

const LOGIN_URL = 'https://fibi.world/login'

export function WelcomeEmail() {
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
        Welcome to FIBI
      </Heading>
      <Text
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        FIBI helps you save and organise travel places you don't want to forget.
      </Text>
      <Text
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        Here's how to start: add a place you've saved recently, create a trip,
        and keep building from there.
      </Text>
      <Section style={{ textAlign: 'center' as const, marginTop: 28 }}>
        <Button
          href={LOGIN_URL}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Open FIBI
        </Button>
      </Section>
      <Text
        style={{
          margin: '24px 0 0',
          fontSize: 14,
          color: '#6b7280',
        }}
      >
        If anything feels confusing, just reply to this email.
      </Text>
    </EmailLayout>
  )
}
