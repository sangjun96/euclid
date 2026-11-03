#!/bin/bash
set -e

# Creates the separate databases needed for the main app and Langfuse
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE euclid_db;
    CREATE DATABASE langfuse;
    GRANT ALL PRIVILEGES ON DATABASE euclid_db TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE langfuse TO "$POSTGRES_USER";
EOSQL
