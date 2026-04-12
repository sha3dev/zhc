ALTER TABLE configuration
  ADD COLUMN IF NOT EXISTS cfg_steel_api_key TEXT;

COMMENT ON COLUMN configuration.cfg_steel_api_key IS 'Steel API key for cloud browser sessions';
