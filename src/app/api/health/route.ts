import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // בדיקה מהירה - אם זה עובד, הכל טוב
    const { error } = await supabase
      .from('trades')
      .select('id')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, זה בסדר
      throw error
    }

    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({ 
      status: 'error',
      message: error.message 
    }, { status: 500 })
  }
}