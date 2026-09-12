# Local agent reproduction

`sh startup.sh STATE_DIR INCOMING MODE` prints the selected socket path.
MODE is `ssh` or `local`. The stable link is STATE_DIR/agent.sock. Local mode
prints INCOMING and does not change state. With no responsive socket in SSH
mode, print INCOMING without changing the shared link. Resolve incoming links
before selecting them so the shared link cannot point back to itself.

`node probe.cjs SOCKET` is the isolated substitute for ssh-add. Status 0 means
identities are present. Status 1 means the agent responds with no identities.
Status 2 means it is unavailable. It has a bounded timeout. Test servers send
one ASCII digit. No real agent, credentials, network, or service is required.
