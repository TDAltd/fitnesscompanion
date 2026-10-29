-- Custom SQL migration file, put your code below! --
-- Sleep is no longer synced from health devices: remove what was stored
UPDATE "health_daily" SET "sleep_minutes" = NULL WHERE "sleep_minutes" IS NOT NULL;
