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
import { NetworkEvent, Color } from "horizon/core";

// ============================================================================
// DISCORD LINK UI: Handles the client-side panel for entering and submitting
// the Discord verification code. Expects synchronized network events from HWLinkServer.
// ============================================================================
// A modern, sleek UI for linking Discord accounts.
// Features:
// - Deep, rich color palette (Customizable)
// - Smooth animations and transitions
// - Clean typography and spacing
// - Optimized binding updates
// ============================================================================

const CODE_LENGTH = 6;

// ============================================================================
// STYLING CONSTANTS (DEFAULTS / FALLBACKS)
// ============================================================================

// Default Colors for fallback theme (Slate/Indigo) - override via props if needed
const DEFAULT_COLORS = {
    background: "#0A142F",     // Brand Dark Blue
    surface: "#0A142F",        // Brand Dark Blue
    surfaceHighlight: "#1A2642", // Lighter Dark Blue
    primary: "#00C3F8",        // Brand Cyan
    primaryHover: "#26CEFA",   // Lighter Cyan
    primaryPress: "#009BC6",   // Darker Cyan
    success: "#00C3F8",        // Brand Cyan
    error: "#F11C73",          // Brand Pink
    textMain: "#FFFFFF",       // White
    textSecondary: "#94A3B8",  // Slate 400
    border: "#1A2642",         // Lighter Dark Blue
};

// Font family tokens for main (sans) and monospace style
const FONTS = {
    main: "Roboto" as const,
    mono: "Roboto-Mono" as const,
};

// ============================================================================
// NETWORK EVENTS (These names/payloads must match the server exactly!)
// ============================================================================

const VerifyCodeRequestEvent = new NetworkEvent<{
    code: string;
    username: string;
    playerId: number;
}>("HWLink:VerifyCodeRequest");

const VerifyCodeResponseEvent = new NetworkEvent<{
    success: boolean;
    message: string;
    alreadyLinked?: boolean;
    codeAlreadyUsed?: boolean;
}>("HWLink:VerifyCodeResponse");

const CheckLinkStatusRequestEvent = new NetworkEvent<{
    playerId: number;
}>("HWLink:CheckLinkStatusRequest");

const CheckLinkStatusResponseEvent = new NetworkEvent<{
    isLinked: boolean;
    playerId: number;
}>("HWLink:CheckLinkStatusResponse");


// ============================================================================
// TYPES
// ============================================================================

// Data structure for an on-screen input key (soft keyboard/number row)
type KeyButtonProps = {
    label: string;
    onClick: Callback;
    style?: ViewStyle;
    variant?: "default" | "primary" | "danger" | "ghost";
    width?: number;
    height?: number;
    animatedBorder?: boolean;
};

// Centralized color/token theme after merging props - gets updated on UI init
type Theme = {
    background: string;
    surface: string;
    surfaceHighlight: string;
    primary: string;
    primaryHover: string;
    primaryPress: string;
    success: string;
    error: string;
    textMain: string;
    textSecondary: string;
    border: string;
};

// ============================================================================
// HWLink UIComponent - manages all Discord linking client state and screens
// ============================================================================

class HWLink extends UIComponent<typeof HWLink> {
    static propsDefinition = {
        welcomeHeaderText: { type: hz.PropTypes.String, default: "Link Account" },
        welcomeSubheaderText: { type: hz.PropTypes.String, default: "Unlock exclusive features by linking Discord" },
        discordLinkText: { type: hz.PropTypes.String, default: "discord.gg/horizon" },
        discordCommandText: { type: hz.PropTypes.String, default: "Type /hwl link in any channel" },
        successMessageText: { type: hz.PropTypes.String, default: "You're all set. You can now access exclusive areas and rewards." },
        
        // Appearance Customization
        backgroundColor: { 
            type: hz.PropTypes.Color, 
            default: new Color(0.0392, 0.0784, 0.1843) // Brand Dark Blue (#0A142F)
        },
        textColor: { 
            type: hz.PropTypes.Color, 
            default: new Color(1, 1, 1) // White
        },
        accentColor: { 
            type: hz.PropTypes.Color, 
            default: new Color(0, 0.7647, 0.9725) // Brand Cyan (#00C3F8)
        }
    };

    // Panel dimensions
    panelSize = 600;
    panelHeight = 600;
    panelWidth = 600;

    // Screen state
    private currentScreen: "welcome" | "input" | "success" = "welcome";
    
    // State
    private currentCode = "";
    private playerUsername = "";
    private localPlayer: hz.Player | null = null;
    private localPlayerId: number | null = null;
    private playerAlreadyLinked = false;

    // Theme (initialized in initializeUI)
    private theme: Theme = DEFAULT_COLORS;

    // UI Bindings
    private currentScreenBinding = new Binding<"welcome" | "input" | "success">("welcome");
    
    // Derived bindings for screen visibility
    private welcomeScreenVisibility = this.currentScreenBinding.derive(screen => screen === "welcome" ? "flex" : "none");
    private inputScreenVisibility = this.currentScreenBinding.derive(screen => screen === "input" ? "flex" : "none");
    private successScreenVisibility = this.currentScreenBinding.derive(screen => screen === "success" ? "flex" : "none");
    
    // UI Content Bindings
    // Initialized with defaults, updated to theme in initializeUI
    private statusMessage = new Binding<string>("Enter your 6-digit verification code");
    private statusColor = new Binding<string>(DEFAULT_COLORS.textSecondary);
    private keyboardVisibility = new Binding<string>("flex");
    private playerNameDisplay = new Binding<string>("");
    
    // Individual character box bindings
    private charBindings: Binding<string>[] = Array(6).fill(null).map(() => new Binding<string>(""));
    
    // Animation bindings
    private charScaleBindings: AnimatedBinding[] = Array(6).fill(null).map(() => new AnimatedBinding(1));
    private charOpacityBindings: AnimatedBinding[] = Array(6).fill(null).map(() => new AnimatedBinding(0.5));
    private charBorderColorBindings: Binding<string>[] = Array(6).fill(null).map(() => new Binding<string>(DEFAULT_COLORS.border));

    // Screen Transition Bindings
    private contentOpacity = new AnimatedBinding(1);
    private contentScale = new AnimatedBinding(1);
    private successIconScale = new AnimatedBinding(0);
    
    // Header Animation Binding
    private headerAnimDriver = new AnimatedBinding(0);

    // Transition Timer Handle
    private transitionTimer: any = null;

    // ========================================================================
    // HELPER: KEY BUTTON COMPONENT (Method Version)
    // ========================================================================

    // Custom number/letter button for the input UI keyboard. Handles variant styles and optional animated border.
    private renderKeyButton(props: KeyButtonProps): UINode {
        const { variant = "default", width = 44, height = 44, animatedBorder = false } = props;
        
        let baseColor: any = this.theme.surfaceHighlight;
        let hoverColor: any = new Color(0.278, 0.333, 0.412).toHex(); // Approximate Slate 600
        let pressColor: any = new Color(0.118, 0.161, 0.231).toHex(); // Approximate Slate 800
        let textColor = this.theme.textMain;

        if (variant === "primary") {
            baseColor = this.theme.primary;
            hoverColor = this.theme.primaryHover;
            pressColor = this.theme.primaryPress;
        } else if (variant === "danger") {
            baseColor = this.theme.error;
            hoverColor = "#E11D48"; // Rose 600
            pressColor = "#BE123C"; // Rose 700
        } else if (variant === "ghost") {
            baseColor = "#00000000"; // transparent
            hoverColor = "#FFFFFF1A"; // 10% white
            pressColor = "#FFFFFF33"; // 20% white
        } else {
             // Default variant using theme
        }

        // 0: Idle, 1: Hover, 2: Press
        const interactionState = new AnimatedBinding(0);
        
        // Border Rotation Animation (only if enabled)
        const borderRotation = new AnimatedBinding(0);
        if (animatedBorder) {
            // Repeat timing 0 -> 360, ensuring smooth linear transition without jumps
            borderRotation.set(Animation.repeat(Animation.timing(360, { duration: 2000, easing: Easing.linear })));
        }

        const buttonContent = Text({
            text: props.label,
            style: {
                color: textColor,
                fontSize: 16,
                fontWeight: "600",
                fontFamily: FONTS.main,
            },
        });

        const buttonFaceStyle: ViewStyle = {
            backgroundColor: interactionState.interpolate(
                [0, 1, 2],
                [baseColor, hoverColor, pressColor]
            ),
            borderRadius: 8,
            height: height, 
            width: width,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ 
                scale: interactionState.interpolate(
                    [0, 1, 2],
                    [1, 1.05, 0.95]
                ) 
            }],
        };

        if (animatedBorder) {
            // Wrap content with rotating border background
            return Pressable({
                children: [
                    // Rotating Gradient Background
                    View({
                        style: {
                            position: 'absolute',
                            width: width + 50, // Ensure it covers rotation corners
                            height: width + 50, // Make it square to rotate evenly
                            backgroundColor: 'transparent',
                            gradientColorA: 'rgba(255,255,255,0)',
                            gradientColorB: 'rgba(255,255,255,0.8)',
                            gradientAngle: '90deg', // Fixed direction relative to view, but view rotates
                            transform: [{ rotate: borderRotation.interpolate([0, 360], ['0deg', '360deg']) }],
                        }
                    }),
                    // Button Face (slightly smaller to show border)
                    View({
                        children: [buttonContent],
                        style: {
                            ...buttonFaceStyle,
                            width: width - 4,
                            height: height - 4,
                        }
                    })
                ],
                onClick: props.onClick,
                onEnter: (player: hz.Player) => {
                    interactionState.set(Animation.timing(1, { duration: 150, easing: Easing.out(Easing.ease) }), undefined, [player]);
                },
                onExit: (player: hz.Player) => {
                    interactionState.set(Animation.timing(0, { duration: 150, easing: Easing.out(Easing.ease) }), undefined, [player]);
                },
                onPress: (player: hz.Player) => {
                    interactionState.set(Animation.timing(2, { duration: 50, easing: Easing.out(Easing.ease) }), undefined, [player]);
                },
                onRelease: (player: hz.Player) => {
                    interactionState.set(Animation.timing(1, { duration: 150, easing: Easing.out(Easing.ease) }), undefined, [player]);
                },
                style: {
                    width: width,
                    height: height,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden', // Clip the rotating large background
                    borderRadius: 10, // Outer radius
                    margin: 4,
                    backgroundColor: this.theme.surfaceHighlight, // Fallback/Border base
                    ...props.style,
                }
            });
        }

        return Pressable({
            children: buttonContent,
            onClick: props.onClick,
            onEnter: (player: hz.Player) => {
                interactionState.set(Animation.timing(1, { duration: 150, easing: Easing.out(Easing.ease) }), undefined, [player]);
            },
            onExit: (player: hz.Player) => {
                interactionState.set(Animation.timing(0, { duration: 150, easing: Easing.out(Easing.ease) }), undefined, [player]);
            },
            onPress: (player: hz.Player) => {
                interactionState.set(Animation.timing(2, { duration: 50, easing: Easing.out(Easing.ease) }), undefined, [player]);
            },
            onRelease: (player: hz.Player) => {
                interactionState.set(Animation.timing(1, { duration: 150, easing: Easing.out(Easing.ease) }), undefined, [player]);
            },
            style: {
                ...buttonFaceStyle,
                margin: 4,
                ...props.style,
            } as ViewStyle,
        });
    }

    // ========================================================================
    // SCREEN NAVIGATION
    // ========================================================================

    // Screen/state navigation: all transitions use opacity/scale with a small delay for smoothness
    private showWelcomeScreen(): void {
        this.animateScreenTransition("welcome");
        this.playHeaderAnimation();
    }

    private playHeaderAnimation() {
        const textLen = this.props.welcomeHeaderText.length;
        const endValue = textLen + 2;
        const singlePassDuration = endValue * 300;

        this.async.setTimeout(() => {
            this.headerAnimDriver.set(0);
            this.async.setTimeout(() => {
                this.headerAnimDriver.set(
                    Animation.repeat(
                        Animation.sequence(
                            Animation.timing(endValue, { duration: singlePassDuration, easing: Easing.linear }),
                            Animation.timing(0, { duration: singlePassDuration, easing: Easing.linear })
                        )
                    )
                );
            }, 100);
        }, 200);
    }

    private showInputScreen(): void {
        this.animateScreenTransition("input");
    }

    private showSuccessScreen(): void {
        this.animateScreenTransition("success");
        this.successIconScale.set(0);
        this.async.setTimeout(() => {
            this.successIconScale.set(
                Animation.sequence(
                    Animation.timing(1.2, { duration: 300, easing: Easing.out(Easing.back) }),
                    Animation.timing(1, { duration: 150, easing: Easing.out(Easing.ease) })
                )
            );
        }, 400);
    }

    private animateScreenTransition(targetScreen: "welcome" | "input" | "success"): void {
        // Clear any pending transition to prevent race conditions or flickering
        if (this.transitionTimer) {
            this.async.clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }

        this.contentOpacity.set(Animation.timing(0, { duration: 200, easing: Easing.in(Easing.ease) }));
        this.contentScale.set(Animation.timing(0.95, { duration: 200, easing: Easing.in(Easing.ease) }));
        
        this.transitionTimer = this.async.setTimeout(() => {
            this.currentScreen = targetScreen;
            this.currentScreenBinding.set(targetScreen);
            
            this.contentOpacity.set(Animation.timing(1, { duration: 300, easing: Easing.out(Easing.back) }));
            this.contentScale.set(Animation.timing(1, { duration: 300, easing: Easing.out(Easing.back) }));
            this.transitionTimer = null;
        }, 200);
    }


    // ========================================================================
    // UI INITIALIZATION
    // ========================================================================

    // Theme is resolved at runtime, merges user's color props and applies shade math for highlight/contrast
    private getTheme(): Theme {
        const bg = this.props.backgroundColor;
        const text = this.props.textColor;
        const accent = this.props.accentColor;

        // Helper to lighten a color (simulate 'surfaceHighlight')
        // Adding a small value to RGB to make it lighter
        const lighten = (c: Color, amount: number) => {
            return new Color(
                Math.min(1, c.r + amount),
                Math.min(1, c.g + amount),
                Math.min(1, c.b + amount)
            );
        };
        
        const darken = (c: Color, factor: number) => {
            return new Color(c.r * factor, c.g * factor, c.b * factor);
        };

        return {
            background: bg.toHex(), 
            surface: bg.toHex(),
            surfaceHighlight: lighten(bg, 0.1).toHex(), 
            primary: accent.toHex(),
            primaryHover: lighten(accent, 0.1).toHex(),
            primaryPress: darken(accent, 0.9).toHex(),
            success: "#10B981",
            error: "#F43F5E",
            textMain: text.toHex(),
            textSecondary: darken(text, 0.6).toHex(), 
            border: lighten(bg, 0.1).toHex(),
        };
    }

    // Main entry point to build UI. This method gets called by the engine to mount the root panel.
    initializeUI() {
        // Initialize Theme from Props
        this.theme = this.getTheme();

        // Update initial values of bindings to match theme
        this.statusColor.set(this.theme.textSecondary);
        this.charBorderColorBindings.forEach(b => b.set(this.theme.border));

        return View({
            children: [
                // ============================================================
                // WELCOME SCREEN
                // ============================================================
                View({
                    children: [
                        // User Badge
                        this.renderUserBadge(),

                        // Header Section
                        View({
                            children: [
                                this.renderAnimatedHeader(),
                                Text({
                                    text: this.props.welcomeSubheaderText,
                                    style: {
                                        fontSize: 14,
                                        fontFamily: FONTS.main,
                                        color: this.theme.textSecondary,
                                        textAlign: "center",
                                        marginBottom: 8,
                                        whiteSpace: 'normal',
                                    },
                                }),
                            ],
                            style: {
                                marginBottom: 32,
                                alignItems: "center",
                                width: "100%",
                            }
                        }),

                        // Steps Container
                        View({
                            children: [
                                this.renderStepCard(1, "Join Discord", `Join our Discord at ${this.props.discordLinkText}`),
                                this.renderStepCard(2, "Get Code", this.props.discordCommandText),
                                this.renderStepCard(3, "Verify", "Enter the 6-digit code by pressing the button below"),
                            ],
                            style: {
                                flexDirection: "row",
                                justifyContent: "center",
                                width: "100%",
                                marginBottom: 32,
                            }
                        }),

                        // Primary Action
                        this.renderKeyButton({
                            label: "Start Verification",
                            onClick: () => this.showInputScreen(),
                            variant: "primary",
                            width: 200,
                            height: 56,
                            animatedBorder: true,
                            style: { marginBottom: 16 },
                        }),

                        // Footer
                        Text({
                            text: "Powered by HWLink.io | Clique Games",
                            style: {
                                fontSize: 10,
                                fontFamily: FONTS.main,
                                color: this.theme.textSecondary,
                                opacity: 0.6,
                                flexShrink: 0,
                                textAlign: "center",
                            }
                        }),
                    ],
                    style: {
                        display: this.welcomeScreenVisibility,
                        opacity: this.contentOpacity,
                        transform: [{ scale: this.contentScale }],
                        backgroundColor: this.theme.surface,
                        padding: 40,
                        borderRadius: 24,
                        alignItems: "center",
                        width: this.panelWidth,
                        height: this.panelHeight,
                        maxWidth: "95%",
                        maxHeight: "90%",
                        justifyContent: "center",
                        borderColor: this.theme.border,
                        borderWidth: 1,
                    },
                }),

                // ============================================================
                // INPUT SCREEN
                // ============================================================
                View({
                    children: [
                        // User Badge
                        this.renderUserBadge(),
                        
                        // Header
                        View({
                            children: [
                                Text({
                                    text: "Verify Code",
                                    style: {
                                        fontSize: 24,
                                        fontWeight: "700",
                                        fontFamily: FONTS.main,
                                        color: this.theme.textMain,
                                        marginBottom: 4,
                                    },
                                }),
                            ],
                            style: {
                                width: "100%",
                                alignItems: "center",
                                marginBottom: 16,
                            }
                        }),

                        // Code Display (Modern Input Fields)
                        View({
                            children: [
                                ...this.charBindings.map((charBinding, index) => {
                                    return View({
                                        children: [
                                            Text({
                                                text: charBinding,
                                                style: {
                                                    fontSize: 28,
                                                    fontWeight: "bold",
                                                    fontFamily: FONTS.mono,
                                                    color: this.theme.textMain,
                                                    opacity: this.charOpacityBindings[index],
                                                },
                                            }),
                                        ],
                                        style: {
                                            backgroundColor: "rgba(0,0,0,0.3)",
                                            borderRadius: 12,
                                            width: 48,
                                            height: 56,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            margin: 4,
                                            borderWidth: 2,
                                            borderColor: this.charBorderColorBindings[index],
                                            transform: [{ scale: this.charScaleBindings[index] }],
                                        } as ViewStyle,
                                    });
                                }),
                            ],
                            style: {
                                flexDirection: "row",
                                marginBottom: 16,
                                alignItems: "center",
                                justifyContent: "center",
                            },
                        }),

                        // Status Message
                        Text({
                            text: this.statusMessage,
                            style: {
                                fontSize: 14,
                                fontFamily: FONTS.main,
                                color: this.statusColor,
                                marginBottom: 16,
                                textAlign: "center",
                                height: 20,
                            },
                        }),

                        // Keyboard
                        View({
                            children: [
                                this.renderKeyboardRow(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]),
                                this.renderKeyboardRow(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]),
                                this.renderKeyboardRow(["A", "S", "D", "F", "G", "H", "J", "K", "L"]),
                                this.renderKeyboardRow(["Z", "X", "C", "V", "B", "N", "M"]),
                                
                                // Action Row
                                View({
                                    children: [
                                        this.renderKeyButton({
                                            label: "Back",
                                            onClick: () => this.showWelcomeScreen(),
                                            variant: "default",
                                            width: 80,
                                        }),
                                        this.renderKeyButton({
                                            label: "Clear",
                                            onClick: () => this.handleClear(),
                                            variant: "danger",
                                            width: 80,
                                            style: { marginLeft: 12, marginRight: 12 },
                                        }),
                                        this.renderKeyButton({
                                            label: "Submit",
                                            onClick: () => { void this.handleSubmit(); },
                                            variant: "primary",
                                            width: 120,
                                        }),
                                    ],
                                    style: {
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        marginTop: 12,
                                    },
                                }),
                            ],
                            style: {
                                display: this.keyboardVisibility,
                                flexDirection: "column",
                                width: "100%",
                                alignItems: "center",
                            },
                        }),
                    ],
                    style: {
                        display: this.inputScreenVisibility,
                        opacity: this.contentOpacity,
                        transform: [{ scale: this.contentScale }],
                        backgroundColor: this.theme.surface,
                        padding: 32,
                        borderRadius: 24,
                        alignItems: "center",
                        width: this.panelWidth,
                        height: this.panelHeight,
                        maxWidth: "95%",
                        maxHeight: "90%",
                        borderColor: this.theme.border,
                        borderWidth: 1,
                    },
                }),

                // ============================================================
                // SUCCESS SCREEN
                // ============================================================
                View({
                    children: [
                        // Success Icon Circle
                        View({
                            children: [
                                Text({
                                    text: "✔",
                                    style: {
                                        fontSize: 52,
                                        fontFamily: FONTS.main,
                                        color: this.theme.background, // Use main background color
                                        textAlign: "center",
                                    },
                                }),
                            ],
                            style: {
                                width: 96,
                                height: 96,
                                borderRadius: 48,
                                backgroundColor: this.theme.success,
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: 32,
                                transform: [{ scale: this.successIconScale }],
                                flexShrink: 0,
                            }
                        }),

                        Text({
                            text: "Successfully Linked!",
                            style: {
                                fontSize: 28,
                                fontWeight: "bold",
                                fontFamily: FONTS.main,
                                color: this.theme.textMain,
                                marginBottom: 16,
                                textAlign: "center",
                                flexShrink: 0,
                            },
                        }),

                        Text({
                            text: this.props.successMessageText,
                            style: {
                                fontSize: 16,
                                fontFamily: FONTS.main,
                                color: this.theme.textSecondary,
                                textAlign: "center",
                                width: "100%", // Ensure it takes available width but respects padding
                                maxWidth: 480, // Reduced from 520 to ensure it fits within padding (600 - 80 = 520)
                                lineHeight: 24,
                                flexShrink: 0,
                            },
                        }),
                    ],
                    style: {
                        display: this.successScreenVisibility,
                        opacity: this.contentOpacity,
                        transform: [{ scale: this.contentScale }],
                        backgroundColor: this.theme.surface,
                        padding: 40,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        width: this.panelWidth,
                        height: this.panelHeight,
                        maxWidth: "95%",
                        maxHeight: "90%",
                        borderColor: this.theme.border,
                        borderWidth: 1,
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

    // Renders the header title with per-character scale animation
    private renderAnimatedHeader(): UINode {
        const text = this.props.welcomeHeaderText;
        const chars = text.split("");
        
        return View({
            children: chars.map((char, index) => {
                const inputRange = [-1, index, index + 0.5, index + 1, chars.length + 10];
                const outputRange = [1, 1, 1.5, 1, 1];

                return Text({
                    text: char === " " ? "\u00A0" : char,
                    style: {
                        fontSize: 28,
                        fontWeight: "800",
                        fontFamily: FONTS.main,
                        color: this.theme.textMain,
                        textAlign: "center",
                        transform: [{ 
                            scale: this.headerAnimDriver.interpolate(inputRange, outputRange) 
                        }],
                    }
                });
            }),
            style: {
                flexDirection: "row",
                marginBottom: 8,
                justifyContent: "center",
                alignItems: "center",
            }
        });
    }

    // Renders a "Badge" style user chip at the top of the panel
    private renderUserBadge(): UINode {
        return View({
            children: [
                // Avatar/Icon placeholder
                View({
                    children: [Text({ text: "👤", style: { fontSize: 14, color: this.theme.surface } })],
                    style: {
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: this.theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                    }
                }),
                // Name
                Text({
                    text: this.playerNameDisplay,
                    style: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        fontFamily: FONTS.main,
                        color: this.theme.textMain,
                    }
                })
            ],
            style: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: this.theme.surfaceHighlight,
                paddingLeft: 4,
                paddingRight: 12,
                paddingTop: 4,
                paddingBottom: 4,
                borderRadius: 16,
                marginBottom: 24, // Spacing from whatever is below
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)"
            }
        });
    }

    // Shows a numbered step as a card in the onboarding flow (welcome panel)
    private renderStepCard(number: number, title: string, description: string): UINode {
        return View({
            children: [
                // Number Badge
                View({
                    children: [
                        Text({
                            text: number.toString(),
                            style: {
                                color: this.theme.background,
                                fontSize: 14,
                                fontWeight: "bold",
                                fontFamily: FONTS.main,
                            }
                        })
                    ],
                    style: {
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: this.theme.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                    }
                }),
                
                // Title
                Text({
                    text: title,
                    style: {
                        fontSize: 16,
                        fontWeight: "bold",
                        fontFamily: FONTS.main,
                        color: this.theme.textMain,
                        marginBottom: 8,
                        textAlign: "center",
                    }
                }),
                
                // Description
                Text({
                    text: description,
                    style: {
                        fontSize: 12,
                        fontFamily: FONTS.main,
                        color: this.theme.textSecondary,
                        textAlign: "center",
                        lineHeight: 16,
                        whiteSpace: 'normal',
                    }
                })
            ],
            style: {
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
                margin: 6,
                height: 160,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
            }
        });
    }

    // Renders a single keyboard row, used by the on-screen code input
    // defaults to uppercase letters except first # row
    private renderKeyboardRow(chars: string[]): UINode {
        return View({
            children: chars.map(char => 
                this.renderKeyButton({ 
                    label: char, 
                    onClick: () => this.handleCharacterInput(char),
                    width: 44,
                    style: { margin: 2 }
                })
            ),
            style: {
                flexDirection: "row",
                justifyContent: "center",
                marginBottom: 4,
            },
        });
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    // Standard scene/component lifecycle logic hooks here
    start() {
        this.ensureLocalPlayerContext();

        this.connectNetworkBroadcastEvent(VerifyCodeResponseEvent, (data: hz.SerializableState) => {
            this.handleVerifyResponse(data as { success: boolean; message: string; alreadyLinked?: boolean; codeAlreadyUsed?: boolean; });
        });

        this.connectNetworkBroadcastEvent(CheckLinkStatusResponseEvent, (data: hz.SerializableState) => {
            this.handleLinkStatusResponse(data as { isLinked: boolean; playerId: number; });
        });

        this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterWorld, (player: hz.Player) => {
            this.tryInitializeFromPlayer(player);
        });

        // Start header animation shortly after script start
        this.async.setTimeout(() => {
            this.playHeaderAnimation();
        }, 1000);
    }

    private ensureLocalPlayerContext(attempt: number = 0): void {
        // Defensive detection for local player vs. dedicated server context,
        // since UI can't operate until a real player is active.
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
        // Don't re-resolve if already correct
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
        this.playerNameDisplay.set(`${name}`);

        this.checkExistingLinkStatus();
    }

    // Checks with server if this player already linked a Discord account
    private checkExistingLinkStatus(): void {
        if (!this.localPlayer) {
            return;
        }

        this.sendNetworkBroadcastEvent(CheckLinkStatusRequestEvent, {
            playerId: this.localPlayer.id,
        });
    }

    private handleLinkStatusResponse(data: { isLinked: boolean; playerId: number }): void {
        // Only respond/update panel if this.player points to same horizon ID
        if (!this.localPlayer || data.playerId !== this.localPlayer.id) {
            return;
        }

        this.playerAlreadyLinked = data.isLinked;

        if (data.isLinked) {
            this.showSuccessScreen();
        } else {
            this.keyboardVisibility.set("flex");
        }
    }


    // ========================================================================
    // INPUT HANDLERS
    // ========================================================================

    // Character input for keyboard: Set code, animate box, update status.
    private handleCharacterInput(char: string): void {
        if (this.currentCode.length < CODE_LENGTH) {
            const index = this.currentCode.length;
            this.currentCode += char.toUpperCase();
            
            this.charBindings[index].set(char.toUpperCase());
            
            // Highlight the border for the active/filled char
            this.charBorderColorBindings[index].set(this.theme.primary);
            
            this.charScaleBindings[index].set(
                Animation.sequence(
                    Animation.timing(1.2, { duration: 150, easing: Easing.out(Easing.ease) }),
                    Animation.timing(1, { duration: 150, easing: Easing.inOut(Easing.ease) })
                )
            );
            this.charOpacityBindings[index].set(Animation.timing(1, { duration: 150, easing: Easing.ease }));
            
            const newStatusMessage = `Entering code... ${this.currentCode.length}/${CODE_LENGTH}`;
            this.statusMessage.set(newStatusMessage);
            this.statusColor.set(this.theme.textSecondary);
        }
    }

    // Resets all code input fields and status message.
    private handleClear(): void {
        this.currentCode = "";
        
        for (let i = 0; i < CODE_LENGTH; i++) {
            this.charBindings[i].set("");
            this.charScaleBindings[i].set(Animation.timing(1, { duration: 100, easing: Easing.ease }));
            this.charOpacityBindings[i].set(Animation.timing(0.5, { duration: 200, easing: Easing.ease }));
            this.charBorderColorBindings[i].set(this.theme.border);
        }
        
        this.statusMessage.set("Enter your 6-digit verification code");
        this.statusColor.set(this.theme.textSecondary);
    }

    // Called on "Submit" enter - main entry point for network request. Validates state and sends req.
    private async handleSubmit(): Promise<void> {
        if (this.currentCode.length !== CODE_LENGTH) {
            this.statusMessage.set(`Code must be exactly ${CODE_LENGTH} characters!`);
            this.statusColor.set(this.theme.error);
            return;
        }

        if (!this.playerUsername) {
            this.statusMessage.set("Connecting to server...");
            this.statusColor.set(this.theme.primary);
            return;
        }

        if (this.playerAlreadyLinked) {
            this.handleClear();
            this.statusMessage.set("You've already been verified!");
            this.statusColor.set(this.theme.success);
            return;
        }

        const submittedCode = this.currentCode.toUpperCase();

        this.statusMessage.set("Verifying code...");
        this.statusColor.set(this.theme.textMain);

        if (!this.localPlayer) {
            this.statusMessage.set("Connection error. Please retry.");
            this.statusColor.set(this.theme.error);
            return;
        }

        this.sendNetworkBroadcastEvent(VerifyCodeRequestEvent, {
            code: submittedCode,
            username: this.playerUsername,
            playerId: this.localPlayer.id,
        });
    }

    // ========================================================================
    // RESPONSE HANDLERS
    // ========================================================================

    // Handles response for code verification - also handles alreadyVerified response.
    private handleVerifyResponse(data: {
        success: boolean;
        message: string;
        alreadyLinked?: boolean;
        codeAlreadyUsed?: boolean;
    }): void {
        if (data.success) {
            this.playerAlreadyLinked = true;
            this.handleClear();
            
            this.statusMessage.set("Success!");
            this.statusColor.set(this.theme.success);
            
            console.log(`Player ${this.playerUsername} verified successfully!`);

            this.async.setTimeout(() => {
                this.showSuccessScreen();
            }, 800);
        } else {
            this.currentCode = "";
            
            // Clear visuals but keep status message
            for (let i = 0; i < CODE_LENGTH; i++) {
                this.charBindings[i].set("");
                this.charOpacityBindings[i].set(Animation.timing(0.5, { duration: 200, easing: Easing.ease }));
                this.charBorderColorBindings[i].set(this.theme.border);
            }
            
            this.statusMessage.set(data.message);
            
            if (data.alreadyLinked) {
                this.playerAlreadyLinked = true;
                this.statusColor.set(this.theme.primary);
                this.async.setTimeout(() => {
                    this.showSuccessScreen();
                }, 1500);
            } else {
                this.statusColor.set(this.theme.error);
            }
        }
    }

}

// ============================================================================
// COMPONENT REGISTRATION
// ============================================================================

// Register the UIComponent so Horizon can instantiate it
UIComponent.register(HWLink);
