-- Custom SQL migration file, put your code below! ---- Save each person's setup weight as their first weigh-in when they have none,
-- so Today and Progress show the same starting point.
INSERT INTO "weight_logs" ("user_id", "weight_kg", "notes", "logged_at")
SELECT p."user_id", p."current_weight_kg", 'Starting weight', COALESCE(u."created_at", p."updated_at")
FROM "user_profile" p
JOIN "users" u ON u."id" = p."user_id"
WHERE p."current_weight_kg" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "weight_logs" w WHERE w."user_id" = p."user_id");
