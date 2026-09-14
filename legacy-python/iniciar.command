#!/bin/bash
# Clique duas vezes neste arquivo para ligar o Stream Kit.
# Se o macOS reclamar, clique com o botão direito -> Abrir.

cd "$(dirname "$0")" || exit 1

PORT=7373

# Se a porta ja estiver ocupada, tenta a proxima livre.
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

# Abre o painel no navegador assim que o servidor subir.
( sleep 1; open "http://localhost:$PORT/" ) &

python3 server.py --port "$PORT"
