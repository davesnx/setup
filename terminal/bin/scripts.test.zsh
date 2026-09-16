#!/usr/bin/env zsh

emulate -R zsh
setopt nounset extendedglob

root=${0:A:h:h:h}
export PICKER="$root/terminal/bin/scripts"
export DOTFILES_PATH="$root"
export REAL_JQ=$(whence -p jq)
[[ -n "$REAL_JQ" ]] || { print -u2 'Tests require jq'; exit 1; }
zsh_bin=$(whence -p zsh)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT HUP INT TERM
mkdir -p "$work/bin" "$work/project with spaces" "$work/home"
export HOME="$work/home" ZDOTDIR="$work/home"
export TRACE="$work/trace" NPM_ARGUMENTS="$work/npm-arguments"
export FZF_INPUT="$work/fzf-input"
export PATH="$work/bin:$PATH"

cat >"$work/bin/npm" <<'EOF'
#!/bin/sh
printf 'npm\n' >>"$TRACE"
printf '%s\0' "$@" >>"$NPM_ARGUMENTS"
exit "${NPM_STATUS:-0}"
EOF
cat >"$work/bin/jq" <<'EOF'
#!/bin/sh
printf 'jq\n' >>"$TRACE"
if [ "${JQ_STATUS:-0}" -ne 0 ]; then
    printf 'fixture jq failure\n' >&2
    exit "$JQ_STATUS"
fi
exec "$REAL_JQ" "$@"
EOF
cat >"$work/bin/fzf" <<'EOF'
#!/usr/bin/env zsh
emulate -R zsh
print fzf >>"$TRACE"
cat >"$FZF_INPUT"
(( ${FZF_STATUS:-0} == 0 )) || exit "$FZF_STATUS"
[[ ${FZF_EMPTY:-0} == 0 ]] || exit 0
delimiter=$'\n'
(( ${argv[(Ie)--read0]} )) && delimiter=$'\0'
integer index=0
while IFS= read -r -d "$delimiter" item; do
    (( ++index == ${FZF_INDEX:-1} )) || continue
    printf '%s%s' "$item" "$delimiter"
    exit 0
done <"$FZF_INPUT"
exit 1
EOF
chmod +x "$work/bin/"*
ln -s "$zsh_bin" "$work/bin/zsh"

cd "$work/project with spaces" || exit 1
integer failures=0 total=0 result=0
output='' error=''
odd_key=$'lint: fix \' " :  spaced\\name'

reset_fixture() {
    unset FZF_STATUS FZF_EMPTY FZF_INDEX NPM_STATUS JQ_STATUS
    : >"$TRACE"
    : >"$NPM_ARGUMENTS"
    : >"$FZF_INPUT"
    "$REAL_JQ" -n --arg key "$odd_key" \
        '{scripts: {build: "must never run", ($key): "must never run either"}}' >package.json
}

run_picker() {
    local mode=$1
    shift
    if [[ $mode == direct ]]; then
        "$PICKER" "$@" >"$work/out" 2>"$work/err"
    else
        "$zsh_bin" -f -c '
            source "$PICKER" "$@"
            result=$?
            print -r -- "CALLER_ALIVE:$result"
            exit "$result"
        ' picker-test "$@" >"$work/out" 2>"$work/err"
    fi
    result=$?
    output=$(<"$work/out")
    error=$(<"$work/err")
}

check() {
    local label=$1
    shift
    (( ++total ))
    if "$@"; then
        print -r -- "PASS: $label"
    else
        (( ++failures ))
        print -r -- "FAIL: $label (status=$result)"
        [[ -z $output ]] || print -r -- "  stdout: $output"
        [[ -z $error ]] || print -r -- "  stderr: $error"
    fi
}

help_ok() {
    (( result == 0 )) && [[ $output == *'Usage:'* && -z $error && ! -s $TRACE ]]
}
source_alive() { [[ $output == *"CALLER_ALIVE:$result"* ]]; }
error_ok() {
    (( result != 0 )) && [[ $error == *"$1"* && ! -s $NPM_ARGUMENTS ]]
}
args_ok() {
    printf '%s\0' "$@" >"$work/expected"
    cmp -s "$work/expected" "$NPM_ARGUMENTS"
}
cancel_ok() { (( result == 0 )) && [[ ! -s $NPM_ARGUMENTS && -z $error ]]; }

version_ok() {
    local expected=1.1.0
    [[ $1 != sourced ]] || expected+=$'\nCALLER_ALIVE:0'
    (( result == 0 )) && [[ $output == "$expected" && -z $error ]]
}
no_operations() { [[ ! -s $TRACE && ! -s $NPM_ARGUMENTS ]]; }

for mode in direct sourced; do
    reset_fixture
    rm package.json
    PATH="$work/bin" DOTFILES_PATH='' run_picker "$mode" --version
    check "$mode --version prints exactly 1.1.0 without package, Bun, or Git" version_ok "$mode"
    check "$mode --version performs no jq, fzf, or npm operations" no_operations
    [[ $mode != sourced ]] || check 'caller survives --version' source_alive

    reset_fixture
    run_picker "$mode" --version extra
    check "$mode rejects extra version arguments" test "$result" -eq 64
    check "$mode extra version arguments perform no operations" no_operations
done

if [[ ${1:-} == --version-only ]]; then
    print -r -- "$total checks, $failures failures"
    (( failures == 0 ))
    exit $?
fi

for mode in direct sourced; do
    for flag in --help -h; do
        reset_fixture
        rm package.json
        run_picker "$mode" "$flag"
        check "$mode $flag without package or picker calls" help_ok
        [[ $mode != sourced ]] || check "caller survives $flag" source_alive
    done

    reset_fixture
    run_picker "$mode" --bogus
    check "$mode rejects extra arguments without running npm" error_ok 'unexpected arguments'
    check "$mode usage error status" test "$result" -eq 64
    [[ $mode != sourced ]] || check 'caller survives usage error' source_alive

    reset_fixture
    rm package.json
    run_picker "$mode"
    check "$mode missing package is an error" error_ok package.json
    [[ $mode != sourced ]] || check 'caller survives missing package' source_alive

    for fixture in '{invalid' '' '[]' '{} {}' '{"scripts":false}' '{"scripts":[]}' '{"scripts":{"build":7}}'; do
        reset_fixture
        print -rn -- "$fixture" >package.json
        run_picker "$mode"
        check "$mode rejects invalid package: ${(qq)fixture}" error_ok package.json
    done

    for fixture in '{}' '{"scripts":null}' '{"scripts":{}}'; do
        reset_fixture
        print -r -- "$fixture" >package.json
        run_picker "$mode"
        check "$mode reports no scripts: $fixture" error_ok scripts
    done

    reset_fixture
    run_picker "$mode"
    check "$mode selects npm run build" args_ok run build
    check "$mode npm success status" test "$result" -eq 0

    reset_fixture
    export FZF_INDEX=2
    run_picker "$mode"
    check "$mode preserves colon, quotes, spaces, and backslash in key" args_ok run "$odd_key"

    reset_fixture
    "$REAL_JQ" -n --arg key $' leading\tline\nbreak\n' \
        '{scripts: {($key): "must never run"}}' >package.json
    run_picker "$mode"
    check "$mode preserves leading space, tabs, and trailing newline in key" args_ok run $' leading\tline\nbreak\n'

    reset_fixture
    export NPM_STATUS=37
    run_picker "$mode"
    check "$mode preserves npm failure status" test "$result" -eq 37
    check "$mode failed npm still has exact arguments" args_ok run build
    [[ $mode != sourced ]] || check 'caller survives npm failure' source_alive

    for cancel_status in 1 130; do
        reset_fixture
        export FZF_STATUS=$cancel_status
        run_picker "$mode"
        check "$mode cancellation ($cancel_status) does not run npm" cancel_ok
        [[ $mode != sourced ]] || check "caller survives cancellation ($cancel_status)" source_alive
    done

    reset_fixture
    export FZF_EMPTY=1
    run_picker "$mode"
    check "$mode empty selection does not run npm" cancel_ok

    reset_fixture
    export FZF_STATUS=2
    run_picker "$mode"
    check "$mode reports picker failure" error_ok fzf

    reset_fixture
    export JQ_STATUS=4
    run_picker "$mode"
    check "$mode reports JSON reader failure" error_ok package.json
done

reset_fixture
PATH="$work/bin" DOTFILES_PATH='' run_picker direct --help
check 'direct help works without Bun or shared helpers' help_ok
PATH="$work/bin" DOTFILES_PATH='' run_picker sourced --help
check 'sourced help works without Bun or shared helpers' help_ok

reset_fixture
export R_ALIAS=''
while IFS= read -r line; do
    if [[ $line == 'alias r='* ]]; then
        R_ALIAS=$line
        break
    fi
done <"$root/terminal/_aliases/alias.sh"
"$zsh_bin" -f -c '
    [[ -n $R_ALIAS ]] || exit 1
    eval "$R_ALIAS"
    eval "r --help"
    result=$?
    print -r -- "CALLER_ALIVE:$result"
    exit "$result"
' >"$work/out" 2>"$work/err"
result=$? output=$(<"$work/out") error=$(<"$work/err")
check 'actual r alias prints help without invoking picker' help_ok
check 'actual r alias leaves caller alive' source_alive

reset_fixture
"$zsh_bin" -f -c '
    zmodload zsh/parameter
    selected_script=caller-selected script_name=caller-name
    setopt shwordsplit ksharrays nonomatch
    unsetopt pipefail
    typeset before_options before_parameters before_functions before_aliases
    typeset after_options after_parameters after_functions after_aliases
    typeset before_pwd=$PWD before_path=$PATH result attempt
    before_options=$(setopt)
    before_parameters=${(ok)parameters}
    before_functions=${(ok)functions}
    before_aliases=$(alias -L)
    for attempt in 1 2; do
        source "$PICKER"
        result=$?
        (( result == 0 )) || exit 1
    done
    after_options=$(setopt)
    after_parameters=${(ok)parameters}
    after_functions=${(ok)functions}
    after_aliases=$(alias -L)
    [[ $before_options == $after_options && $before_functions == $after_functions &&
       $before_aliases == $after_aliases && $PWD == $before_pwd && $PATH == $before_path &&
       $selected_script == caller-selected && $script_name == caller-name ]] || exit 2
    [[ $after_parameters == $before_parameters ]] || exit 3
' >"$work/out" 2>"$work/err"
result=$? output=$(<"$work/out") error=$(<"$work/err")
check 'repeated sourcing preserves variables, functions, aliases, options, cwd, and PATH' test "$result" -eq 0

reset_fixture
"$zsh_bin" -f -c '
    set -- caller "two words"
    setopt errexit nounset pipefail
    before=$(setopt)
    source "$PICKER" --help >/dev/null
    [[ $# == 2 && $1 == caller && $2 == "two words" && $(setopt) == $before ]] || exit 1
    if source "$PICKER" --bogus 2>/dev/null; then exit 2; else
        [[ $? == 64 && $(setopt) == $before ]] || exit 3
    fi
' >"$work/out" 2>"$work/err"
result=$? output=$(<"$work/out") error=$(<"$work/err")
check 'help and handled errors preserve caller arguments and strict options' test "$result" -eq 0

reset_fixture
export FZF_INDEX=2
"$zsh_bin" -f -i -c '
    HISTFILE=$HOME/test-history
    HISTSIZE=100 SAVEHIST=0
    source "$PICKER"
    result=$?
    print -r -- "CALLER_ALIVE:$result"
    fc -ln -1 >"$HOME/history-entry"
    exit "$result"
' >"$work/out" 2>"$work/err"
result=$? output=$(<"$work/out") error=$(<"$work/err")
check 'interactive sourced invocation returns to caller' source_alive
check 'interactive invocation preserves selected key' args_ok run "$odd_key"
history_entry=$(<"$HOME/history-entry")
: >"$NPM_ARGUMENTS"
"$zsh_bin" -f -c "$history_entry" >"$work/out" 2>"$work/err"
result=$? output=$(<"$work/out") error=$(<"$work/err")
check 'caller history replays the exact npm arguments' args_ok run "$odd_key"

for action in help cancel error npm-failure; do
    reset_fixture
    export HISTORY_ACTION=$action
    case $action in
        cancel) export FZF_STATUS=130 ;;
        error) rm package.json ;;
        npm-failure) export NPM_STATUS=37 ;;
    esac
    "$zsh_bin" -f -i -c '
        HISTFILE=$HOME/test-history
        HISTSIZE=100 SAVEHIST=0
        print -sr -- "caller sentinel"
        if [[ $HISTORY_ACTION == help ]]; then
            source "$PICKER" --help
        else
            source "$PICKER"
        fi
        result=$?
        print -r -- "CALLER_ALIVE:$result"
        fc -ln -1 >"$HOME/history-entry"
        exit "$result"
    ' >"$work/out" 2>"$work/err"
    result=$? output=$(<"$work/out") error=$(<"$work/err")
    check "interactive caller survives $action" source_alive
    history_entry=$(<"$HOME/history-entry")
    if [[ $action == npm-failure ]]; then
        check 'failed npm command is still in caller history' test "${${history_entry##*$'\n'}##[[:space:]]#}" = 'npm run build'
    else
        check "$action leaves caller history unchanged" test "${history_entry##[[:space:]]#}" = 'caller sentinel'
    fi
done

print -r -- "$total checks, $failures failures"
(( failures == 0 ))
