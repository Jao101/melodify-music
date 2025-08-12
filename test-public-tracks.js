// Test-Script für Public Tracks Feature
// Führe das in der Browser-Console aus um zu prüfen ob alles funktioniert

console.log('🧪 Testing Public Tracks Feature...');

// Test 1: Prüfe ob tracks Tabelle is_public Feld hat
(async () => {
  try {
    const { data, error } = await window.supabase
      .from('tracks')
      .select('id, title, is_public, user_id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('✅ Tracks table accessible');
    console.log('📊 Sample track data:', data?.[0]);
    
    // Test 2: Prüfe Public Tracks Query
    const { data: publicTracks, error: publicError } = await window.supabase
      .from('tracks')
      .select('*')
      .eq('is_public', true);
      
    if (publicError) {
      console.error('❌ Public tracks query error:', publicError);
      return;
    }
    
    console.log('✅ Public tracks query works');
    console.log(`📈 Found ${publicTracks?.length || 0} public tracks`);
    
    // Test 3: Test Audio Player
    if (window.location.pathname.includes('public-tracks')) {
      console.log('✅ On Public Tracks page');
      
      // Check if play buttons exist
      const playButtons = document.querySelectorAll('[aria-label*="play"], button svg[data-lucide="play"]');
      console.log(`🎵 Found ${playButtons.length} play buttons`);
      
      if (playButtons.length > 0) {
        console.log('✅ Play buttons found - audio should work');
      } else {
        console.log('⚠️ No play buttons found');
      }
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (err) {
    console.error('💥 Test failed:', err);
  }
})();
