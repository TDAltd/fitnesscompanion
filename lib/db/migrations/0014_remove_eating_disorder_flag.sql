-- The eating-disorder screening option was removed from the app: clear it from saved profiles
UPDATE "user_profile" SET "health_flags" = array_remove("health_flags", 'eating-disorder') WHERE 'eating-disorder' = ANY("health_flags");
