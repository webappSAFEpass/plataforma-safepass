#!/usr/bin/env bash
# Sobe um Postgres local descartável para os testes de contrato (tests/test_repo_contract.py).
#   ./scripts/local_test_db.sh start   → imprime o TEST_DATABASE_URL
#   ./scripts/local_test_db.sh stop
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/.pgtest"
PORT="${PGTEST_PORT:-55432}"
case "${1:-start}" in
  start)
    if [ ! -d "$DIR" ]; then initdb -D "$DIR" -U postgres --auth=trust >/dev/null; fi
    if ! pg_ctl -D "$DIR" status >/dev/null 2>&1; then
      pg_ctl -D "$DIR" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
    fi
    until pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; do sleep 0.2; done
    psql -h 127.0.0.1 -p "$PORT" -U postgres -tc "select 1 from pg_database where datname='safepass_test'" \
      | grep -q 1 || createdb -h 127.0.0.1 -p "$PORT" -U postgres safepass_test
    echo "postgresql://postgres@127.0.0.1:$PORT/safepass_test"
    ;;
  stop) pg_ctl -D "$DIR" stop >/dev/null && echo "parado" ;;
  *) echo "uso: $0 start|stop" >&2; exit 1 ;;
esac
