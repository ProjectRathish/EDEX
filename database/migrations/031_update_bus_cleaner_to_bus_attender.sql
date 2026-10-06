-- Migration: 031_update_bus_cleaner_to_bus_attender.sql
-- Description: Standardize bus staff designation from 'Bus Cleaner' to 'Bus Attender' in core_staff

UPDATE core_staff
SET designation = 'Bus Attender'
WHERE designation = 'Bus Cleaner';
