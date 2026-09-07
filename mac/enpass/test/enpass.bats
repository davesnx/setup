#!/usr/bin/env bats

setup() {
  project_root=$(CDPATH='' cd "$BATS_TEST_DIRNAME/.." && pwd)
  test_root=$(mktemp -d "$BATS_TEST_TMPDIR/enpass.XXXXXX")
  mkdir -p "$test_root/vault"
  : >"$test_root/vault/vault.enpassdb"
  : >"$test_root/vault/vault.json"

  export ENPASS_CLI_BIN="$project_root/test/fake-enpass-cli"
  export ENPASS_VAULT="$test_root/vault"
  export ENP_PIN="fixture-pin"
  export FAKE_ENPASS_FIXTURES="$project_root/test/fixtures"
  cli="$project_root/bin/enpass"
}

teardown() {
  rm -rf "$test_root"
}

@test "list prints sorted login and password titles" {
  run "$cli" list

  [ "$status" -eq 0 ]
  [ "$output" = $'API Token\nDuplicate\nDuplicate\nGitHub\nGitHub Enterprise\nNo Password' ]
}

@test "get returns only the exact title password" {
  run "$cli" get GitHub

  [ "$status" -eq 0 ]
  [ "$output" = "github-secret" ]
}

@test "get accepts an unquoted multi-word title" {
  run "$cli" get GitHub Enterprise

  [ "$status" -eq 0 ]
  [ "$output" = "enterprise-secret" ]
}

@test "get suggests the correct title capitalization" {
  run "$cli" get github

  [ "$status" -eq 66 ]
  [[ "$output" == *'no credential has the exact title "github"'* ]]
  [[ "$output" == *"GitHub"* ]]
  [[ "$output" != *"github-secret"* ]]
}

@test "get suggests partial title matches" {
  run "$cli" get Git

  [ "$status" -eq 66 ]
  [[ "$output" == *"GitHub"* ]]
  [[ "$output" == *"GitHub Enterprise"* ]]
  [[ "$output" != *"secret"* ]]
}

@test "get rejects duplicate exact titles" {
  run "$cli" get Duplicate

  [ "$status" -eq 65 ]
  [[ "$output" == *'2 credentials have the exact title "Duplicate"'* ]]
}

@test "get reports a missing password field" {
  run "$cli" get "No Password"

  [ "$status" -eq 65 ]
  [[ "$output" == *'has no non-empty password field'* ]]
}

@test "unlock failure explains a Keychain PIN mismatch" {
  export FAKE_ENPASS_FAILURE=pin-mismatch

  run "$cli" list

  [ "$status" -eq 70 ]
  [[ "$output" == *"Keychain PIN does not match"* ]]
}
