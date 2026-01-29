import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Calendar Download API Endpoint
 * 
 * Generates an iCal (.ics) file from the user's planned items.
 * Can be imported into Google Calendar, Apple Calendar, Outlook, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request)
    
    // Use getUser() which is more reliable for API routes
    // It validates the session and refreshes if needed
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      console.error('Calendar download auth error:', authError)
      console.error('Request cookies:', request.headers.get('cookie')?.substring(0, 100))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get itinerary_id from query parameters (optional)
    const { searchParams } = new URL(request.url)
    const itineraryId = searchParams.get('itinerary_id')

    console.log('Calendar download request:', { itineraryId, userId: user.id })

    // Build query for items with planned dates
    let query = supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .not('planned_date', 'is', null)

    // Filter by itinerary if provided
    // When itineraryId is null/undefined, we get all items (including those without itinerary_id)
    if (itineraryId) {
      query = query.eq('itinerary_id', itineraryId)
    }

    // Order by planned date
    query = query.order('planned_date', { ascending: true })

    const { data: items, error } = await query

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    console.log('Fetched items for calendar:', { count: items?.length || 0, itineraryId })

    // Get itinerary name if itinerary_id is provided
    let itineraryName: string | null = null
    if (itineraryId) {
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('name')
        .eq('id', itineraryId)
        .eq('user_id', user.id)
        .single()
      
      if (itinerary) {
        itineraryName = itinerary.name
      }
    }

    // Generate iCal content
    const itemsToProcess = items || []
    const icalContent = generateICal(itemsToProcess)

    // Generate filename based on itinerary
    const filename = itineraryName
      ? `fibi-${sanitizeFilename(itineraryName)}.ics`
      : 'fibi-calendar.ics'

    console.log('Generated calendar:', { filename, itemCount: itemsToProcess.length })

    // Return as downloadable file
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
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

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .substring(0, 50) // Limit length
}

