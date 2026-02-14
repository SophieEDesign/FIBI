import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithToken } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Calendar Download API Endpoint
 * 
 * Generates an iCal (.ics) file from the user's planned items.
 * Can be imported into Google Calendar, Apple Calendar, Outlook, etc.
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get auth token from Authorization header first (more reliable)
    const authHeader = request.headers.get('authorization')
    let supabase = await createClient(request)
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      user = tokenUser
      authError = tokenError
      if (user && !tokenError) {
        // Use token-scoped client so RLS (auth.uid()) returns the user's items
        supabase = createClientWithToken(token)
      }
    } else {
      // Fall back to cookie-based auth
      const cookieHeader = request.headers.get('cookie')
      console.log('Calendar download - Cookie header present:', !!cookieHeader)
      console.log('Calendar download - Cookie header length:', cookieHeader?.length || 0)
      
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      user = cookieUser
      authError = cookieError
      
      // If cookie-based auth fails, try without request (uses Next.js cookies())
      if (!user || authError) {
        console.log('Calendar download: Request-based auth failed, trying Next.js cookies()')
        supabase = await createClient()
        const fallbackAuth = await supabase.auth.getUser()
        user = fallbackAuth.data.user
        authError = fallbackAuth.error
      }
    }

    console.log('Calendar download - Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message,
      authMethod: authHeader ? 'Bearer token' : 'Cookies'
    })

    if (!user || authError) {
      console.error('Calendar download auth error:', authError)
      console.error('Request cookies:', request.headers.get('cookie')?.substring(0, 200))
      console.error('Request headers:', {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        userAgent: request.headers.get('user-agent')?.substring(0, 50),
        hasAuthHeader: !!authHeader,
      })
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
      // Include items that match the itinerary_id
      // Note: This will only return items that have this specific itinerary_id set
      // Items without itinerary_id (null) won't be included when filtering by itinerary
      query = query.eq('itinerary_id', itineraryId)
      console.log('Filtering by itinerary_id:', itineraryId)
    } else {
      console.log('No itinerary filter - including all items with planned_date')
    }

    // Order by planned date
    query = query.order('planned_date', { ascending: true })
    
    console.log('Calendar download query:', {
      itineraryId,
      userId: user.id,
      hasItineraryFilter: !!itineraryId,
    })

    const { data: items, error } = await query

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    console.log('Fetched items for calendar:', { 
      count: items?.length || 0, 
      itineraryId,
      sampleItems: items?.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        planned_date: item.planned_date,
        itinerary_id: item.itinerary_id,
      })) || [],
    })

    // Get itinerary name if itinerary_id is provided (needed for filename in both empty and non-empty responses)
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

    // If no items found, return an empty calendar file instead of 204
    // This is more user-friendly and prevents client-side errors
    if (!items || items.length === 0) {
      console.log('No items found for calendar download, returning empty calendar file.')
      
      // Generate empty calendar
      const emptyCalendar = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FiBi//Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'END:VCALENDAR',
      ].join('\r\n')
      
      const filename = itineraryName
        ? `fibi-${sanitizeFilename(itineraryName)}.ics`
        : 'fibi-calendar.ics'
      
      return new NextResponse(emptyCalendar, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Generate iCal content
    const itemsToProcess = items || []
    console.log('Generating iCal from items:', {
      totalItems: itemsToProcess.length,
      itemsWithPlannedDate: itemsToProcess.filter(item => item.planned_date).length,
      sampleItems: itemsToProcess.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        planned_date: item.planned_date,
      })),
    })
    
    const icalContent = generateICal(itemsToProcess)

    // Generate filename based on itinerary
    const filename = itineraryName
      ? `fibi-${sanitizeFilename(itineraryName)}.ics`
      : 'fibi-calendar.ics'

    console.log('Generated calendar:', { 
      filename, 
      itemCount: itemsToProcess.length,
      icalLength: icalContent.length,
      icalPreview: icalContent.substring(0, 200),
    })

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
    if (!item.planned_date) {
      console.warn('Skipping item without planned_date:', item.id)
      return
    }
    
    const date = new Date(item.planned_date)
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.warn('Skipping item with invalid planned_date:', item.id, item.planned_date)
      return
    }
    
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

