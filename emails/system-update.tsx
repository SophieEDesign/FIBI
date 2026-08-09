import * as React from 'react'
import { Section, Heading, Text, Button, Link } from '@react-email/components'
import { EmailLayout } from 'emails/layout'

const APP_URL = 'https://fibi.world/login'
const GUIDES_URL = 'https://fibi.world/travel-guides'
const NORTH_WALES_URL = 'https://fibi.world/travel-guides/north-wales-hidden-gems'

export function SystemUpdateEmail() {
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
        We&apos;ve updated FIBI
      </Heading>
      <Text
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        A few quiet improvements to help you save places, organise trips, and
        share them when you&apos;re ready.
      </Text>

      <Text
        style={{
          margin: '24px 0 8px',
          fontSize: 16,
          fontWeight: 600,
          color: '#171717',
        }}
      >
        Share a Travel Board
      </Text>
      <Text
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        Open a trip and tap Share board. You get a calm public link anyone can
        open — no account needed to look.
      </Text>

      <Text
        style={{
          margin: '24px 0 8px',
          fontSize: 16,
          fontWeight: 600,
          color: '#171717',
        }}
      >
        Travel Guides
      </Text>
      <Text
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        Curated lists you can save straight into your own board. Start with{' '}
        <Link href={NORTH_WALES_URL} style={{ color: '#2563eb' }}>
          8 hidden gems in North Wales
        </Link>
        , or browse more on{' '}
        <Link href={GUIDES_URL} style={{ color: '#2563eb' }}>
          Travel Guides
        </Link>
        .
      </Text>

      <Text
        style={{
          margin: '24px 0 8px',
          fontSize: 16,
          fontWeight: 600,
          color: '#171717',
        }}
      >
        Continue with Google
      </Text>
      <Text
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        Sign in a little faster when you next open FIBI — Google is there
        alongside email.
      </Text>

      <Section style={{ textAlign: 'center' as const, marginTop: 28 }}>
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
        As always, reply if something feels off — we read every message.
      </Text>
    </EmailLayout>
  )
}
