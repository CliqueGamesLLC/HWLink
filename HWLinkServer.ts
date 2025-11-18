import * as hz from "horizon/core";
import { NetworkEvent } from "horizon/core";

// ============================================================================
// HW-LINK - SERVER MANAGER
// ============================================================================
// I handle the authoritative bits: verifying codes, remembering who is linked,
// preventing code re-use across all instances, and sending clear responses
// back to the client UI. Plug this into a Server entity, set the two props
// (`World_Name`, `Secret_Key`) in the editor, and you’re good to go.
//
// Heads up: I use component props at runtime, not the example constants below.
// Those are here purely to show expected formats.
//
const WORLD_NAME = "slaparena"; // example world name (lowercase recommended)
const PEPPER = "8d51ff7ae9ceee41b23e6b14913bd71e13dcc9a3477e34ae7dee25466de7b73b"; // example 64-char hex Secret_Key
const CODE_LENGTH = 6;
const CHARSET = '123456789ABCDEFGHJKMNPQRSTUVWXYZ';

const DISCORD_LINK_PPV_KEY = "DiscordLink:discordLinked"; // Number: 0 = not linked, 1 = linked
const USED_CODES_WORLD_KEY = "UsedCodes:usedCodes"; // Object: code → { username, timestamp }

type UsedCodesState = Record<string, {
    username: string;
    timestamp: number;
}>;

// ============================================================================
// NETWORK EVENTS
// ============================================================================
// These must match the client names/payloads 1:1.

// Client → Server: Ask me to verify a code
const VerifyCodeRequestEvent = new NetworkEvent<{
    code: string;
    username: string;
    playerId: number;
}>("HWLink:VerifyCodeRequest");

// Server → Client: I send back the verification result
const VerifyCodeResponseEvent = new NetworkEvent<{
    success: boolean;
    message: string;
    alreadyLinked?: boolean;
    codeAlreadyUsed?: boolean;
}>("HWLink:VerifyCodeResponse");

// Client → Server: Ask if this player is already linked
const CheckLinkStatusRequestEvent = new NetworkEvent<{
    playerId: number;
}>("HWLink:CheckLinkStatusRequest");

// Server → Client: I report the player’s link status
const CheckLinkStatusResponseEvent = new NetworkEvent<{
    isLinked: boolean;
    playerId: number;
}>("HWLink:CheckLinkStatusResponse");

// Debug: Client → Server: Reset my verification status
const DebugResetPlayerEvent = new NetworkEvent<{
    playerId: number;
}>("HWLink:DebugResetPlayer");

// Debug: Client → Server: Clear all used codes (careful)
const DebugClearCodesEvent = new NetworkEvent<{
    playerId: number;
}>("HWLink:DebugClearCodes");

// Debug: Server → Client: I confirm the debug action result
const DebugActionResponseEvent = new NetworkEvent<{
    success: boolean;
    message: string;
    playerId: number;
}>("HWLink:DebugActionResponse");

// ============================================================================
// SERVER-SIDE VERIFICATION MANAGER
// ============================================================================

class HWLinkServer extends hz.Component<typeof HWLinkServer> {
    static propsDefinition = {
        World_Name: {
            type: hz.PropTypes.String,
            default: "",
            description: "Unique identifier for your world (lowercase letters only, must match Discord bot configuration)"
        },
        Secret_Key: {
            type: hz.PropTypes.String,
            default: "",
            description: "Secret_Key from your Discord bot setup (64-character hex string)"
        }
    };

    private usedCodesCache: UsedCodesState | null = null;

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    start() {
        console.log("[HWLinkServer] Starting server-side verification manager...");
        
        // I sanity-check the required props so you get helpful errors
        if (!this.props.World_Name || this.props.World_Name.trim() === "") {
            console.error("[HWLinkServer] ERROR: Property 'World_Name' must be set in the editor.");
            console.error("[HWLinkServer] INSTRUCTIONS: Select this entity in the Hierarchy, find the 'Scripts' section in the Properties panel, and set the 'World_Name' field to your world's unique identifier (lowercase letters only).");
            return; // Stop initialization if required property is missing
        }
        
        if (!this.props.Secret_Key || this.props.Secret_Key.trim() === "") {
            console.error("[HWLinkServer] ERROR: Property 'Secret_Key' must be set in the editor.");
            console.error("[HWLinkServer] INSTRUCTIONS: Select this entity in the Hierarchy, find the 'Scripts' section in the Properties panel, and set the 'Secret_Key' field to your Discord bot's Secret_Key (64-character hex string from bot setup).");
            return; // Stop initialization if required property is missing
        }
        
        console.log(`[HWLinkServer] Configured for world: ${this.props.World_Name}`);
        
        void this.loadUsedCodes();

        // I listen for verification requests from clients
        this.connectNetworkBroadcastEvent(VerifyCodeRequestEvent, (data: { code: string; username: string; playerId: number; }) => {
            void this.handleVerifyRequest(data);
        });

        // I respond to link status checks on demand
        this.connectNetworkBroadcastEvent(CheckLinkStatusRequestEvent, (data: { playerId: number; }) => {
            void this.handleCheckLinkStatus(data);
        });

        // I expose a couple of debug helpers (see handlers below)
        this.connectNetworkBroadcastEvent(DebugResetPlayerEvent, (data: { playerId: number; }) => {
            void this.handleDebugResetPlayer(data);
        });

        this.connectNetworkBroadcastEvent(DebugClearCodesEvent, (data: { playerId: number; }) => {
            void this.handleDebugClearCodes(data);
        });

        console.log("[HWLinkServer] Ready to process verification requests");
    }

    // ========================================================================
    // HANDLER: CHECK LINK STATUS
    // ========================================================================

    private async handleCheckLinkStatus(
        data: { playerId: number }
    ): Promise<void> {
        const { playerId } = data;

        // I look up the player who asked
        const player = this.world.getPlayers().find(p => p.id === playerId);
        if (!player) {
            console.warn(`[HWLinkServer] Player ${playerId} not found`);
            return;
        }

        try {
            const linkValue = this.world.persistentStorage.getPlayerVariable<number>(player, DISCORD_LINK_PPV_KEY);
            const isLinked = typeof linkValue === "number" && linkValue !== 0;

            this.sendNetworkBroadcastEvent(
                CheckLinkStatusResponseEvent,
                { isLinked, playerId: player.id },
                [player]
            );
        } catch (error) {
            console.warn("[HWLinkServer] Failed to check link status:", error);
        }
    }

    // ========================================================================
    // HANDLER: VERIFY CODE REQUEST
    // ========================================================================

    private async handleVerifyRequest(
        data: { code: string; username: string; playerId: number }
    ): Promise<void> {
        const { code, username, playerId } = data;

        // I identify the requesting player
        const player = this.world.getPlayers().find(p => p.id === playerId);
        if (!player) {
            console.warn(`[HWLinkServer] Player ${playerId} not found`);
            return;
        }

        console.log(`[HWLinkServer] Verification request from ${player.name.get()}: code=${code}, username=${username}`);

        // I ensure I have the latest “used codes” state
        if (this.usedCodesCache === null) {
            await this.loadUsedCodes();
        }

        // If they’re already linked, I short-circuit with a friendly message
        try {
            const linkValue = this.world.persistentStorage.getPlayerVariable<number>(player, DISCORD_LINK_PPV_KEY);
            if (typeof linkValue === "number" && linkValue !== 0) {
                console.log(`[HWLinkServer] Player ${username} already linked`);
                this.sendNetworkBroadcastEvent(
                    VerifyCodeResponseEvent,
                    {
                        success: false,
                        message: "You've already been verified!",
                        alreadyLinked: true,
                    },
                    [player]
                );
                return;
            }
        } catch (error) {
            console.warn("[HWLinkServer] Error checking link status:", error);
        }

        // I block code re-use globally (across instances)
        if (this.isCodeAlreadyUsed(code)) {
            console.log(`[HWLinkServer] Code ${code} already used`);
            this.sendNetworkBroadcastEvent(
                VerifyCodeResponseEvent,
                {
                    success: false,
                    message: "❌ That code has already been used. Request a new one.",
                    codeAlreadyUsed: true,
                },
                [player]
            );
            return;
        }

        // I compute the expected code and compare
        const isValid = this.verifyCode(code, username);

        if (isValid) {
            console.log(`[HWLinkServer] ✅ Code verified for ${username}`);

            // I persist the player's linked status
            try {
                this.world.persistentStorage.setPlayerVariable(player, DISCORD_LINK_PPV_KEY, 1);
            } catch (error) {
                console.warn("[HWLinkServer] Failed to save link status:", error);
            }

            // I persist this code as used (no re-use)
            await this.markCodeAsUsed(code, username);

            // I let the client know it worked
            this.sendNetworkBroadcastEvent(
                VerifyCodeResponseEvent,
                {
                    success: true,
                    message: "✅ Verification successful! Welcome!",
                },
                [player]
            );
        } else {
            console.log(`[HWLinkServer] ❌ Invalid code for ${username}`);
            this.sendNetworkBroadcastEvent(
                VerifyCodeResponseEvent,
                {
                    success: false,
                    message: "❌ Invalid code! Please check and try again.",
                },
                [player]
            );
        }
    }

    // ========================================================================
    // PERSISTENT STORAGE MANAGEMENT
    // ========================================================================

    private async loadUsedCodes(): Promise<void> {
        const storageWorld = this.world.persistentStorageWorld;
        if (!storageWorld) {
            this.usedCodesCache = {};
            console.warn("[HWLinkServer] World persistent storage unavailable. Used code checks disabled.");
            return;
        }

        try {
            const stored = await storageWorld.fetchWorldVariableAsync(USED_CODES_WORLD_KEY);
            if (stored && typeof stored === "object") {
                const normalized: UsedCodesState = {};
                const entries = stored as Record<string, { username?: string; timestamp?: number }>;

                for (const [rawCode, info] of Object.entries(entries)) {
                    if (typeof rawCode !== "string" || !info) {
                        continue;
                    }

                    normalized[rawCode.toUpperCase()] = {
                        username: typeof info.username === "string" ? info.username : "",
                        timestamp: typeof info.timestamp === "number" ? info.timestamp : Date.now(),
                    };
                }

                this.usedCodesCache = normalized;
                console.log(`[HWLinkServer] Loaded ${Object.keys(normalized).length} used codes`);
            } else {
                this.usedCodesCache = {};
            }
        } catch (error) {
            console.warn("[HWLinkServer] Unable to load used code store:", error);
            this.usedCodesCache = {};
        }
    }

    private isCodeAlreadyUsed(code: string): boolean {
        if (!code || !this.usedCodesCache) {
            return false;
        }

        const normalizedCode = code.toUpperCase();
        return Object.prototype.hasOwnProperty.call(this.usedCodesCache, normalizedCode);
    }

    private async markCodeAsUsed(code: string, username: string): Promise<void> {
        const normalizedCode = code.toUpperCase();
        const record = {
            username,
            timestamp: Date.now(),
        };

        const updatedState: UsedCodesState = {
            ...(this.usedCodesCache ?? {}),
            [normalizedCode]: record,
        };

        this.usedCodesCache = updatedState;

        const storageWorld = this.world.persistentStorageWorld;
        if (!storageWorld) {
            console.warn("[HWLinkServer] World persistent storage unavailable. Used code state not persisted.");
            return;
        }

        try {
            await storageWorld.setWorldVariableAcrossAllInstancesAsync(
                USED_CODES_WORLD_KEY,
                updatedState,
                false
            );
            console.log(`[HWLinkServer] Marked code ${normalizedCode} as used by ${username}`);
        } catch (error) {
            console.warn("[HWLinkServer] Failed to persist used code state:", error);
        }
    }

    // ========================================================================
// VERIFICATION ALGORITHM
    // ========================================================================

    /**
     * I use a tiny djb2-style hash — no crypto dependency required.
     * This stays deterministic across Discord and Horizon so codes line up.
     */
    private simpleHash(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 33) ^ str.charCodeAt(i);
        }
        return hash >>> 0; // Convert to unsigned 32-bit integer
    }

    /**
     * I generate the expected 6-char code from world|username|Secret_Key and
     * compare it to what the player entered (case-insensitive).
     */
    private verifyCode(inputCode: string, username: string): boolean {
        // Build the same message your Discord bot uses
        const message = `${this.props.World_Name}|${username}|${this.props.Secret_Key}`;
        let hash = this.simpleHash(message);
        let expectedCode = '';
        
        // Map the hash into a non-ambiguous 6-char code
        for (let i = 0; i < CODE_LENGTH; i++) {
            expectedCode += CHARSET[hash % CHARSET.length];
            hash = Math.floor(hash / CHARSET.length);
        }
        
        // Compare codes (case-insensitive)
        return inputCode.toUpperCase() === expectedCode;
    }

    // ========================================================================
    // DEBUG HANDLERS
    // ========================================================================

    private async handleDebugResetPlayer(data: { playerId: number }): Promise<void> {
        const { playerId } = data;

        // I find the requesting player
        const player = this.world.getPlayers().find(p => p.id === playerId);
        if (!player) {
            console.warn(`[HWLinkServer] Debug: Player ${playerId} not found`);
            return;
        }

        const playerName = player.name.get();
        console.log(`[HWLinkServer] 🔄 DEBUG: Resetting verification status for ${playerName}`);

        try {
            // I reset the player's verification status to 0 (not linked)
            this.world.persistentStorage.setPlayerVariable(player, DISCORD_LINK_PPV_KEY, 0);

            this.sendNetworkBroadcastEvent(
                DebugActionResponseEvent,
                {
                    success: true,
                    message: `✅ Your verification status has been reset!`,
                    playerId: player.id,
                },
                [player]
            );

            console.log(`[HWLinkServer] ✅ Reset complete for ${playerName}`);
        } catch (error) {
            console.error("[HWLinkServer] Failed to reset player status:", error);
            this.sendNetworkBroadcastEvent(
                DebugActionResponseEvent,
                {
                    success: false,
                    message: `❌ Failed to reset status. Check console.`,
                    playerId: player.id,
                },
                [player]
            );
        }
    }

    private async handleDebugClearCodes(data: { playerId: number }): Promise<void> {
        const { playerId } = data;

        // I find the requesting player
        const player = this.world.getPlayers().find(p => p.id === playerId);
        if (!player) {
            console.warn(`[HWLinkServer] Debug: Player ${playerId} not found`);
            return;
        }

        const playerName = player.name.get();
        console.log(`[HWLinkServer] 🗑️ DEBUG: Clearing all used codes (requested by ${playerName})`);

        const storageWorld = this.world.persistentStorageWorld;
        if (!storageWorld) {
            console.error("[HWLinkServer] World persistent storage unavailable");
            this.sendNetworkBroadcastEvent(
                DebugActionResponseEvent,
                {
                    success: false,
                    message: `❌ Storage unavailable. Check console.`,
                    playerId: player.id,
                },
                [player]
            );
            return;
        }

        try {
            const codeCount = this.usedCodesCache ? Object.keys(this.usedCodesCache).length : 0;

            // I clear all used codes by setting an empty object
            await storageWorld.setWorldVariableAcrossAllInstancesAsync(
                USED_CODES_WORLD_KEY,
                {},
                false
            );

            // I update the in-memory cache
            this.usedCodesCache = {};

            this.sendNetworkBroadcastEvent(
                DebugActionResponseEvent,
                {
                    success: true,
                    message: `✅ Cleared ${codeCount} used codes!`,
                    playerId: player.id,
                },
                [player]
            );

            console.log(`[HWLinkServer] ✅ Cleared ${codeCount} used codes`);
        } catch (error) {
            console.error("[HWLinkServer] Failed to clear used codes:", error);
            this.sendNetworkBroadcastEvent(
                DebugActionResponseEvent,
                {
                    success: false,
                    message: `❌ Failed to clear codes. Check console.`,
                    playerId: player.id,
                },
                [player]
            );
        }
    }
}

// ============================================================================
// COMPONENT REGISTRATION
// ============================================================================

hz.Component.register(HWLinkServer);

