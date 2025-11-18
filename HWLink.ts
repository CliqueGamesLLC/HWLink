import * as hz from "horizon/core";
import { 
    UIComponent, 
    View, 
    Text, 
    Binding, 
    AnimatedBinding,
    Animation,
    Easing,
    Pressable, 
    UINode, 
    Callback, 
    ViewStyle 
} from "horizon/ui";
import { NetworkEvent, WorldInventory } from "horizon/core";

// ============================================================================
// DISCORD LINK VERIFIER - CLIENT UI COMPONENT
// ============================================================================
// I built this UI so your players can link their Discord to your world in
// a quick, friendly flow. You get a welcome screen, a clean 6-char code input
// with a tactile keyboard, and a success screen—plus optional rewards.
//
// What you get out of the box:
// - Clear instructions → code entry → success
// - Real-time feedback and simple error states
// - Duplicate attempt protection and code reuse prevention (server enforces)
// - Optional auto-granting of in-world items after verification
//
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Single binding for screen visibility (derived bindings reduce set calls)
// - Animation API used consistently (no periodic binding updates)
// - Player-specific bindings for hover states (reduces network traffic)
// - Batched binding updates where possible
// - Optimized for Local mode execution (reduces network latency)
//
// How I expect you to drop this in:
// 1) Attach this script (Execution Mode: Local) to a `UIGizmo`.
// 2) Use a tiny OwnershipBootstrap (Execution Mode: Default) to transfer ownership of this UI
//    to the joining player on OnPlayerEnterWorld. That keeps it Local and
//    avoids "running on server" UI warnings. The same approach works if you
//    have a client-side GameManager you want the player to own.
// 3) Add `HWLinkServer.ts` to an Empty Object (Execution Mode: Default) entity in your world.
// 4) In the server component's properties, set `World_Name` and `Secret_Key`
//    to match your Discord bot configuration.
//
// Rewards (totally optional but heavily recommended):
// - If you want to hand out items on successful verification, flip the ENABLE_REWARDS flag to true
//   in the Reward section below and paste your Commerce SKUs. I'll grant
//   everything you list to the verified player automatically.
//
// A few examples that work well as rewards:
// - Coins / currency packs (Consumable)
// - Starter kits or unlock tokens (Durable)
// - XP boosts / power-ups (Consumable)
// - Any custom Horizon World gear you've made (Durable)
// ============================================================================

// ============================================================================
// CODE LENGTH
// ============================================================================
// This is the length of the code that the player will enter, it should not be changed
// as the Discord bot will only send 6 character codes.

const CODE_LENGTH = 6;

// ============================================================================
// REWARD CONFIGURATION
// ============================================================================
// If you want to celebrate verified players, this is where I hand out loot.
// - Create items in Desktop Editor → Systems → Commerce → Create Item.
// - Hover an item and click "Copy SKU", then paste below.
// - Durable items ignore quantity; Consumables use quantity.
// Flip the switch (ENABLE_REWARDS) to turn this on and I’ll grant on success.
// ============================================================================

// I keep reward items simple: a SKU and a quantity (for consumables).
type RewardItem = {
    sku: string;      // Paste the SKU from the Commerce panel
    quantity: number; // Consumables use this; Durables ignore it
};

// Flip me to true to enable automatic rewards after verification
const ENABLE_REWARDS = false;

// Put any number of items here—I'll grant all of them on successful verify
const REWARD_ITEMS: RewardItem[] = [
    // Examples (replace with your SKUs):
    // { sku: "welcome_badge_sku", quantity: 1 },  // Durable (quantity ignored)
    // { sku: "gold_coins_sku", quantity: 100 },   // Consumable
    // { sku: "starter_pack_sku", quantity: 1 },   // Durable
    // { sku: "xp_boost_sku", quantity: 3 },       // Consumable
];

// Optional: I’ll log this after rewards are granted (customize freely)
const REWARD_MESSAGE = "You've received verification rewards!";

// ============================================================================
// NETWORK EVENTS (these must mirror the server names and payloads)
// ============================================================================

// Client → Server: I ask the server to verify the code
const VerifyCodeRequestEvent = new NetworkEvent<{
    code: string;
    username: string;
    playerId: number;
}>("HWLink:VerifyCodeRequest");

// Server → Client: The server tells us if it worked (or why it didn’t)
const VerifyCodeResponseEvent = new NetworkEvent<{
    success: boolean;
    message: string;
    alreadyLinked?: boolean;
    codeAlreadyUsed?: boolean;
}>("HWLink:VerifyCodeResponse");

// Client → Server: Ask whether this player is already linked
const CheckLinkStatusRequestEvent = new NetworkEvent<{
    playerId: number;
}>("HWLink:CheckLinkStatusRequest");

// Server → Client: The server confirms link status for this player
const CheckLinkStatusResponseEvent = new NetworkEvent<{
    isLinked: boolean;
    playerId: number;
}>("HWLink:CheckLinkStatusResponse");


// ============================================================================
// HELPER: KEY BUTTON COMPONENT
// ============================================================================

type KeyButtonProps = {
    label: string;
    onClick: Callback;
    style?: ViewStyle;
};

function KeyButton(props: KeyButtonProps): UINode {
    const DEFAULT_COLOR = "#4A5568";
    const HOVERED_COLOR = "#2D3748";
    const PRESSED_COLOR = "#1A202C";
    
    // OPTIMIZATION: Use player-specific bindings for hover states (already optimal)
    // This ensures only the interacting player sees the change, reducing network overhead
    const backgroundColor = new Binding<string>(DEFAULT_COLOR);
    
    // OPTIMIZATION: Use AnimatedBinding for all scale changes (uses Animation API internally)
    const scale = new AnimatedBinding(1);
    
    return Pressable({
        children: Text({
            text: props.label,
            style: {
                color: "white",
                fontSize: 14,
                fontWeight: "600",
                fontFamily: "Roboto",
            },
        }),
        onClick: props.onClick,
        // OPTIMIZATION: Player-specific bindings reduce network traffic
        // Only the interacting player receives the binding update
        onEnter: (player: hz.Player) => {
            backgroundColor.set(HOVERED_COLOR, [player]);
            // OPTIMIZATION: Use Animation API instead of direct binding sets
            scale.set(Animation.timing(1.05, { duration: 100, easing: Easing.ease }));
        },
        onExit: (player: hz.Player) => {
            backgroundColor.set(DEFAULT_COLOR, [player]);
            // OPTIMIZATION: Use Animation API for smooth transitions
            scale.set(Animation.timing(1, { duration: 100, easing: Easing.ease }));
        },
        onPress: (player: hz.Player) => {
            backgroundColor.set(PRESSED_COLOR, [player]);
            // OPTIMIZATION: Use Animation API for tactile feedback
            scale.set(Animation.timing(0.9, { duration: 80, easing: Easing.ease }));
        },
        onRelease: (player: hz.Player) => {
            backgroundColor.set(HOVERED_COLOR, [player]);
            // OPTIMIZATION: Use Animation API for smooth transitions
            scale.set(Animation.timing(1.05, { duration: 100, easing: Easing.ease }));
        },
        style: {
            backgroundColor: backgroundColor,
            borderRadius: 4,
            height: 40,
            width: 40,
            alignItems: "center",
            justifyContent: "center",
            margin: 3,
            transform: [{ scale: scale }],
            ...props.style,
        } as ViewStyle,
    });
}

// ============================================================================
// HWLINK COMPONENT
// ============================================================================

class HWLink extends UIComponent<typeof HWLink> {
    static propsDefinition = {
        // Custom Discord server link text (e.g., "Discord.gg/YourServer" or any instruction)
        discordLinkText: { type: hz.PropTypes.String, default: "Discord.gg/Example" },
    };

    // Panel dimensions (1:1 ratio for square layout)
    panelSize = 520;
    panelHeight = this.panelSize;
    panelWidth = this.panelSize;

    // Screen state
    private currentScreen: "welcome" | "input" | "success" = "welcome";
    
    // State
    private currentCode = "";
    private playerUsername = "";
    private localPlayer: hz.Player | null = null;
    private localPlayerId: number | null = null;
    private playerAlreadyLinked = false;

    // UI Bindings - Screen visibility (optimized: single source of truth)
    // Using a single binding with derived values reduces binding set calls
    private currentScreenBinding = new Binding<"welcome" | "input" | "success">("welcome");
    
    // Derived bindings for screen visibility (computed, no extra set calls needed)
    private welcomeScreenVisibility = this.currentScreenBinding.derive(screen => screen === "welcome" ? "flex" : "none");
    private inputScreenVisibility = this.currentScreenBinding.derive(screen => screen === "input" ? "flex" : "none");
    private successScreenVisibility = this.currentScreenBinding.derive(screen => screen === "success" ? "flex" : "none");
    
    // UI Bindings
    private statusMessage = new Binding<string>("Enter your 6-character verification code");
    private statusColor = new Binding<string>("#FFFFFF");
    private keyboardVisibility = new Binding<string>("flex");
    private playerNameDisplay = new Binding<string>("");
    
    // Individual character box bindings
    private charBindings: Binding<string>[] = [
        new Binding<string>(""),
        new Binding<string>(""),
        new Binding<string>(""),
        new Binding<string>(""),
        new Binding<string>(""),
        new Binding<string>("")
    ];
    
    // Scale bindings for pop animation
    private scaleBindings: AnimatedBinding[] = [
        new AnimatedBinding(1),
        new AnimatedBinding(1),
        new AnimatedBinding(1),
        new AnimatedBinding(1),
        new AnimatedBinding(1),
        new AnimatedBinding(1)
    ];
    
    // Opacity bindings for pop-in effect
    private opacityBindings: AnimatedBinding[] = [
        new AnimatedBinding(0.3),
        new AnimatedBinding(0.3),
        new AnimatedBinding(0.3),
        new AnimatedBinding(0.3),
        new AnimatedBinding(0.3),
        new AnimatedBinding(0.3)
    ];

    // ========================================================================
    // SCREEN NAVIGATION (OPTIMIZED: Single binding set instead of 3)
    // ========================================================================

    private showWelcomeScreen(): void {
        this.currentScreen = "welcome";
        // OPTIMIZATION: Single binding set updates all 3 derived visibility bindings automatically
        this.currentScreenBinding.set("welcome");
    }

    private showInputScreen(): void {
        this.currentScreen = "input";
        // OPTIMIZATION: Single binding set updates all 3 derived visibility bindings automatically
        this.currentScreenBinding.set("input");
    }

    private showSuccessScreen(): void {
        this.currentScreen = "success";
        // OPTIMIZATION: Single binding set updates all 3 derived visibility bindings automatically
        this.currentScreenBinding.set("success");
    }


    // ========================================================================
    // UI INITIALIZATION
    // ========================================================================

    initializeUI() {
        // I center the UI in the viewport so it reads like a panel/modal
        return View({
            children: [
                // ============================================================
                // WELCOME SCREEN
                // ============================================================
                View({
                    children: [
                        // I render a simple, friendly header
                        Text({
                            text: "Welcome to HWLink!",
                            style: {
                                fontSize: 24,
                                fontWeight: "bold",
                                fontFamily: "Roboto",
                                color: "#FFFFFF",
                                marginBottom: 20,
                                textAlign: "center",
                            },
                        }),

                        // I explain the high-level flow up front
                        Text({
                            text: "Link your Discord & Horizon World Account with these steps:",
                            style: {
                                fontSize: 16,
                                fontFamily: "Roboto",
                                color: "#E2E8F0",
                                marginBottom: 20,
                                textAlign: "center",
                            },
                        }),

                        // Step 1
                        Text({
                            text: `1. Go to ${this.props.discordLinkText}`,
                            style: {
                                fontSize: 16,
                                fontFamily: "Roboto",
                                color: "#FFFFFF",
                                marginBottom: 12,
                            },
                        }),

                        // Step 2
                        Text({
                            text: "2. In Discord, Type the Command: /hwl link",
                            style: {
                                fontSize: 16,
                                fontFamily: "Roboto",
                                color: "#FFFFFF",
                                marginBottom: 12,
                            },
                        }),

                        // Step 3
                        Text({
                            text: "3. Press Enter Code below!",
                            style: {
                                fontSize: 16,
                                fontFamily: "Roboto",
                                color: "#FFFFFF",
                                marginBottom: 24,
                            },
                        }),

                        // Big green CTA to move into input
                        KeyButton({
                            label: "Enter Code",
                            onClick: () => this.showInputScreen(),
                            style: { width: 180, height: 50, backgroundColor: "#38A169" },
                        }),
                    ],
                    style: {
                        display: this.welcomeScreenVisibility,
                        backgroundColor: "#1A202C",
                        padding: 24,
                        borderRadius: 12,
                        alignItems: "center",
                        width: this.panelWidth,
                        maxWidth: this.panelWidth,
                        maxHeight: this.panelHeight,
                    },
                }),

                // ============================================================
                // INPUT SCREEN (Code Entry)
                // ============================================================
                View({
                    children: [
                        // I label the panel so players know where they are
                        Text({
                            text: "Discord Link Verifier",
                            style: {
                                fontSize: 20,
                                fontWeight: "bold",
                                fontFamily: "Roboto",
                                color: "#FFFFFF",
                                marginBottom: 12,
                            },
                        }),

                        // I show the local player's name for clarity
                        Text({
                            text: this.playerNameDisplay,
                            style: {
                                fontSize: 14,
                                fontFamily: "Roboto",
                                color: "#A0AEC0",
                                marginBottom: 16,
                            },
                        }),

                        // I render six boxes, one per character of the code
                        View({
                            children: [
                                // I generate the six slots with bindings and pop-in
                                ...this.charBindings.map((charBinding, index) => {
                                    return View({
                                        children: [
                                            Text({
                                                text: charBinding,
                                                style: {
                                                    fontSize: 32,
                                                    fontWeight: "bold",
                                                    fontFamily: "Roboto-Mono",
                                                    color: "#FFFFFF",
                                                    opacity: this.opacityBindings[index],
                                                },
                                            }),
                                        ],
                                        style: {
                                            backgroundColor: "#2D3748",
                                            borderRadius: 8,
                                            width: 50,
                                            height: 60,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            margin: 4,
                                            borderWidth: 2,
                                            borderColor: "#4A5568",
                                            transform: [{ scale: this.scaleBindings[index] }],
                                        } as ViewStyle,
                                    });
                                }),
                            ],
                            style: {
                                flexDirection: "row",
                                marginBottom: 12,
                                alignItems: "center",
                                justifyContent: "center",
                            },
                        }),

                        // I use this line to give inline feedback/errors
                        Text({
                            text: this.statusMessage,
                            style: {
                                fontSize: 12,
                                fontFamily: "Roboto",
                                color: this.statusColor,
                                marginBottom: 16,
                                textAlign: "center",
                            },
                        }),

                        // On-screen keyboard (I hide this once the player is verified)
                        View({
                            children: [
                                // Row 1: Numbers (QWERTY top row)
                                View({
                                    children: [
                                        KeyButton({ label: "1", onClick: () => this.handleCharacterInput("1") }),
                                        KeyButton({ label: "2", onClick: () => this.handleCharacterInput("2") }),
                                        KeyButton({ label: "3", onClick: () => this.handleCharacterInput("3") }),
                                        KeyButton({ label: "4", onClick: () => this.handleCharacterInput("4") }),
                                        KeyButton({ label: "5", onClick: () => this.handleCharacterInput("5") }),
                                        KeyButton({ label: "6", onClick: () => this.handleCharacterInput("6") }),
                                        KeyButton({ label: "7", onClick: () => this.handleCharacterInput("7") }),
                                        KeyButton({ label: "8", onClick: () => this.handleCharacterInput("8") }),
                                        KeyButton({ label: "9", onClick: () => this.handleCharacterInput("9") }),
                                    ],
                                    style: {
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        marginBottom: 6,
                                    },
                                }),

                                // Row 2: Q W E R T Y U P (QWERTY second row, excluding I and O)
                                View({
                                    children: [
                                        KeyButton({ label: "Q", onClick: () => this.handleCharacterInput("Q") }),
                                        KeyButton({ label: "W", onClick: () => this.handleCharacterInput("W") }),
                                        KeyButton({ label: "E", onClick: () => this.handleCharacterInput("E") }),
                                        KeyButton({ label: "R", onClick: () => this.handleCharacterInput("R") }),
                                        KeyButton({ label: "T", onClick: () => this.handleCharacterInput("T") }),
                                        KeyButton({ label: "Y", onClick: () => this.handleCharacterInput("Y") }),
                                        KeyButton({ label: "U", onClick: () => this.handleCharacterInput("U") }),
                                        KeyButton({ label: "P", onClick: () => this.handleCharacterInput("P") }),
                                    ],
                                    style: {
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        marginBottom: 6,
                                    },
                                }),

                                // Row 3: A S D F G H J K (QWERTY home row, excluding L)
                                View({
                                    children: [
                                        KeyButton({ label: "A", onClick: () => this.handleCharacterInput("A") }),
                                        KeyButton({ label: "S", onClick: () => this.handleCharacterInput("S") }),
                                        KeyButton({ label: "D", onClick: () => this.handleCharacterInput("D") }),
                                        KeyButton({ label: "F", onClick: () => this.handleCharacterInput("F") }),
                                        KeyButton({ label: "G", onClick: () => this.handleCharacterInput("G") }),
                                        KeyButton({ label: "H", onClick: () => this.handleCharacterInput("H") }),
                                        KeyButton({ label: "J", onClick: () => this.handleCharacterInput("J") }),
                                        KeyButton({ label: "K", onClick: () => this.handleCharacterInput("K") }),
                                    ],
                                    style: {
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        marginBottom: 6,
                                    },
                                }),

                                // Row 4: Z X C V B N M (QWERTY bottom row)
                                View({
                                    children: [
                                        KeyButton({ label: "Z", onClick: () => this.handleCharacterInput("Z") }),
                                        KeyButton({ label: "X", onClick: () => this.handleCharacterInput("X") }),
                                        KeyButton({ label: "C", onClick: () => this.handleCharacterInput("C") }),
                                        KeyButton({ label: "V", onClick: () => this.handleCharacterInput("V") }),
                                        KeyButton({ label: "B", onClick: () => this.handleCharacterInput("B") }),
                                        KeyButton({ label: "N", onClick: () => this.handleCharacterInput("N") }),
                                        KeyButton({ label: "M", onClick: () => this.handleCharacterInput("M") }),
                                    ],
                                    style: {
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        marginBottom: 10,
                                    },
                                }),

                                // Action buttons
                                View({
                                    children: [
                                        KeyButton({
                                            label: "Back",
                                            onClick: () => this.showWelcomeScreen(),
                                            style: { width: 70, backgroundColor: "#4A5568" },
                                        }),
                                        KeyButton({
                                            label: "Clear",
                                            onClick: () => this.handleClear(),
                                            style: { width: 70, backgroundColor: "#E53E3E" },
                                        }),
                                        KeyButton({
                                            label: "Submit",
                                            onClick: () => { void this.handleSubmit(); },
                                            style: { width: 90, backgroundColor: "#38A169" },
                                        }),
                                    ],
                                    style: {
                                        flexDirection: "row",
                                        justifyContent: "center",
                                    },
                                }),
                            ],
                            style: {
                                display: this.keyboardVisibility,
                                flexDirection: "column",
                            },
                        }),
                    ],
                    style: {
                        display: this.inputScreenVisibility,
                        backgroundColor: "#1A202C",
                        padding: 18,
                        borderRadius: 12,
                        alignItems: "center",
                        width: this.panelWidth,
                        maxWidth: this.panelWidth,
                        maxHeight: this.panelHeight,
                    },
                }),

                // ============================================================
                // SUCCESS SCREEN
                // ============================================================
                View({
                    children: [
                        // I flash a friendly checkmark
                        Text({
                            text: "✓",
                            style: {
                                fontSize: 60,
                                fontFamily: "Roboto",
                                color: "#00FF00",
                                marginBottom: 20,
                            },
                        }),

                        // And let the player know they’re linked
                        Text({
                            text: "Your Discord Account is now Linked!",
                            style: {
                                fontSize: 20,
                                fontWeight: "bold",
                                fontFamily: "Roboto",
                                color: "#FFFFFF",
                                marginBottom: 16,
                                textAlign: "center",
                            },
                        }),

                        // Add any extra perks/next steps here
                        Text({
                            text: "You can now enjoy exclusive benefits and features!",
                            style: {
                                fontSize: 14,
                                fontFamily: "Roboto",
                                color: "#A0AEC0",
                                textAlign: "center",
                            },
                        }),
                    ],
                    style: {
                        display: this.successScreenVisibility,
                        backgroundColor: "#1A202C",
                        padding: 32,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        width: this.panelWidth,
                        maxWidth: this.panelWidth,
                        maxHeight: this.panelHeight,
                    },
                }),
            ],
            style: {
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
            },
        });
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    start() {
        this.ensureLocalPlayerContext();

        // I listen for verification responses from the server
        this.connectNetworkBroadcastEvent(VerifyCodeResponseEvent, (data: hz.SerializableState) => {
            this.handleVerifyResponse(data as { success: boolean; message: string; alreadyLinked?: boolean; codeAlreadyUsed?: boolean; });
        });

        // I also listen for a one-shot link status check on join
        this.connectNetworkBroadcastEvent(CheckLinkStatusResponseEvent, (data: hz.SerializableState) => {
            this.handleLinkStatusResponse(data as { isLinked: boolean; playerId: number; });
        });

        this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player: hz.Player) => {
            this.tryInitializeFromPlayer(player);
        });
    }

    private ensureLocalPlayerContext(attempt: number = 0): void {
        const localPlayer = this.world.getLocalPlayer();
        const serverPlayer = this.world.getServerPlayer();

        if (!localPlayer || localPlayer === serverPlayer) {
            const nextDelay = attempt < 20 ? 200 : 1000;
            if (attempt === 20) {
                console.warn("[HWLink] Unable to resolve local player for UI component. Will keep trying in the background.");
            }
            this.async.setTimeout(() => this.ensureLocalPlayerContext(attempt + 1), nextDelay);
            return;
        }

        this.applyLocalPlayerContext(localPlayer);
    }

    private tryInitializeFromPlayer(player: hz.Player): void {
        if (!player) {
            return;
        }

        const localPlayer = this.world.getLocalPlayer();
        if (localPlayer && player.id === localPlayer.id) {
            this.applyLocalPlayerContext(player);
        }
    }

    private applyLocalPlayerContext(player: hz.Player, attempt: number = 0): void {
        const name = player.name.get();

        if (!name || name.trim().length === 0) {
            if (attempt < 10) {
                this.async.setTimeout(() => this.applyLocalPlayerContext(player, attempt + 1), 200);
            } else {
                console.warn("[HWLink] Player name unavailable after multiple attempts.");
            }
            return;
        }

        if (this.localPlayerId === player.id && this.playerUsername === name) {
            return;
        }

        this.localPlayer = player;
        this.localPlayerId = player.id;
        this.playerUsername = name;
        this.playerNameDisplay.set(`Player: ${name}`);

        this.checkExistingLinkStatus();
    }

    private checkExistingLinkStatus(): void {
        if (!this.localPlayer) {
            return;
        }

        // Ask the server if this local player is already linked
        this.sendNetworkBroadcastEvent(CheckLinkStatusRequestEvent, {
            playerId: this.localPlayer.id,
        });
    }

    private handleLinkStatusResponse(data: { isLinked: boolean; playerId: number }): void {
        if (!this.localPlayer || data.playerId !== this.localPlayer.id) {
            return;
        }

        this.playerAlreadyLinked = data.isLinked;

        if (data.isLinked) {
            // Already linked? I skip straight to the success screen
            this.showSuccessScreen();
        } else {
            // Not linked yet—keep the keyboard visible
            this.keyboardVisibility.set("flex");
        }
    }


    // ========================================================================
    // INPUT HANDLERS
    // ========================================================================

    private handleCharacterInput(char: string): void {
        if (this.currentCode.length < CODE_LENGTH) {
            const index = this.currentCode.length;
            this.currentCode += char.toUpperCase();
            
            // OPTIMIZATION: Batch character updates - set character first, then animate
            // This reduces the number of immediate binding sets
            this.charBindings[index].set(char.toUpperCase());
            
            // OPTIMIZATION: Use Animation API for all visual changes (no periodic binding updates)
            // Animation sequence: start small, overshoot, then settle - all handled by Animation API
            this.scaleBindings[index].set(
                Animation.sequence(
                    Animation.timing(1.4, { duration: 150, easing: Easing.out(Easing.ease) }), // Overshoot from current
                    Animation.timing(1, { duration: 150, easing: Easing.inOut(Easing.ease) }) // Settle to normal
                )
            );
            // OPTIMIZATION: Use Animation API for opacity fade-in
            this.opacityBindings[index].set(Animation.timing(1, { duration: 150, easing: Easing.ease }));
            
            // OPTIMIZATION: Batch status updates together
            const newStatusMessage = `Enter your 6-character verification code (${this.currentCode.length}/${CODE_LENGTH})`;
            this.statusMessage.set(newStatusMessage);
            // Status color is set unconditionally (binding system optimizes internally)
            this.statusColor.set("#FFFFFF");
        }
    }

    private handleClear(): void {
        this.currentCode = "";
        
        // OPTIMIZATION: Batch all clear operations - use Animation API consistently
        // All animations happen in parallel, reducing binding set overhead
        for (let i = 0; i < CODE_LENGTH; i++) {
            this.charBindings[i].set("");
            // Use Animation API for smooth transitions instead of direct sets
            this.scaleBindings[i].set(Animation.timing(1, { duration: 100, easing: Easing.ease }));
            this.opacityBindings[i].set(Animation.timing(0.3, { duration: 200, easing: Easing.ease }));
        }
        
        // OPTIMIZATION: Batch status updates together
        this.statusMessage.set("Enter your 6-character verification code");
        // Status color is set unconditionally (binding system optimizes internally)
        this.statusColor.set("#FFFFFF");
    }

    private async handleSubmit(): Promise<void> {
        if (this.currentCode.length !== CODE_LENGTH) {
            this.statusMessage.set(`Code must be exactly ${CODE_LENGTH} characters!`);
            this.statusColor.set("#FF0000");
            return;
        }

        if (!this.playerUsername) {
            this.statusMessage.set("Player info not ready yet. Please wait a moment and try again.");
            this.statusColor.set("#FFB500");
            return;
        }

        if (this.playerAlreadyLinked) {
            this.currentCode = "";
            
            // OPTIMIZATION: Batch status updates
            this.statusMessage.set("You've already been verified!");
            this.statusColor.set("#FFB500");
            
            // OPTIMIZATION: Batch clear operations - all animations happen in parallel
            for (let i = 0; i < CODE_LENGTH; i++) {
                this.charBindings[i].set("");
                this.opacityBindings[i].set(Animation.timing(0.3, { duration: 200, easing: Easing.ease }));
            }
            return;
        }

        const submittedCode = this.currentCode.toUpperCase();

        // Give the player some feedback while we ask the server
        this.statusMessage.set("Verifying code...");
        this.statusColor.set("#FFFFFF");

        // Send the verification request to the server
        if (!this.localPlayer) {
            this.statusMessage.set("Player context not ready. Please try again.");
            this.statusColor.set("#FFB500");
            return;
        }

        this.sendNetworkBroadcastEvent(VerifyCodeRequestEvent, {
            code: submittedCode,
            username: this.playerUsername,
            playerId: this.localPlayer.id,
        });
    }

    // ========================================================================
    // REWARD SYSTEM
    // ========================================================================

    /**
     * I grant optional rewards after a successful verification.
     * Configure your SKUs in the REWARD_ITEMS array above and flip ENABLE_REWARDS.
     */
    private grantVerificationRewards(): void {
        if (!ENABLE_REWARDS || REWARD_ITEMS.length === 0) {
            console.log("[HWLink] Rewards disabled or no rewards configured.");
            return;
        }

        if (!this.localPlayer) {
            console.warn("[HWLink] Cannot grant rewards - no local player available.");
            return;
        }

        console.log(`[HWLink] Granting ${REWARD_ITEMS.length} reward(s) to ${this.playerUsername}...`);

        // I iterate over your list and grant each item
        REWARD_ITEMS.forEach((reward, index) => {
            try {
                // Grant the item to the player
                WorldInventory.grantItemToPlayer(
                    this.localPlayer!, 
                    reward.sku, 
                    reward.quantity
                );
                
                console.log(`[HWLink] ✓ Granted reward ${index + 1}/${REWARD_ITEMS.length}: ${reward.quantity}x "${reward.sku}"`);
            } catch (error) {
                console.error(`[HWLink] ✗ Failed to grant reward "${reward.sku}":`, error);
            }
        });

        // Optional: log a friendly message for you (or hook up your own UI)
        if (REWARD_MESSAGE) {
            // You could also update the success screen or show a toast here
            console.log(`[HWLink] ${REWARD_MESSAGE}`);
        }
    }

    // ========================================================================
    // RESPONSE HANDLERS
    // ========================================================================

    private handleVerifyResponse(data: {
        success: boolean;
        message: string;
        alreadyLinked?: boolean;
        codeAlreadyUsed?: boolean;
    }): void {
        if (data.success) {
            // We're verified!
            this.playerAlreadyLinked = true;
            this.currentCode = "";
            
            // OPTIMIZATION: Batch status updates together
            this.statusMessage.set(data.message);
            this.statusColor.set("#00FF00");
            
            // OPTIMIZATION: Batch clear operations - all animations happen in parallel
            for (let i = 0; i < CODE_LENGTH; i++) {
                this.charBindings[i].set("");
                this.opacityBindings[i].set(Animation.timing(0.3, { duration: 200, easing: Easing.ease }));
            }

            // ===================================================================
            // GRANT VERIFICATION REWARDS
            // ===================================================================
            this.grantVerificationRewards();
            
            // ===================================================================
            // CUSTOMIZATION POINT: hook your own logic here
            // ===================================================================
            // A few ideas you might like:
            // - Grant access to exclusive areas (unlock doors/teleporters)
            // - Unlock premium features or game modes
            // - Award badges or achievements
            // - Send custom events to other game systems
            // - Add player to VIP list
            // - Update leaderboards or stats
            console.log(`Player ${this.playerUsername} verified successfully!`);

            // Slide to the success screen after a quick beat
            this.async.setTimeout(() => {
                this.showSuccessScreen();
            }, 1000);
        } else {
            // Not verified this time
            this.currentCode = "";
            
            // OPTIMIZATION: Batch status updates - set message once, color once
            this.statusMessage.set(data.message);
            
            if (data.alreadyLinked) {
                this.playerAlreadyLinked = true;
                this.statusColor.set("#FFB500");
                // Already linked? I still show success to confirm state
                this.async.setTimeout(() => {
                    this.showSuccessScreen();
                }, 1000);
            } else {
                this.statusColor.set("#FF0000");
            }
            
            // OPTIMIZATION: Batch clear operations - all animations happen in parallel
            for (let i = 0; i < CODE_LENGTH; i++) {
                this.charBindings[i].set("");
                this.opacityBindings[i].set(Animation.timing(0.3, { duration: 200, easing: Easing.ease }));
            }
        }
    }

}

// ============================================================================
// COMPONENT REGISTRATION
// ============================================================================

UIComponent.register(HWLink);
