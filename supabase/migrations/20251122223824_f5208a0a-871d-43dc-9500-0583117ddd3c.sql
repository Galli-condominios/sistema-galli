-- Add missing foreign key constraints for data integrity

-- visitor_authorizations -> residents
ALTER TABLE visitor_authorizations 
ADD CONSTRAINT fk_visitor_auth_residents 
FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE;

-- reservations -> residents  
ALTER TABLE reservations
ADD CONSTRAINT fk_reservations_residents
FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE;

-- maintenance_requests -> residents
ALTER TABLE maintenance_requests
ADD CONSTRAINT fk_maintenance_residents
FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL;

-- packages -> profiles
ALTER TABLE packages
ADD CONSTRAINT fk_packages_logged_by
FOREIGN KEY (logged_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- maintenance_request_updates -> profiles
ALTER TABLE maintenance_request_updates
ADD CONSTRAINT fk_maintenance_updates_updated_by
FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;