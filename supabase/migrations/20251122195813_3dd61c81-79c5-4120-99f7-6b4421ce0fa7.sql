-- Adicionar foreign key entre residents e profiles
ALTER TABLE residents 
ADD CONSTRAINT fk_residents_profiles 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;