-- Remove insecure USING(true) policy from block_group_members
DROP POLICY IF EXISTS "Users can view group members" ON block_group_members;

-- Make sensitive storage buckets private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('visitor-documents', 'condominium-documents');