-- ===========================================================================
-- Unity Platform — Pre-Launch Production Cleanup
-- ===========================================================================
-- Run ONLY on production DB before public launch.
-- Execute inside a transaction so you can ROLLBACK if anything looks wrong.
-- Preview what will be deleted FIRST using the SELECT statements below.
--
-- Usage (server):
--   psql $DATABASE_URL -f packages/api/prisma/scripts/pre-launch-cleanup.sql
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PREVIEW — inspect before committing
-- ---------------------------------------------------------------------------

-- Test / placeholder user accounts to review:
SELECT id, email, "active_role", status, "created_at"
FROM users
WHERE email IN (
  'test1@mail.ru',
  'test_audit@test.ru',
  'asdasd@mail.ru',
  'albertvostrikov2001@yandex.ru'
)
ORDER BY "created_at";

-- Workers with empty firstName (never completed profile):
SELECT wp.id, wp."first_name", wp."last_name", wp.visibility, u.email
FROM worker_profiles wp
JOIN users u ON u.id = wp."user_id"
WHERE (wp."first_name" = '' OR wp."first_name" IS NULL)
  AND (wp."last_name" = '' OR wp."last_name" IS NULL)
  AND wp.visibility = 'hidden';

-- Test / spam chat messages:
SELECT cm.id, cm.body, cm."created_at", u.email AS sender_email
FROM chat_messages cm
JOIN users u ON u.id = cm."sender_id"
WHERE cm.body IN ('проверка', 'Проверка', 'ыы', 'два', 'один', 'test', 'Test', 'опа')
ORDER BY cm."created_at" DESC;

-- ---------------------------------------------------------------------------
-- 2. CLEANUP — delete test accounts (cascades via FK with ON DELETE CASCADE)
--    Uncomment the DELETE statements after reviewing the SELECT output above.
-- ---------------------------------------------------------------------------

-- Step A: Delete test messages (safe — only test content)
-- DELETE FROM chat_messages
-- WHERE body IN ('проверка', 'Проверка', 'ыы', 'два', 'один', 'test', 'Test', 'опа');

-- Step B: Archive hidden workers with empty profiles older than 7 days
--   (safe alternative to deletion — just hides from catalog without data loss)
-- UPDATE worker_profiles SET visibility = 'hidden'
-- WHERE (first_name = '' OR first_name IS NULL)
--   AND (last_name = '' OR last_name IS NULL)
--   AND visibility != 'hidden';

-- Step C: Delete explicitly test-only accounts (verify IDs from preview above first!)
-- DELETE FROM users WHERE email IN (
--   'test1@mail.ru',
--   'test_audit@test.ru',
--   'asdasd@mail.ru'
-- );

-- ---------------------------------------------------------------------------
-- 3. Verify counts after cleanup
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
  (SELECT COUNT(*) FROM vacancies WHERE status = 'active') AS active_vacancies,
  (SELECT COUNT(*) FROM worker_profiles WHERE visibility = 'public') AS public_workers,
  (SELECT COUNT(*) FROM employer_profiles WHERE "is_verified" = true) AS verified_employers;

-- ---------------------------------------------------------------------------
-- COMMIT or ROLLBACK
-- ---------------------------------------------------------------------------
-- If the SELECTs look correct: COMMIT;
-- If something is wrong:       ROLLBACK;

ROLLBACK;  -- Safe default — change to COMMIT when ready
