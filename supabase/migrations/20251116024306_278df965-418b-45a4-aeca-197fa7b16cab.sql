-- Adicionar índices para otimização de queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_unit_id ON residents(unit_id);
CREATE INDEX IF NOT EXISTS idx_residents_user_id ON residents(user_id);
CREATE INDEX IF NOT EXISTS idx_units_condominium_id ON units(condominium_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_unit_id ON vehicles(unit_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_resident_id ON vehicles(resident_id);
CREATE INDEX IF NOT EXISTS idx_gas_readings_unit_id ON gas_readings(unit_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_unit_id ON access_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_condominium_id ON access_logs(condominium_id);
CREATE INDEX IF NOT EXISTS idx_employees_condominium_id ON employees(condominium_id);