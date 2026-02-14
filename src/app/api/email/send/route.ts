import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { render } from '@react-email/render'
import { requireAdmin, getAdminSupabase } from '@/lib/admin'
import { UUID_REGEX } from '@/lib/utils'
import { sendEmail } from '@/lib/resend'
import { WelcomeEmail } from 'emails/welcome'
import { OnboardingNudgeEmail } from 'emails/onboarding-nudge'
import { FoundingFollowupEmail } from 'emails/founding-followup'

export const dynamic = 'force-dynamic'

const NUDGE_ELIGIBLE_AGE_MS = 48 * 60 * 60 * 1000
const FROM_EMAIL = 'hello@fibi.world'

const EMAIL_TYPE = ['welcome', 'nudge', 'founding'] as const
type EmailType = (typeof EMAIL_TYPE)[number]

const SUBJECTS = {
  welcome: "You're in. Let's start properly ✨",
  nudgeFirstPlace: 'Add your first place to FIBI',
  nudgeNiceStart: 'Nice start — keep building your list',
  founding: 'You joined FIBI recently — can I ask you something?',
} as const

type AdminUserRow = {
  email: string | null
  email_confirmed_at: string | null
  created_at: string | null
  welcome_email_sent: boolean
  onboarding_nudge_sent: boolean
  founding_followup_sent: boolean
  places_count: number
}

function isEmailType(s: string): s is EmailType {
  return EMAIL_TYPE.includes(s as EmailType)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json().catch(() => ({}))
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''

    if (!isEmailType(type)) {
      return NextResponse.json(
        { error: 'Invalid type: must be welcome, nudge, or founding' },
        { status: 400 }
      )
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { error: 'Valid userId is required' },
        { status: 400 }
      )
    }

    const admin = getAdminSupabase()

    const { data, error: viewError } = await admin.rpc('get_admin_user_overview_by_id', {
      p_user_id: userId,
    })
    const row = data?.[0]

    if (viewError || !row) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const user = row as AdminUserRow

    if (!user.email) {
      return NextResponse.json(
        { error: 'User has no email' },
        { status: 400 }
      )
    }

    if (type === 'welcome') {
      if (user.email_confirmed_at == null) {
        return NextResponse.json(
          { error: 'User has not confirmed email' },
          { status: 400 }
        )
      }
      if (user.welcome_email_sent === true) {
        return NextResponse.json(
          { error: 'Welcome email already sent' },
          { status: 400 }
        )
      }
    }

    if (type === 'nudge') {
      if (user.email_confirmed_at == null) {
        return NextResponse.json(
          { error: 'User has not confirmed email' },
          { status: 400 }
        )
      }
      if (user.onboarding_nudge_sent === true) {
        return NextResponse.json(
          { error: 'Onboarding nudge already sent' },
          { status: 400 }
        )
      }
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
      const cutoff = Date.now() - NUDGE_ELIGIBLE_AGE_MS
      if (createdAt >= cutoff) {
        return NextResponse.json(
          { error: 'User must be at least 48 hours old to receive nudge' },
          { status: 400 }
        )
      }
    }

    if (type === 'founding') {
      if (user.founding_followup_sent === true) {
        return NextResponse.json(
          { error: 'Founding follow-up already sent' },
          { status: 400 }
        )
      }
      if (user.email_confirmed_at == null) {
        return NextResponse.json(
          { error: 'User has not confirmed email' },
          { status: 400 }
        )
      }
    }

    let html: string
    let subject: string

    if (type === 'welcome') {
      html = await render(React.createElement(WelcomeEmail))
      subject = SUBJECTS.welcome
    } else if (type === 'nudge') {
      const hasPlaces = (user.places_count ?? 0) > 0
      html = await render(
        React.createElement(OnboardingNudgeEmail, { hasPlaces })
      )
      subject = hasPlaces ? SUBJECTS.nudgeNiceStart : SUBJECTS.nudgeFirstPlace
    } else {
      html = await render(React.createElement(FoundingFollowupEmail))
      subject = SUBJECTS.founding
    }

    await sendEmail({
      to: user.email,
      subject,
      html,
      from: FROM_EMAIL,
    })

    if (type === 'welcome') {
      const { error: updateError } = await admin
        .from('profiles')
        .update({ welcome_email_sent: true })
        .eq('id', userId)
      if (updateError) {
        console.error('Failed to set welcome_email_sent:', updateError)
        return NextResponse.json(
          { error: 'Email sent but failed to update record' },
          { status: 500 }
        )
      }
    }

    if (type === 'nudge') {
      const { error: updateError } = await admin
        .from('profiles')
        .update({ onboarding_nudge_sent: true })
        .eq('id', userId)
      if (updateError) {
        console.error('Failed to set onboarding_nudge_sent:', updateError)
        return NextResponse.json(
          { error: 'Email sent but failed to update record' },
          { status: 500 }
        )
      }
    }

    if (type === 'founding') {
      const { error: updateError } = await admin
        .from('profiles')
        .update({ founding_followup_sent: true })
        .eq('id', userId)
      if (updateError) {
        console.error('Failed to set founding_followup_sent:', updateError)
        return NextResponse.json(
          { error: 'Email sent but failed to update record' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Email send error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
