import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Calendar Download API Endpoint
 * 
 * Generates an iCal (.ics) file from the user's planned items.
 * Can be imported into Google Calendar, Apple Calendar, Outlook, etc.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all items with planned dates
    const { data: items, error } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .not('planned_date', 'is', null)
      .order('planned_date', { ascending: true })

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    // Generate iCal content
    const icalContent = generateICal(items || [])

    // Return as downloadable file
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fibi-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error generating calendar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Generate iCal format string from items
 */
function generateICal(items: any[]): string {
  const lines: string[] = []
  
  // iCal header
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//FiBi//Calendar//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  
  // Add each item as an event
  items.forEach((item) => {
    if (!item.planned_date) return
    
    const date = new Date(item.planned_date)
    const title = item.title || item.place_name || item.formatted_address || 'Untitled Place'
    const description = [
      item.description,
      item.place_name && `Place: ${item.place_name}`,
      item.formatted_address && `Address: ${item.formatted_address}`,
      item.url && `URL: ${item.url}`,
    ]
      .filter(Boolean)
      .join('\\n')
    
    // Format date as YYYYMMDD (all-day event)
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    
    // Generate unique ID for the event
    const uid = `${item.id}@fibi.world`
    
    // Get current timestamp for DTSTAMP
    const now = new Date()
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`)
    lines.push(`DTEND;VALUE=DATE:${dateStr}`)
    lines.push(`SUMMARY:${escapeICalText(title)}`)
    if (description) {
      lines.push(`DESCRIPTION:${escapeICalText(description)}`)
    }
    if (item.url) {
      lines.push(`URL:${item.url}`)
    }
    if (item.latitude && item.longitude) {
      lines.push(`GEO:${item.latitude};${item.longitude}`)
    }
    lines.push('END:VEVENT')
  })
  
  // iCal footer
  lines.push('END:VCALENDAR')
  
  return lines.join('\r\n')
}

/**
 * Escape text for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

