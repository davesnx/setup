# Keep interactive global installs in the setup-managed CLI manifest.
alias _npm='command npm'

npm() {
  emulate -L zsh
  local arg command_name='' global_install=0 explicit_prefix=0 after_separator=0
  local -a forwarded=()

  for arg in "$@"; do
    if ((!after_separator)); then
      case "$arg" in
        -g | --global | --global=true)
          global_install=1
          continue
          ;;
        --no-global | --global=false) global_install=0 ;;
        --prefix | --prefix=* | -C | -C?* | --location | --location=*) explicit_prefix=1 ;;
        --) after_separator=1 ;;
      esac
      if [[ -z "$command_name" && "$arg" != -* ]]; then
        command_name=$arg
      fi
    fi
    forwarded+=("$arg")
  done

  case "$command_name" in
    install | i | add | uninstall | un | remove | rm | r | unlink | update | up | upgrade) ;;
    *) global_install=0 ;;
  esac

  if ((!global_install || explicit_prefix)); then
    command npm "$@"
    return $?
  fi

  local node_tools="$HOME/.local/share/node-tools"
  local manifests="${DOTFILES_PATH}/terminal/node"
  if [[ ! -L "$node_tools/package.json" || ! "$node_tools/package.json" -ef "$manifests/package.json" ||
    ! -L "$node_tools/package-lock.json" || ! "$node_tools/package-lock.json" -ef "$manifests/package-lock.json" ]]; then
    print -u2 -- "Shared npm tools are not linked to setup. Run: sh \"$manifests/install.sh\""
    return 69
  fi

  # npm resolves relative package paths against --prefix; preserve the caller's paths.
  local -a managed=()
  for arg in "${forwarded[@]}"; do
    case "$arg" in
      . | .. | ./* | ../*) arg="$PWD/$arg" ;;
      file:./* | file:../*) arg="file:$PWD/${arg#file:}" ;;
    esac
    managed+=("$arg")
  done

  command npm --global=false --prefix "$node_tools" --save --save-prod --save-exact --package-lock "${managed[@]}"
}
