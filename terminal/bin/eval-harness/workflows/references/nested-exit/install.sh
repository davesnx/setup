#!/bin/sh
sh ./patch.sh "$1" || exit $?
printf 'installed\n' > installed.txt
