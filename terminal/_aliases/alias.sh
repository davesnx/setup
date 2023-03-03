#! /usr/bin/env bash

# Remove all aliases
unalias -m '*'

# Easier navigation
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."

# One chars
alias .="open ."
alias h="history 1"
alias o="oni2"
alias c="code"
alias n="npm"
alias y="yarn"
alias p="pnpm"
alias e="esy"
alias m="make"
alias q="query-json"
alias t="itomate"
alias r=" source \${DOTFILES_PATH}/bin/yarn-scripts"
alias er=" source \${DOTFILES_PATH}/bin/esy-scripts"
alias x="dum"
alias d='docker'

# Edit setup
alias cfg="code \${DOTFILES_PATH}"

# Edit etc/hosts file
alias hosts="code /etc/hosts"

alias quit="exit"

# Re-alias "export" to " export" to remove from history
alias export=" export"

# List only directories
alias ld="ls -D"

# IP addresses
alias ip="dig +short myip.opendns.com @resolver1.opendns.com"
alias ips="ifconfig -a | grep -o 'inet6\? \(addr:\)\?\s\?\(\(\([0-9]\+\.\)\{3\}[0-9]\+\)\|[a-fA-F0-9:]\+\)' | awk '{ sub(/inet6? (addr:)? ?/, \"\"); print }'"
alias localip="ipconfig getifaddr en0"
alias privateip="localip"

# Always enable colored `grep` output
# Note: `GREP_OPTIONS="--color=auto"` is deprecated, hence the alias usage.
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'

# Enable aliases to be sudo’ed
alias sudo='sudo '

# Get week number
alias week='date +%V'

# Google Chrome
alias chrome='/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'

# Show active network interfaces
alias ifactive="ifconfig | pcregrep -M -o '^[^\t:]+:([^\n]|\n\t)*status: active'"

# Clean up LaunchServices to remove duplicates in the “Open With” menu
alias lscleanup="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user && killall Finder"

# Recursively delete `.DS_Store` files
alias cleanup="_find . -type f -name '*.DS_Store' -ls -delete"

# Empty the Trash on all mounted volumes and the main HDD.
# Also, clear Apple’s System Logs to improve shell startup speed.
# Finally, clear download history from quarantine. https://mths.be/bum
alias emptytrash="sudo rm -rfv /Volumes/*/.Trashes; sudo rm -rfv ~/.Trash; sudo rm -rfv /private/var/log/asl/*.asl; sqlite3 ~/Library/Preferences/com.apple.LaunchServices.QuarantineEventsV* 'delete from LSQuarantineEvent'"

# Airport CLI alias
alias airport='/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'

# Stuff I never really use but cannot delete either because of http://xkcd.com/530/
alias stfu="osascript -e 'set volume output muted true'"
alias pumpitup="osascript -e 'set volume output volume 100'"

# Kill all the tabs in Chrome to free up memory
# [C] explained: http://www.commandlinefu.com/commands/view/402/exclude-grep-from-your-grepped-output-of-ps-alias-included-in-description
alias chromekill="ps ux | grep '[C]hrome Helper --type=renderer' | grep -v extension-process | tr -s ' ' | cut -d ' ' -f2 | xargs kill"

# Reload the shell (i.e. invoke as a login shell)
alias reload="exec \${SHELL} -l"

# Print each PATH entry on a separate line
alias path='echo -e ${PATH//:/\\n}'

alias sniff="sudo ngrep -d 'en1' -t '^(GET|POST) ' 'tcp and port 80'"

alias timer='echo "Timer started. Stop with Ctrl-D." && date && time cat && date'

# Aliasing eachdir like this allows you to use aliases/functions as commands.
alias eachdir=". eachdir"

alias df="df -h"

# Flush Directory Service cache
alias flush="dscacheutil -flushcache && killall -HUP mDNSResponder"

alias httpdump="sudo tcpdump -i en1 -n -s 0 -w - | grep -a -o -E \"Host\: .*|GET \/.*\""

# Test zsh startup time
alias testzsh="TIMEFMT=$'real %E\tuser %U\tsys %S'; repeat 10 {time zsh -i -c exit}"

# Improved CLIs
alias copy="pbcopy"
alias paste="pbpaste"
alias pg='pgcli'
alias my='mycli'

# Extend ls
alias l="exa --group-directories-first -al --no-time"
alias ls="exa --group-directories-first -alh --octal-permissions"

# https://github.com/sharkdp/fd
alias _find="command find"
alias find="fd"

# https://github.com/sindresorhus/fkill-cli
alias _kill="command kill"
alias kill="fkill"

# https://github.com/sharkdp/bat
alias _cat="command cat"
alias cat="bat"

# https://github.com/htop-dev/htop
alias _top="command top"
alias top="htop"

# Generate a uuid
alias uuid="uuidgen | tr '[:upper:]' '[:lower:]'"

# Know what process uses the port
alias port="source \${DOTFILES_PATH}/bin/system/port_owner"
alias listen="lsof -n | grep LISTEN"

function _calcram() {
  local sum
  sum=0
  for i in `\ps aux | grep -i "$1" | grep -v "grep" | awk '{print $6}'`; do
    sum=$(($i + $sum))
  done
  sum=$(echo "scale=0; $sum / 1024.0" | bc)
  echo $sum
}

function ram() {
  local sum
  local app="$1"
  if [ -z "$app" ]; then
    echo "First argument - pattern to grep from processes"
    return 0
  fi

  while true; do
    sum=$(_calcram $app)
    if [[ $sum != "0" ]]; then
      echo -en "${fg[blue]}${app}${reset_color} uses ${fg[green]}${sum}${reset_color} MB of RAM\r"
    else
      echo -en "No active processes matching pattern '${fg[blue]}${app}${reset_color}'\r"
    fi
    sleep 1
  done
}
