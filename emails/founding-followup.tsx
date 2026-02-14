import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { EmailLayout } from 'emails/layout'

export function FoundingFollowupEmail() {
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
        Quick question
      </Heading>
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        I noticed you joined FIBI recently — thank you.
      </Text>
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        I'm still shaping the product and would genuinely love to know:{' '}
        <strong>What made you sign up?</strong>
      </Text>
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        Was there something specific that frustrates you about planning trips?
      </Text>
      <Text
        style={{
          margin: '0 0 12px',
          fontSize: 16,
          lineHeight: 1.6,
          color: '#374151',
        }}
      >
        You can just reply to this email — I read every response.
      </Text>
      <Text
        style={{
          margin: '16px 0 0',
          fontSize: 16,
          color: '#171717',
        }}
      >
        – Sophie
      </Text>
    </EmailLayout>
  )
}
