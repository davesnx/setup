# Register all aliases
for aliasToSource in "$DOTFILES_PATH/terminal/_aliases/"*; do source $aliasToSource; done
# Register all exports
for exportToSource in "$DOTFILES_PATH/terminal/_exports/"*; do source $exportToSource; done
# Register all functions
for functionToSource in "$DOTFILES_PATH/terminal/_functions/"*; do source $functionToSource; done

source "$DOTFILES_PATH/git/forgit.zsh";

# Add tab completion for many Bash commands
if which brew &> /dev/null && [ -r "$(brew --prefix)/etc/profile.d/bash_completion.sh" ]; then
	# Ensure existing Homebrew v1 completions continue to work
	export BASH_COMPLETION_COMPAT_DIR="$(brew --prefix)/etc/bash_completion.d";
	source "$(brew --prefix)/etc/profile.d/bash_completion.sh";
elif [ -f /etc/bash_completion ]; then
	source /etc/bash_completion;
fi;
