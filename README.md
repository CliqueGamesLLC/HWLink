# HWLink

### Discord Account Linking for Horizon Worlds

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/CliqueGamesLLC/HWLink/releases)
[![Wiki](https://img.shields.io/badge/docs-wiki-green.svg)](https://github.com/CliqueGamesLLC/HWLink/wiki)

---
<img width="1080" height="400" alt="HWLinkLand" src="https://github.com/user-attachments/assets/13fb405b-4e44-4344-997a-27772db81b1c" />

## Turn Horizon Players into Discord Members

HWLink bridges your Horizon World with your Discord Community. Players verify their Discord accounts in-world and unlock exclusive rewards, creating a rewarding connection between where your community hangs out and where they play.

**Used by creators to:**
- 🎁 **Reward Discord members** with exclusive in-game items
- 🔐 **Gate content** to verified players only
- 📊 **Track engagement** between Discord and your world
- 🏆 **Build loyalty** with VIP perks for active members

---

## How It Works

1. Player runs `/hwl link` in your Discord
2. Bot sends them a private 6 character code
3. Player enters code in your world's UI panel
4. Instantly verified & rewards granted automatically

**No external servers. No API calls. Codes validate locally using cryptography.**

---

## Quick Start

### Discord (2 min)
```
1. Invite bot     > hwlink.io/invite
2. Run command    > /hwl setup
3. Save your Secret Key from the DM
```

### Horizon Worlds (3 min)
```
1. Copy scripts   > HWLink.ts + HWLinkServer.ts
2. Create server  > Empty Object + HWLinkServer.ts (Default mode)
3. Create UI      > UIGizmo + HWLink.ts (Local mode)
4. Asset Pool     > Right click UI > Create Asset > Add Asset Pool Gizmo
5. Test!          > /hwl link in Discord > Enter code in-world
```

**That's it.** Full multiplayer support included.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multiplayer Ready** | Every player gets their own private UI panel |
| **Offline Validation** | No external connection required, codes validate cryptographically |
| **Custom Rewards** | Grant items, spawn assets, or trigger custom logic |
| **Beautiful UI** | Modern design with smooth animations |
| **Fully Customizable** | Colors, text, theming options |
| **Persistent** | Verification status saved per player |

---

## Documentation

📚 **[Full Wiki Documentation](https://github.com/CliqueGamesLLC/HWLink/wiki)**

| Guide | Description |
|-------|-------------|
| [Quick Start](https://github.com/CliqueGamesLLC/HWLink/wiki/Quick-Start) | 5 minute setup guide |
| [Discord Bot Setup](https://github.com/CliqueGamesLLC/HWLink/wiki/Discord-Bot-Setup) | Bot configuration & commands |
| [Horizon Worlds Setup](https://github.com/CliqueGamesLLC/HWLink/wiki/Horizon-Worlds-Setup) | Complete world setup |
| [Asset Pool Gizmo](https://github.com/CliqueGamesLLC/HWLink/wiki/Asset-Pool-Gizmo) | Multiplayer support |
| [Rewards System](https://github.com/CliqueGamesLLC/HWLink/wiki/Rewards-System) | Items, assets & custom rewards |
| [Upgrading](https://github.com/CliqueGamesLLC/HWLink/wiki/Upgrading) | Migrate from v1.0.x |
| [Troubleshooting](https://github.com/CliqueGamesLLC/HWLink/wiki/Troubleshooting) | Common issues & solutions |

---

## Files

| File | Purpose | Execution Mode |
|------|---------|----------------|
| `HWLink.ts` | Player UI panel | Local |
| `HWLinkServer.ts` | Code validation & rewards | Default |
| `OwnershipBootstrap.ts` | Optional, for GameManager only | Default |

---

## Credits

Special thanks to the community:

- **[The-Bake](https://instagram.com/The_Bake_VR)** -- Identifying multi-player issues
- **[Meta.Jesus / Illuminated Studios](https://illuminatedstudios.io/)** -- Implementation feedback

---

## Support

- 📖 [Wiki Documentation](https://github.com/CliqueGamesLLC/HWLink/wiki)
- 🐛 [Report Issues](https://github.com/CliqueGamesLLC/HWLink/issues)
- 💬 Contact us on Discord

---

<p align="center">
  <b>Connect your community. Reward your players. Grow your world.</b>
</p>


