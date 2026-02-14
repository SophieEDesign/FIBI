import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
} from '@react-email/components'

const LOGO_URL = 'https://fibi.world/logo.png'
const FOOTER_TEXT = 'FIBI · Save and organise places you don't want to forget.'

export interface EmailLayoutProps {
  children: React.ReactNode
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f5f5f5',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: '0 auto',
            backgroundColor: '#ffffff',
            padding: 0,
          }}
        >
          <Section
            style={{
              padding: '32px 24px 24px',
              textAlign: 'center' as const,
            }}
          >
            <Img
              src={LOGO_URL}
              alt="FIBI"
              width={120}
              height={40}
              style={{ margin: '0 auto' }}
            />
          </Section>
          <Section style={{ padding: '0 24px 32px' }}>{children}</Section>
          <Section
            style={{
              padding: '24px 24px 32px',
              borderTop: '1px solid #eee',
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: 12,
                color: '#6b7280',
                textAlign: 'center' as const,
              }}
            >
              {FOOTER_TEXT}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
