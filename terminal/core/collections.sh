#! /usr/bin/env bash

coll::is_empty() {
   local var=${1}
   [[ -z ${var} ]]
}

coll::contains_element() {
   local element=$1 e
   shift
   for e in "$@"; do
      if [[ "$e" == "${element}" ]]; then
         return 1
      fi
   done
   return 0
}
