-- Add foreign key between user_roles and profiles
-- Both tables reference the same auth.users.id, so we can link them
ALTER TABLE user_roles
ADD CONSTRAINT fk_user_roles_profiles
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;