-- Add image_urls JSONB array column to common_areas
ALTER TABLE public.common_areas 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing image_url data to image_urls array
UPDATE public.common_areas 
SET image_urls = jsonb_build_array(image_url) 
WHERE image_url IS NOT NULL AND image_url != '' AND (image_urls IS NULL OR image_urls = '[]'::jsonb);