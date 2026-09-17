#! /bin/zsh
# Completion setup, adapted from the Zim completion module
# (https://github.com/zimfw/completion, init.zsh). Zim stats every completion
# file in fpath on each start, about 1200 files and 7 ms here. Installs add or
# remove files, which updates the directory mtime, so this compares fpath
# directory mtimes instead. After editing a #compdef line in place, run
# `rm ~/.zcompdump*` and open a new shell. The options and styles below are
# Zim's, minus the configurable case sensitivity and the matcher-list that
# .zshrc sets afterwards.

[[ ${TERM} == dumb ]] && return 1

() {
  builtin emulate -L zsh -o EXTENDED_GLOB
  local dump=${ZDOTDIR:-${HOME}}/.zcompdump old=''
  local -a dirs=(${^fpath}(N-/)) mtimes
  zmodload -F zsh/stat b:zstat && zstat -A mtimes +mtime ${dirs} || return 1
  local -r new="${ZSH_VERSION}"$'\n'"${(F)dirs}"$'\n'"${(F)mtimes}"
  [[ -e ${dump}.dat ]] && old=$(<${dump}.dat)
  [[ ${old} == "${new}" ]] || command rm -f ${dump}(|.dat|.zwc(|.old))(N)
  autoload -Uz compinit && compinit -C -d ${dump} && [[ -e ${dump} ]] || return 1
  [[ ${old} == "${new}" ]] || print -r -- ${new} >| ${dump}.dat
  # Compile the completion dumpfile; significant speedup
  [[ ${dump}.zwc -nt ${dump} ]] || zcompile ${dump}
}

# Move cursor to end of word if a full completion is inserted.
setopt ALWAYS_TO_END

# Completion is done from both ends of the cursor.
setopt COMPLETE_IN_WORD

setopt NO_CASE_GLOB

# Don't beep on ambiguous completions.
setopt NO_LIST_BEEP

#
# Completion module options
#

# Enable caching
zstyle ':completion::complete:*' use-cache on

# Group matches and describe.
zstyle ':completion:*' menu select
zstyle ':completion:*:matches' group yes
zstyle ':completion:*:options' description yes
zstyle ':completion:*:options' auto-description '%d'
zstyle ':completion:*:corrections' format '%F{green}-- %d (errors: %e) --%f'
zstyle ':completion:*:descriptions' format '%F{yellow}-- %d --%f'
zstyle ':completion:*:messages' format '%F{purple}-- %d --%f'
zstyle ':completion:*:warnings' format '%F{red}-- no matches found --%f'
zstyle ':completion:*' group-name ''
zstyle ':completion:*' verbose yes

# Insert a TAB character instead of performing completion when left buffer is empty.
zstyle ':completion:*' insert-tab false

# Ignore useless commands and functions
zstyle ':completion:*:functions' ignored-patterns '(_*|pre(cmd|exec)|prompt_*)'
# Array completion element sorting.
zstyle ':completion:*:*:-subscript-:*' tag-order 'indexes' 'parameters'

# Directories
if (( ${+LS_COLORS} )); then
  zstyle ':completion:*:default' list-colors ${(s.:.)LS_COLORS}
else
  # Use same LS_COLORS definition from utility module, in case it was not set
  zstyle ':completion:*:default' list-colors ${(s.:.):-di=1;34:ln=35:so=32:pi=33:ex=31:bd=1;36:cd=1;33:su=30;41:sg=30;46:tw=30;42:ow=30;43}
fi
zstyle ':completion:*:*:cd:*:directory-stack' menu yes select
zstyle ':completion:*' squeeze-slashes true

# History
zstyle ':completion:*:history-words' stop yes
zstyle ':completion:*:history-words' remove-all-dups yes
zstyle ':completion:*:history-words' list false
zstyle ':completion:*:history-words' menu yes

# Populate hostname completion.
zstyle -e ':completion:*:hosts' hosts 'reply=(
  ${=${=${=${${(f)"$(cat {/etc/ssh/ssh_,~/.ssh/}known_hosts{,2} 2>/dev/null)"}%%[#| ]*}//\]:[0-9]*/ }//,/ }//\[/ }
  ${=${(f)"$(cat /etc/hosts 2>/dev/null; (( ${+commands[ypcat]} )) && ypcat hosts 2>/dev/null)"}%%(\#)*}
  ${=${${${${(@M)${(f)"$(cat ~/.ssh/config{,.d/*(N)} 2>/dev/null)"}:#Host *}#Host }:#*\**}:#*\?*}}
)'

# Don't complete uninteresting users...
zstyle ':completion:*:*:*:users' ignored-patterns \
  '_*' adm amanda apache avahi beaglidx bin cacti canna clamav daemon dbus \
  distcache dovecot fax ftp games gdm gkrellmd gopher hacluster haldaemon \
  halt hsqldb ident junkbust ldap lp mail mailman mailnull mldonkey mysql \
  nagios named netdump news nfsnobody nobody nscd ntp nut nx openvpn \
  operator pcap postfix postgres privoxy pulse pvm quagga radvd rpc rpcuser \
  rpm shutdown squid sshd sync uucp vcsa xfs

# ... unless we really want to.
zstyle ':completion:*' single-ignored show

# Ignore multiple entries.
zstyle ':completion:*:(rm|kill|diff):*' ignore-line other
zstyle ':completion:*:rm:*' file-patterns '*:all-files'

# Man
zstyle ':completion:*:manuals' separate-sections true
zstyle ':completion:*:manuals.(^1*)' insert-sections true
