#!/bin/bash
set -eu
test -f active.json
test -d home
test ! -L home
if test ! -e home/tool && test ! -L home/tool; then
  ln -s ../old-setup/tool.txt home/tool
fi
if test ! -e home/personal && test ! -L home/personal; then
  ln -s ../other-project/notes.txt home/personal
fi
