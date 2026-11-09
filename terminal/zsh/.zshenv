#! /bin/zsh

# Absolute path to this setup repository, such as /Users/davesnx/Code/github/setup.
export DOTFILES_PATH="${${(%):-%N}:A:h:h:h}"
export ZIM_HOME="$HOME/.zim"

# macOS /etc/zprofile and /etc/zshrc fork path_helper and locale on every
# start. .zprofile rebuilds PATH, Ghostty sets MANPATH, and .zshrc keeps the
# two /etc/zshrc settings that nothing else replaces.
[[ "$OSTYPE" == darwin* ]] && unsetopt GLOBAL_RCS

# SSH remote commands do not read .zprofile, where the rest of PATH is set.
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

# Over SSH, a forwarded agent socket gets a new random path per connection,
# so processes that outlive the connection, such as Claude inside tmux, keep
# a dead SSH_AUTH_SOCK. Shells share one stable link and use it instead.
# sshd starts each login shell and remote command through zsh, so this runs
# at every login. Not on the Mac: SSH_CONNECTION is unset there.
# A live link is never replaced: short connections from editors and herdr
# would take it and leave it dead when they close. When the connection
# behind it closes, sshd deletes its socket under /tmp/ssh-*, and the next
# shell start or prompt moves the link to this shell's socket or the newest
# one still there.
# ponytail: a socket left by a crashed sshd still counts as live; probe it
# with ssh-add -l if that ever picks a dead one.
if [ -n "$SSH_CONNECTION" ]; then
  _setup_agent_link() {
    local link="$HOME/.ssh/agent.sock" sock
    if [ ! -S "$link" ]; then
      for sock in "$SSH_AUTH_SOCK" /tmp/ssh-*/agent.*(N=Uom); do
        if [ "$sock" != "$link" ] && [ -S "$sock" ]; then
          ln -sfn "$sock" "$link" 2>/dev/null
          break
        fi
      done
    fi
    [ -S "$link" ] && export SSH_AUTH_SOCK="$link"
  }
  _setup_agent_link
  if [[ -o interactive ]]; then
    autoload -Uz add-zsh-hook
    add-zsh-hook precmd _setup_agent_link
  fi
fi
