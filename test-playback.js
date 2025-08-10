// Test script to debug playback state
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPlaybackState() {
  console.log('Testing playback state...');
  
  // Check if user is logged in
  const { data: userData } = await supabase.auth.getUser();
  console.log('User:', userData.user?.id ? `Logged in: ${userData.user.id}` : 'Not logged in');
  
  if (!userData.user?.id) {
    console.log('Please log in first');
    return;
  }
  
  // Check current playback state
  try {
    const { data, error } = await supabase
      .from('playback_state')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();
      
    if (error) {
      console.error('Error reading playback state:', error);
    } else {
      console.log('Current playback state:', data);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
  
  // Test writing playback state
  try {
    const testData = {
      user_id: userData.user.id,
      track_id: '12345678-1234-1234-1234-123456789abc', // dummy track ID
      position: 42,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('playback_state')
      .upsert(testData, { onConflict: 'user_id' });
      
    if (error) {
      console.error('Error writing test playback state:', error);
    } else {
      console.log('✅ Successfully wrote test playback state');
    }
  } catch (e) {
    console.error('Exception writing test:', e);
  }
}

// Run the test
testPlaybackState().catch(console.error);
