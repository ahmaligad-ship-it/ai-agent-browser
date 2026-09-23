#!/usr/bin/env sh
set -e
DIR=$(dirname "$0")
if [ -f "$DIR/gradle/wrapper/gradle-wrapper.jar" ]; then exec java -jar "$DIR/gradle/wrapper/gradle-wrapper.jar" "$@"; else exec gradle "$@"; fi
