# HWLINK SETUP GUIDE

## Discord Account Linking for Horizon Worlds

HWLink allows players to verify their Discord accounts in your Horizon World, enabling exclusive benefits, rewards, and community integration.
Includes a modern, customizable UI with smooth animations and extensive theming options.

**Version 1.1.0** - Now with full multi-player support using Asset Pool Gizmo!

---

## TLDR: QUICK SETUP (5 MINUTES)

### DISCORD SETUP:
1. **Invite bot** to your server via [https://hwlink.io/invite](https://hwlink.io/invite) → Wait (up to 1 hour) for `/hwl` command to appear.
2. **Run** `/hwl setup` → Enter world name (lowercase, no spaces) → Get Secret Key via DM.
3. **Save** your `World_Name` and `Secret_Key` - you'll need them in Horizon Worlds.

### HORIZON WORLDS SETUP:
1. **Copy Scripts** - Drag `HWLink.ts` and `HWLinkServer.ts` into your world's scripts folder: `C:\Users\[YOURNAME]\AppData\LocalLow\Meta\Horizon Worlds\[YOURWORLDID]`.
2. **Create variable group** - Player Persistent: "DiscordLink" with variable "discordLinked" (Number, default 0).
3. **Create Server Manager** - Empty Object → Attach `HWLinkServer.ts` (Execution Mode: Default) → Set `World_Name` and `Secret_Key`.
4. **Create UI Panel** - UIGizmo → Attach `HWLink.ts` (Execution Mode: Local) → Configure appearance.
5. **Create Asset Template** - Select UIGizmo → Right-click → "Create Asset Template" → Name it "HWLinkUI_Template".
6. **Add Asset Pool Gizmo** - Build > Gizmos > Asset Pool → Assign your template → Enable "Auto-Assign".
7. **Delete Original UIGizmo** - Remove the original UIGizmo (the Asset Pool will spawn copies).
8. **Publish and test!**

### PLAYERS USE:
`/hwl link` → Enter username → Get code → Enter code in-world.

---

## PART 1: DISCORD BOT SETUP

### 1. INVITE THE DISCORD BOT
Use the invite link to add the bot to your server:
[https://hwlink.io/invite](https://hwlink.io/invite)

Accept the requested scopes (bot, applications.commands) and permissions.
The bot should appear online in your server.

> **Note:** Global slash commands may take up to 1 hour to appear after first invite. If you don't see `/hwl`, wait a bit or contact us.

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
  - Permanently deletes that world's configuration, secret keys, and issuance history.

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
- `HWLink.ts` (Local UI script)
- `HWLinkServer.ts` (Default verification script)

### OPTIONAL FILES:
- `OwnershipBootstrap.ts` (Only needed if you have a GameManager entity that needs ownership transfer)

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

### STEP 3: CREATE THE UI PANEL
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

### STEP 4: SET UP ASSET POOL GIZMO (REQUIRED FOR MULTI-PLAYER)
The Asset Pool Gizmo automatically creates a copy of the UI panel for each player. This is **required** for multi-player support.

**Why is this needed?**
- Local Mode UI scripts only work for the player who owns the entity.
- Without the Asset Pool, only one player would see the UI panel at a time.
- The Asset Pool creates a private UI instance for each player automatically.

**Setup Instructions:**

1. **Set Maximum Player Count:**
   - Navigate to **Player Settings** in the top left menu.
   - Adjust the **Maximum Player Count** slider for your world's expected max players.
   - The Asset Pool will create this many UI panel copies.

2. **Create Asset Template from your UIGizmo:**
   - Select your `HWLinkUI` UIGizmo in the Hierarchy.
   - Right-click and select **"Create Asset Template"** (or use Build > Assets > Create Template).
   - Name it: `HWLinkUI_Template`
   - The template will appear in your Asset Library.

3. **Add the Asset Pool Gizmo:**
   - Go to **Build > Gizmos** from the menu bar.
   - Search for "Asset Pool" and drag it into your scene.
   - Name it: `HWLinkUI_Pool`

4. **Configure the Asset Pool Gizmo:**
   - Select the Asset Pool Gizmo.
   - In the Properties panel:
     - **Asset Reference:** Drag your `HWLinkUI_Template` from the Asset Library into this field.
     - **Auto-Assign:** Enable this checkbox (IMPORTANT!)
   - The gizmo will automatically create child prefabs equal to the Maximum Player Count.

5. **Delete the Original UIGizmo:**
   - After creating the Asset Template, delete the original `HWLinkUI` UIGizmo from your scene.
   - The Asset Pool will spawn copies from the template automatically.

**How it works:**
- When a player enters your world, they automatically receive their own UI panel from the pool.
- Each player's panel is private - they can only see and interact with their own.
- The codes they enter are only visible to them.
- All panels communicate with the single `HWLinkServer` for verification.

### STEP 5: (OPTIONAL) SET UP OWNERSHIP BOOTSTRAP
This step is **only needed** if you have other entities (like a GameManager) that need ownership transferred to players.

> **Note:** The UI Panel ownership is now handled automatically by the Asset Pool Gizmo. You do NOT need to configure uiPanel in OwnershipBootstrap.

1. Create a new Empty Object (or use an existing entity).
2. Attach the script: `OwnershipBootstrap.ts`
3. Make sure it runs in **Execution Mode Default**.
4. Configure properties:
   - **gameManager (optional):** Drag your GameManager entity here if you have one.

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
4. **Test multi-player:**
   - Have a friend join your world.
   - Both of you should see your own UI panels.
   - Each player can enter their own code independently.

---

## UPGRADING FROM PREVIOUS VERSION

If you're upgrading from HWLink v1.0.x (before Asset Pool support), follow these steps:

### STEP 1: UPDATE SCRIPT FILES
1. Download the latest `OwnershipBootstrap.ts` from this repository.
2. Replace your existing `OwnershipBootstrap.ts` file.
   - The new version removes the `uiPanel` property.
   - **Note:** `HWLink.ts` and `HWLinkServer.ts` are unchanged.

### STEP 2: CREATE ASSET TEMPLATE
1. Select your existing `HWLinkUI` UIGizmo in the Hierarchy.
2. Right-click → **"Create Asset Template"**.
3. Name it: `HWLinkUI_Template`

### STEP 3: ADD ASSET POOL GIZMO
1. Go to **Build > Gizmos** → Search for "Asset Pool".
2. Drag the Asset Pool Gizmo into your scene.
3. Configure it:
   - **Asset Reference:** Assign your `HWLinkUI_Template`.
   - **Auto-Assign:** Enable this checkbox.

### STEP 4: UPDATE PLAYER SETTINGS
1. Navigate to **Player Settings** in the top left menu.
2. Set **Maximum Player Count** to your expected max players.

### STEP 5: CLEAN UP
1. Delete the original `HWLinkUI` UIGizmo from your scene.
2. If using OwnershipBootstrap:
   - Remove the `uiPanel` reference (the property no longer exists).
   - Only configure `gameManager` if you have one.

### STEP 6: TEST
1. Compile and preview your world.
2. Test with multiple players to verify each sees their own UI panel.

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
   - Open the file `HWLinkServer.ts` in a code editor.
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
- **SOLUTION:** You forgot to configure the server script properties. Select the HWLinkServer entity → Set `World_Name` and `Secret_Key`.

**PROBLEM: UI shows "running on server" warning**
- **SOLUTION:** Make sure UIGizmo script is set to "Local" execution mode, not "Default".

**PROBLEM: UI only shows for one player / Multiple players can't use the panel**
- **SOLUTION:** You need to set up the Asset Pool Gizmo. See STEP 4 in Part 2.
  - Ensure you created an Asset Template from your UIGizmo.
  - Ensure the Asset Pool Gizmo has your template assigned.
  - Ensure "Auto-Assign" is enabled on the Asset Pool Gizmo.
  - Ensure Maximum Player Count is set in Player Settings.
  - Delete the original UIGizmo after setting up the Asset Pool.

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

**PROBLEM: Asset Pool not spawning UI panels**
- **SOLUTION:**
  - Check that Maximum Player Count is set in Player Settings.
  - Verify the Asset Template is properly assigned to the Asset Pool Gizmo.
  - Make sure "Auto-Assign" is enabled.
  - Check console for any spawning errors.

**PROBLEM: Players see each other's codes**
- **SOLUTION:** This should not happen with proper setup. Verify:
  - `HWLink.ts` is running in Local Mode (not Default).
  - Each player has their own UI from the Asset Pool.
  - You deleted the original UIGizmo after creating the Asset Template.

---

## SUPPORT & RESOURCES

For additional help:
- Test each component individually before combining.
- Check the console for error messages.
- Contact us on Discord
