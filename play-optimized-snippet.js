// Simplified play function for better autoplay compatibility

const playOptimized = useCallback(async (track: BaseTrack, list?: BaseTrack[]) => {
  if (!isPlayableTrack(track)) return;

  console.log('🎵 Starting optimized play for:', track.title);

  try {
    // Set track and queue immediately
    setCurrentTrack(track);
    if (list) setQueue(list);

    // Get URL as fast as possible
    const url = await resolvePlayableUrl(track);
    if (!url) throw new Error('Could not resolve URL');

    if (audioRef.current) {
      // Set source and try to play immediately
      audioRef.current.src = url;
      
      // For Nextcloud tracks, skip delays and play immediately
      const isNextcloud = url.includes('alpenview.ch') || url.includes('/download');
      
      if (isNextcloud) {
        console.log('⚡ Fast-tracking Nextcloud track');
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          console.log('✅ Nextcloud track playing immediately');
        } catch (e) {
          console.log('⚠️ Nextcloud autoplay failed, track loaded for manual play');
        }
      } else {
        // For other tracks, use the existing metadata-waiting approach
        await audioRef.current.load();
        await audioRef.current.play();
        setIsPlaying(true);
      }

      // Set duration from track data immediately if available
      if (track.duration && track.duration > 0) {
        setDuration(track.duration);
      }

      // Save state
      saveLocalState({ track, position: 0 });
      if (user) {
        upsertPlaybackState(track.id, 0).catch(() => {});
      }
    }
  } catch (error) {
    console.error('❌ Play failed:', error);
    setIsPlaying(false);
  }
}, [setQueue, saveLocalState, user]);
