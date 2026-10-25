SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'login_database',
    'login_activity_log',
    'login_password_reset'
  );
  