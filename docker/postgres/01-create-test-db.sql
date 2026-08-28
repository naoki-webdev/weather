SELECT 'CREATE DATABASE weather_compare_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'weather_compare_test')\gexec
