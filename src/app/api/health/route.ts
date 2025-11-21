import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // בדיקה מהירה שSupabase עובד
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from('trades')
      .select('id')
      .limit(1)

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Finotaur is running smoothly'
    })

  } catch (error: any) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({ 
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}