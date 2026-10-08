import { supabase } from '../lib/supabase'

interface CustomStreamingServiceRow {
  id: string
  user_id: string
  name: string
}

export async function fetchCustomStreamingServices(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('custom_streaming_services').select('*').eq('user_id', userId)
  if (error) throw error
  return (data as CustomStreamingServiceRow[]).map((row) => row.name)
}

export async function insertCustomStreamingService(name: string, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('custom_streaming_services')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return (data as CustomStreamingServiceRow).name
}
