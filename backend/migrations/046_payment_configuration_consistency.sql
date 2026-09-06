-- migration-phase: expand
-- Enforce the same mutually-exclusive provider policy at the database boundary.

ALTER TABLE payment_configurations
  ADD CONSTRAINT payment_configuration_provider_consistent CHECK (
    payment_mode=active_provider
    AND direct_upi_enabled=(active_provider='direct_upi')
    AND gateway_enabled=(active_provider='phonepe')
  ) NOT VALID;

ALTER TABLE payment_configurations
  VALIDATE CONSTRAINT payment_configuration_provider_consistent;

