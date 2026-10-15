#!/bin/sh

. "$DOTFILES_PATH/prelude.sh"

need diff-so-fancy

link_path "$DOTFILES_PATH/git/.gitconfig" "$HOME/.gitconfig"
link_path "$DOTFILES_PATH/git/.gitignore_global" "$HOME/.gitignore_global"
link_path "$DOTFILES_PATH/git/.gitattributes" "$HOME/.gitattributes"

# No core.hooksPath: link the tracked hook into this checkout's own hooks dir.
# The hooks directory is not a link, so git does not resolve the hook through it.
if hooks=$(git -C "$DOTFILES_PATH" rev-parse --path-format=absolute --git-path hooks 2>/dev/null) && [ -n "$hooks" ]; then
  link_path "$DOTFILES_PATH/git/hooks/pre-commit" "$hooks/pre-commit"
else
  printf 'Skipped pre-commit hook: %s is not a Git checkout\n' "$DOTFILES_PATH" >&2
fi
