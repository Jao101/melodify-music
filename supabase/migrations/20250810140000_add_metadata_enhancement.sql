-- Migration: Add metadata enhancement tracking columns to tracks table
-- Date: 2025-08-10
-- Description: Add columns to track metadata enhancements from MusicBrainz

-- Add new columns for metadata enhancement tracking
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS original_artist TEXT,
ADD COLUMN IF NOT EXISTS enhanced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enhancement_source TEXT;

-- Add indexes for better performance when querying enhanced tracks
CREATE INDEX IF NOT EXISTS idx_tracks_enhanced_at ON public.tracks(enhanced_at);
CREATE INDEX IF NOT EXISTS idx_tracks_enhancement_source ON public.tracks(enhancement_source);

-- Add comments for documentation
COMMENT ON COLUMN public.tracks.original_artist IS 'Original artist name before metadata enhancement';
COMMENT ON COLUMN public.tracks.enhanced_at IS 'Timestamp when metadata was enhanced from external source';
COMMENT ON COLUMN public.tracks.enhancement_source IS 'Source of metadata enhancement (e.g., musicbrainz, lastfm)';

-- Update the updated_at trigger to include new columns
-- (This ensures the updated_at timestamp is updated when enhancement columns change)
