#! /usr/bin/env bash

echoerr() {
   echo "$@" 1>&2
}

_export_colors() {
   if ! ${DOT_COLORS_EXPORTED:-false}; then
      if [ -z "${TERM:-}" ] || [ "$TERM" = "dumb" ]; then
         bold=""
         freset=""
         purple=""
         red=""
         green=""
         tan=""
         blue=""
      else
         bold=$(tput bold)
         freset=$(tput sgr0)
         purple=$(tput setaf 171)
         red=$(tput setaf 1)
         green=$(tput setaf 76)
         tan=$(tput setaf 3)
         blue=$(tput setaf 38)
      fi

      log_black=30
      log_red=31
      log_green=32
      log_yellow=33
      log_blue=34
      log_purple=35
      log_cyan=36
      log_white=37

      log_regular=0
      log_bold=1
      log_underline=4

      readonly DOT_COLORS_EXPORTED=true
   fi
}

log::color() {
   _export_colors
   local bg=false color mod
   case "$*" in
      *reset*) printf '\033[0m\n'; return 0 ;;
      *black*) color=$log_black ;;
      *red*) color=$log_red ;;
      *green*) color=$log_green ;;
      *yellow*) color=$log_yellow ;;
      *blue*) color=$log_blue ;;
      *purple*) color=$log_purple ;;
      *cyan*) color=$log_cyan ;;
      *white*) color=$log_white ;;
   esac
   case "$*" in
      *regular*) mod=$log_regular ;;
      *bold*) mod=$log_bold ;;
      *underline*) mod=$log_underline ;;
   esac
   case "$*" in
      *background*) bg=true ;;
      *bg*) bg=true ;;
   esac

   if $bg; then
      printf '\033[%sm\n' "$color"
   else
      printf '\033[%s;%sm\n' "${mod:-$log_regular}" "$color"
   fi
}

if [ -z ${LOG_FILE+x} ]; then
   LOG_FILE="/tmp/$(basename "$0").log"
   readonly LOG_FILE
fi

_log() {
   local prefix=$1 message
   local messages=()
   shift
   for message in "$@"; do
      messages+=("${prefix}${message}${freset}")
   done
   if ${log_to_file:-false}; then
      printf '%s\n' "${messages[@]}" | tee -a "$LOG_FILE" >&2
   else
      printf '%s\n' "${messages[@]}" >&2
   fi
}

_header() {
   local total=58
   local size=${#1}
   local left=$(((total - size) / 2))
   local right=$((total - size - left))
   printf '%*s' "$left" '' | tr ' ' =
   printf ' %s ' "$1"
   printf '%*s' "$right" '' | tr ' ' =
}

log::header() { _export_colors && _log "" "$(printf '\n%s%s' "${bold}${purple}" "$(_header "$1")")"; }
log::success() { _export_colors && _log "${green}✔ " "$@"; }
log::error() { _export_colors && _log "${red}✖ " "$@"; }
log::warning() { _export_colors && _log "${tan}➜ " "$@"; }
log::note() { _export_colors && _log "$blue" "$@"; }
