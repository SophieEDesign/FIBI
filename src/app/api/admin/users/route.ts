import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Admin API route to fetch user data
 * GET /api/admin/users
 * 
 * Returns user data from auth.users and profiles, with aggregated stats from saved_items
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(request)
    
    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role key to query auth.users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch all users from auth.users
    const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers()

    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Fetch profiles with onboarding flags for dashboard
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, welcome_email_sent, onboarding_nudge_sent')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      // Continue even if profiles query fails
    }

    const profileMap = new Map<string, { welcome_email_sent: boolean; onboarding_nudge_sent: boolean }>()
    if (profiles) {
      profiles.forEach((p) => {
        profileMap.set(p.id, {
          welcome_email_sent: p.welcome_email_sent ?? false,
          onboarding_nudge_sent: p.onboarding_nudge_sent ?? false,
        })
      })
    }

    // Fetch place counts and first place added for each user
    const { data: placeStats, error: placeStatsError } = await adminClient
      .from('saved_items')
      .select('user_id, created_at')
      .order('created_at', { ascending: true })

    if (placeStatsError) {
      console.error('Error fetching place stats:', placeStatsError)
    }

    // Aggregate place stats by user
    const placeStatsMap = new Map<string, { count: number; firstPlaceAt: string | null }>()
    if (placeStats) {
      placeStats.forEach((item) => {
        const existing = placeStatsMap.get(item.user_id) || { count: 0, firstPlaceAt: null }
        existing.count += 1
        if (!existing.firstPlaceAt) {
          existing.firstPlaceAt = item.created_at
        }
        placeStatsMap.set(item.user_id, existing)
      })
    }

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Combine data and calculate metrics
    const usersData = authUsers.users.map((authUser) => {
      const placeStats = placeStatsMap.get(authUser.id) || { count: 0, firstPlaceAt: null }
      const onboarding = profileMap.get(authUser.id) || {
        welcome_email_sent: false,
        onboarding_nudge_sent: false,
      }
      return {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        created_at: authUser.created_at,
        last_login_at: authUser.last_sign_in_at || null,
        first_place_added_at: placeStats.firstPlaceAt,
        places_count: placeStats.count,
        welcome_email_sent: onboarding.welcome_email_sent,
        onboarding_nudge_sent: onboarding.onboarding_nudge_sent,
      }
    })

    // Sort by most recently created (default)
    usersData.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    // Calculate metrics
    const metrics = {
      totalUsers: usersData.length,
      confirmedUsers: usersData.filter((u) => u.email_confirmed_at !== null).length,
      usersWithLogin: usersData.filter((u) => u.last_login_at !== null).length,
      usersWithPlaces: usersData.filter((u) => u.places_count > 0).length,
      activeLast7Days: usersData.filter((u) => {
        if (!u.last_login_at) return false
        const lastLogin = new Date(u.last_login_at)
        return lastLogin >= sevenDaysAgo
      }).length,
    }

    return NextResponse.json({
      users: usersData,
      metrics,
    })
  } catch (error: any) {
    console.error('Error in admin users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

