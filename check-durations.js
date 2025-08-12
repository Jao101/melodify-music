// Quick script to check track durations
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function checkDurations() {
  console.log('Checking track durations...');
  
  const { data, error } = await supabase
    .from('tracks')
    .select('id, title, duration, user_uploaded, audio_url')
    .order('created_at', { ascending: false })
    .limit(15);
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent tracks and their durations:');
  data.forEach(track => {
    const minutes = Math.floor(track.duration / 60);
    const seconds = (track.duration % 60).toString().padStart(2, '0');
    const isNextcloud = track.audio_url?.includes('alpenview.ch') || track.audio_url?.includes('/download');
    console.log(`- ${track.title}: ${track.duration}s (${minutes}:${seconds}) - user_uploaded: ${track.user_uploaded} - nextcloud: ${isNextcloud}`);
  });

  // Check for specific duration values
  const duration210Count = data.filter(t => t.duration === 210).length;
  console.log(`\nTracks with duration 210s (3:30): ${duration210Count}/${data.length}`);
  
  if (duration210Count > 0) {
    console.log('Found tracks with 3:30 duration - this might be a default value issue');
  }
}

checkDurations().catch(console.error);
