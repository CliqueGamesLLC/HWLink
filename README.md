# HWLINK SETUP GUIDE

## Discord Account Linking for Horizon Worlds

HWLink allows players to verify their Discord accounts in your Horizon World, enabling exclusive benefits, rewards, and community integration.
Includes a modern, customizable UI with smooth animations and extensive theming options.

---

## TLDR: QUICK SETUP (5 MINUTES)

### DISCORD SETUP:
1. **Invite bot** to your server via [https://clique.games/hwlink](https://clique.games/hwlink) → Wait (up to 1 hour) for `/hwl` command to appear.
2. **Run** `/hwl setup` → Enter world name (lowercase, no spaces) → Get Secret Key via DM.
3. **Save** your `World_Name` and `Secret_Key` - you'll need them in Horizon Worlds.

### HORIZON WORLDS SETUP:
1. **Drag and Drop** `HWLink.ts`, `HWLinkServer.ts`, (optionally `OwnershipBootstrap.ts`), into your `C:\Users\[YOURNAME]\AppData\LocalLow\Meta\Horizon Worlds\[YOURWORLDID]`.
2. **Create variable group**:
   - **Player Persistent**: "DiscordLink" with variable "discordLinked" (Number, default 0).
3. **Create Empty Object** → Attach `HWLinkServer.ts` (Execution Mode: Default) → Set `World_Name` and `Secret_Key` that you got from the Discord Bot.
4. **Create UIGizmo** → Attach `HWLink.ts` (Execution Mode: Local) → Set `discordLinkText` to your Discord Server URL.
5. **Use Existing (or provided) Ownership Bootstrap** → Assign `HWLink.ts` to players on launch.
6. **Publish and test!**

### PLAYERS USE:
`/hwl link` → Enter username → Get code → Enter code in-world.

---

## PART 1: DISCORD BOT SETUP

### 1. INVITE THE DISCORD BOT
Use the invite link to add the bot to your server:
[https://clique.games/hwlink](https://clique.games/hwlink)

Accept the requested scopes (bot, applications.commands) and permissions.
The bot should appear online in your server.

> **Note:** Global slash commands may take up to 1 hour to appear after first invite. If you don’t see `/hwl`, wait a bit or contact us.

### 2. SET UP YOUR WORLD IN DISCORD (Admins only)

**Who can run setup:**
Members with the Discord "Administrator" permission.

In any channel, run:
```
/hwl setup
```

A form will open asking for:
- **World Name** (required): lowercase letters only (a–z), no spaces/numbers/symbols.
  - Examples: "slaparena", "lotters", "myworld"
- **Friendly Label** (optional): a human-readable name shown in embeds.

**After submitting:**
The bot creates the world configuration for your Discord server.
You will receive a DM containing:
- **Secret Key** (64-character hex string) — keep this private.
- **World Name** — must match exactly in your world setup.
- A download link to these scripts.

If you did not receive a DM, enable "Allow direct messages from server members" and use:
```
/hwl reveal-secret-key worldname:<your_world_name>
```

**Where to use these values:**
You will paste `World_Name` and `Secret_Key` into the Horizon Worlds setup below (see Part 2, Step 2).

### 3. HOW PLAYERS GET A CODE
Players run:
```
/hwl link
```
The bot will prompt them to press "Enter Username", then enter their **EXACT** in‑game username.
Case, spaces, and numbers must match exactly (e.g., "Cool Guy", not "CoolGuy").

The bot sends their 6-character verification code via DM.

**Properties of codes:**
- Each code is intended for one-time use in-world (the world enforces claims).
- Players can re-run `/hwl link` anytime to get their code again.
- DMs must be enabled to receive the code. If DMs are blocked, the bot will instruct users to enable DMs and try again.

**Rate limits:**
- Per user: up to 3 code requests every 15 minutes.
- Per in‑game username: up to 10 code requests per hour.
- If rate limited, wait for the specified time and try again.

### 4. ADMIN COMMANDS (Manage your world)

- `/hwl list`
  - Lists all worlds configured for this Discord server.

- `/hwl reveal-secret-key worldname:<your_world_name>`
  - Shows the current Secret Key (ephemeral) — keep it secure.

- `/hwl rotate-secret-key worldname:<your_world_name>`
  - Generates a new Secret Key and DMs it to the admin.
  - **Overlap window:** 120 minutes — both old and new keys generate valid codes during this time.
  - **Action required:** Update `Secret_Key` in your Horizon world during the overlap window.

- `/hwl delete worldname:<your_world_name>`
  - Permanently deletes that world’s configuration, secret keys, and issuance history.

- `/hwl reset`
  - Permanently deletes ALL worlds and data for this Discord server (use with extreme caution).

### 5. DISCORD TROUBLESHOOTING

- **"No Horizon World is configured for this server"**
  - Run `/hwl setup` first (Admins only).

- **Slash command not visible**
  - Wait up to 1 hour after inviting the bot; then try again or contact the host.

- **DM not received for Secret Key or player code**
  - Enable DMs from server members and re-run the command.

- **Code not working in-world**
  - Ensure the username matches EXACTLY.
  - Ensure `World_Name` and `Secret_Key` in your world match the values from Discord.
  - If you recently rotated the Secret Key, make sure the world has been updated within the 120-minute overlap window.

---

## PART 2: HORIZON WORLDS EDITOR SETUP

### REQUIRED FILES (included in this package):
- `scripts/HWLink.ts` (Local UI script)
- `scripts/HWLinkServer.ts` (Default verification script)

### OPTIONAL FILES (Use your own / copy ours)
- `scripts/OwnershipBootstrap.ts` (Default ownership transfer script)

### STEP 1: CREATE PERSISTENT VARIABLE GROUP
Variable groups store player data. Create this in the Editor:

**PLAYER PERSISTENT VARIABLE GROUP:**
- **Name:** `DiscordLink`
- **Type:** Player Persistent Variable Group
- **Add variable:**
  - **Name:** `discordLinked`
  - **Type:** Number
  - **Default value:** 0
  - **Description:** 0 = not linked, 1 = linked

### STEP 2: SET UP THE SERVER MANAGER
Create an entity to handle server-side verification:
1. Create a new empty object in your world.
2. Name it: `HWLinkServer` (or any name you prefer).
3. Attach the script: `HWLinkServer.ts`
   - In the Properties panel, find the "Scripts" section.
   - Click "Add Script" → Select "HWLinkServer".
4. Make sure `HWLinkServer` is running in **Execution Mode Default**, not Local.
5. Configure the script properties:

** IMPORTANT: You must set these two properties! **

- **a) World_Name:**
  - Enter your world's unique identifier.
  - **MUST** be lowercase letters only.
  - Example: "myawesomeworld" or "racingworld"
  - This **MUST** match exactly what you configured in the Discord bot.

- **b) Secret_Key:**
  - Enter the 64-character hex string from your Discord bot setup.
  - This is your `Secret_Key` - a secret key that validates codes.
  - Example: `8d51ff7ae9ceee41b23e6b14913bd71e13dcc9a3477e34ae7dee25466de7b73b`
  - **Keep this secret!** Don't share it publicly.

- **c) Reward_Asset (Optional):**
  - Drag and drop an asset here to spawn it as a reward upon verification.

### STEP 3: SET UP THE OWNERSHIP BOOTSTRAP
This transfers UI ownership to players when they join:
1. Use an existing entity from your world. Skip to Step 4 if so.
   - OR create a new Empty Object.
2. Attach the script: `OwnershipBootstrap.ts`
   - Click "Add Script" → Select "OwnershipBootstrap".
3. Make sure `OwnershipBootstrap` is running in **Execution Mode Default**, not Local.
4. You'll configure its properties in Step 5 (after creating the UI).

### STEP 4: CREATE THE UI PANEL
Create the user interface that players will interact with:
1. Create a UIGizmo entity in your world.
2. Name it: `HWLinkUI` (or any name you prefer).
3. Attach the UI script: `HWLink.ts`
   - Click "Add Script" → Select "HWLink.ts".
4. In the Properties panel, you can customize the UI:
   - `welcomeHeaderText`: Title text.
   - `welcomeSubheaderText`: Subtitle text.
   - `discordLinkText`: URL to your Discord Server (e.g., "hwlink.io/myworld").
   - `discordCommandText`: Channel where users should type Discord Commands.
   - `successMessageText`: What is shown after valid verification. 
   - `backgroundColor`: Background color.
   - `textColor`: Text color.
   - `accentColor`: Main theme color.
5. Make sure `HWLink.ts` is running in **Local Mode**, not Default.
6. Position the UIGizmo in your world:
   - Place it where players can easily interact with it.
   - Typical placement: near spawn point or in a dedicated verification area.
   - Scale and rotate as needed.

### STEP 5: CONNECT OWNERSHIP BOOTSTRAP
Link the UI to your own existing ownership transfer system or our provided template:
1. Select the entity with your own Bootstrap script OR the provided `OwnershipBootstrap` script (Created in Step 3).
2. In the `OwnershipBootstrap` script properties:
   - **a) uiPanel:** Drag and drop your "HWLinkUI" UIGizmo entity here.
   - **b) gameManager (optional):** Leave empty unless you have a separate GameManager entity. Only needed if you have other local UI systems.

### STEP 6: TEST YOUR SETUP
1. Compile all scripts and check for errors.
2. **Test in-world:**
   - Preview your world in editor.
   - Invite our bot to your Discord and type: `/hwl setup` then `/hwl link`
   - Copy the code the bot gives you.
   - Interact with the UI in Horizon Worlds.
   - Enter the code using the on-screen keyboard.
   - Click "Submit".
   - You should see a success message!
3. **Verify persistence:**
   - Exit and re-enter your world.
   - The UI should remember you're already verified.

---

## PART 3: OPTIONAL FEATURES

### REWARD SYSTEM 
You can grant in-world items as rewards:

1. **Create items in Desktop Editor (Some features Partner Only):**
   - Open Systems menu → Commerce panel.
   - Click "Create Item".
   - Set name, description, and type (Durable/Consumable).
   - Set price to 0 for free rewards.
   - Hover over the item and click "Copy SKU".

2. **Configure rewards in `HWLinkServer.ts`:**
   - Open the file `scripts/HWLinkServer.ts` in a code editor.
   - Find line: `const ENABLE_REWARDS = false;`
   - Change to: `const ENABLE_REWARDS = true;`
   - Find line: `const REWARD_ITEMS: RewardItem[] = [`
   - Add your items:
     ```typescript
     { sku: "your_item_sku_here", quantity: 100 },
     ```
   - Example configuration:
     ```typescript
     const REWARD_ITEMS: RewardItem[] = [
       { sku: "welcome_badge_sku", quantity: 1 },
       { sku: "gold_coins_sku", quantity: 100 },
     ];
     ```
   - Save and republish your world.

3. **(Optional) Use Reward Asset:**
   - Instead of (or in addition to) commerce items, you can spawn an asset.
   - Select the `HWLinkServer` entity.
   - Drag an asset into the `Reward_Asset` property slot.
   - The asset will spawn near the player upon verification.

4. **(Advanced) Custom Code Rewards:**
   - You can add any custom logic (teleporting players, unlocking doors, etc.) by editing `HWLinkServer.ts`.
   - Look for the function `grantCustomReward(player)` near the bottom of the file.
   - We've included commented-out examples for:
     - Setting a persistent variable (e.g., "HasVipAccess").
     - Teleporting the player to a specific location.

5. **(Advanced) Debug Reset:**
   - The server supports resetting a player's verification status (useful for testing).
   - Send a Network Event: `HWLink:DebugResetPlayer` with payload `{ playerId: number }`.
   - This will reset their persistent variable to 0.

---

## TROUBLESHOOTING

**PROBLEM: "Property 'World_Name' must be set in the editor"**
- **SOLUTION:** You forgot to configure the server script properties. Select the DiscordLinkServer entity → Set `World_Name` and `Secret_Key`.

**PROBLEM: UI shows "running on server" warning**
- **SOLUTION:** Make sure UIGizmo is set to "Client (Local)", not "Server". Verify `OwnershipBootstrap` is properly configured with uiPanel reference.

**PROBLEM: Code validation always fails**
- **SOLUTION:**
  - Verify `World_Name` matches exactly (case-sensitive on Discord side).
  - Verify `Secret_Key` is correct (64-character hex string).
  - Make sure Discord bot is using the same algorithm version.

**PROBLEM: Player verification doesn't persist**
- **SOLUTION:**
  - Check that variable groups are created properly.
  - Verify "DiscordLink:discordLinked" player variable exists.
  - Check console for storage errors.

---

## SUPPORT & RESOURCES

For additional help:
- Test each component individually before combining.
- Contact us on Discord
