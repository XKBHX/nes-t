#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cert_dir="$root/certs"
cnf="$root/scripts/dev-cert.cnf"

mkdir -p "$cert_dir"

openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
  -keyout "$cert_dir/localhost-key.pem" \
  -out "$cert_dir/localhost.pem" \
  -config "$cnf"

chmod 600 "$cert_dir/localhost-key.pem"

echo "Wrote $cert_dir/localhost.pem and $cert_dir/localhost-key.pem"
openssl x509 -in "$cert_dir/localhost.pem" -noout -ext subjectAltName
