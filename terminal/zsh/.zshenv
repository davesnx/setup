#! /bin/zsh

# Absolute path to this setup repository, such as /Users/davesnx/Code/github/setup.
export DOTFILES_PATH="${${(%):-%N}:A:h:h:h}"
export ZIM_HOME="$HOME/.zim"

# Over SSH, a forwarded agent socket gets a new random path per connection,
# so processes that outlive the connection, such as Claude inside tmux, keep
# a dead SSH_AUTH_SOCK. Every shell re-points one stable link to the newest
# live socket and uses the link, so a reconnect repairs it with no restart.
# sshd starts each login shell and remote command through zsh, so this runs
# at every login. Not on the Mac: SSH_CONNECTION is unset there.
# ponytail: last login wins; when a newer connection closes first, the link
# is dead until the next login.
if [ -n "$SSH_CONNECTION" ]; then
  agent_link="$HOME/.ssh/agent.sock"
  if [ -S "$SSH_AUTH_SOCK" ] && [ "$SSH_AUTH_SOCK" != "$agent_link" ]; then
    ln -sfn "$SSH_AUTH_SOCK" "$agent_link" 2>/dev/null
  fi
  [ -S "$agent_link" ] && export SSH_AUTH_SOCK="$agent_link"
  unset agent_link
fi
