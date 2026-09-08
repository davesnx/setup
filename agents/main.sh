# Keep the skills CLI on the shared global skill directory.
function npx() {
	if [[ "$1" == "skills" ]]; then
		case "$2" in
			add|a|update|upgrade|remove|rm|list|ls)
				local subcommand="$2"
				shift 2
				command npx skills "$subcommand" --global "$@"
				return
				;;
		esac
	fi

	command npx "$@"
}
