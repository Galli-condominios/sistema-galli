-- Adicionar campos de disponibilidade à tabela common_areas
ALTER TABLE public.common_areas
ADD COLUMN available_days jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
ADD COLUMN opening_time time without time zone DEFAULT '08:00'::time,
ADD COLUMN closing_time time without time zone DEFAULT '22:00'::time;