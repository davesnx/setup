link_guarded() {
  test -e "$1" || return 66
  if test -L "$2"; then
    test "$(readlink "$2")" = "$1" && return 0
    rm "$2" || return $?
  elif test -e "$2"; then
    return 73
  fi
  ln -s "$1" "$2"
}
