# CCM — Claude Code Profile Manager

Multi-profile credential switching for Claude Code and CLI. Manage multiple Claude accounts (e.g. work + personal) with isolated sessions and one-key credential swapping.

```
╭─ CCM — Profile Manager ───────────────────────────────╮
│                                                         │
│  ● Optiply              joaoraposo@optiply.com          │
│    Logged in · Last used 2 min ago                      │
│                                                         │
│  ○ NyxLabs              jay@nyxlabs.dev                 │
│    Not logged in                                        │
│                                                         │
╰─────────────────────────────────────────────────────────╯

 [n] new  [a] activate  [l] launch  [Enter] open  [e] edit  [d] delete  [q] quit
```

## Why

Claude Code uses global auth (macOS Keychain + `~/.claude.json`). If you have two accounts (e.g. work Max plan + personal), you can't run both without manually switching. CCM fixes this:

- **Credential isolation** — Each profile backs up its Keychain credential. Switching is instant.
- **Config isolation** — Each profile gets its own `HOME`, so Claude Code settings, history, and project data stay separate.
- **One-key activation** — Press `a` to swap credentials for any CLI tool, or `l` to launch Claude Code directly.

## Requirements

- **macOS** (uses Keychain for credential storage)
- **Node.js >= 20**
- **Claude Code** installed (`claude` CLI available)

## Install

```bash
# Clone and build
git clone https://github.com/jay-optiply/ccm.git ~/dev/ccm
cd ~/dev/ccm
npm install
npm run build
npm link

# Or use the install script
curl -fsSL https://raw.githubusercontent.com/jay-optiply/ccm/main/install.sh | bash
```

## Quick Start

```bash
# 1. Open the TUI
ccm

# 2. Press [n] to create a profile (e.g. "Optiply", joao@optiply.com)
# 3. Create a second profile (e.g. "NyxLabs", jay@nyxlabs.dev)

# 4. Login each profile
ccm login Optiply      # completes OAuth in browser
ccm login NyxLabs      # completes OAuth for second account

# 5. Activate a profile for CLI use
ccm use Optiply        # swaps Keychain credential
claude                 # now runs as Optiply account

# 6. Or launch directly from TUI
ccm                    # open TUI → select profile → press [l]
```

## Usage

### TUI Mode

```bash
ccm                    # open interactive TUI
```

| Key | Action |
|-----|--------|
| `j`/`k` or arrows | Navigate profile list |
| `Enter` | Open profile detail |
| `a` | Activate — swap credential for CLI use |
| `l` | Launch — start Claude Code with profile |
| `n` | New profile |
| `e` | Edit profile |
| `d` | Delete (with confirmation) |
| `s` | Settings |
| `q` | Quit |
| `Esc` | Go back |

### CLI Commands

```bash
ccm                        # Open TUI
ccm launch [name]          # Launch Claude Code with profile
ccm use <name>             # Activate profile (swap credential for any CLI tool)
ccm whoami                 # Show active profile
ccm login <name>           # Run `claude auth login` for profile
ccm list                   # List all profiles
ccm status                 # Show credential backup status
ccm add                    # Add profile via TUI
ccm --theme <name>         # Use theme: midnight, aura, minimal
```

## Shell Prompt Integration

Show the active profile in your terminal prompt.

### Oh My Zsh / vanilla zsh

Add to `~/.zshrc`:

```zsh
ccm_prompt_info() {
  local f="$HOME/.ccm/active.json"
  [[ -f "$f" ]] || return
  local name
  name=$(python3 -c "import json; print(json.load(open('$f'))['profileName'])" 2>/dev/null) || return
  echo "%F{magenta}[$name]%f "
}
PROMPT='$(ccm_prompt_info)'"$PROMPT"
```

Result: `[Optiply] ➜ ~ `

### Starship

Add to `~/.config/starship.toml`:

```toml
[custom.ccm]
command = "ccm whoami 2>/dev/null"
when = "test -f ~/.ccm/active.json"
format = "\\[[$output](purple)\\] "
```

### Bash

Add to `~/.bashrc`:

```bash
ccm_prompt() {
  local f="$HOME/.ccm/active.json"
  [[ -f "$f" ]] || return
  local name
  name=$(python3 -c "import json; print(json.load(open('$f'))['profileName'])" 2>/dev/null) || return
  echo "[$name] "
}
PS1='$(ccm_prompt)'"$PS1"
```

## How It Works

### Credential Isolation

Each profile stores a backup of the Keychain credential at `~/.ccm/profiles/<id>/credential.json`. When you activate or launch a profile, CCM writes that credential into the macOS Keychain (service: `Claude Code-credentials`).

### Config Isolation

Each profile gets its own HOME-like directory at `~/.ccm/profiles/<id>/` containing:
- `.claude.json` — Claude Code config
- `.claude/` — Claude Code data directory
- `Library/Keychains` → symlink to real Keychain (so macOS auth works)

Launching Claude Code with `HOME=~/.ccm/profiles/<id>/` gives it a fully isolated environment.

### Data Layout

```
~/.ccm/
├── config.json              # Theme, default profile, directory mappings
├── active.json              # Currently active profile (for shell prompt)
├── profiles.json            # Profile metadata
└── profiles/
    └── <uuid>/
        ├── credential.json  # Backed-up Keychain credential (mode 0600)
        ├── .claude.json     # Isolated Claude Code config
        ├── .claude/         # Isolated Claude Code data
        └── Library/
            └── Keychains → ~/Library/Keychains  # Symlink
```

## Themes

Three built-in presets, switchable via settings screen or `--theme` flag:

- **midnight** — Indigo/slate (default)
- **aura** — Violet/pink
- **minimal** — Monochrome

## Tech Stack

- [Ink](https://github.com/vadimdemedes/ink) v6 — React for terminals
- [React](https://react.dev) 19
- TypeScript
- [meow](https://github.com/sindresorhus/meow) — CLI argument parsing
- macOS `security` CLI — Keychain integration

## License

MIT
