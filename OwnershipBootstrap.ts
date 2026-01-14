import * as hz from 'horizon/core';
import { PropTypes, Component, Entity, Player } from 'horizon/core';

// ============================================================================
// OWNERSHIP BOOTSTRAP SCRIPT
// ============================================================================
// This server-side script transfers ownership of entities to joining players.
// 
// NOTE: The uiPanel property has been removed because the Asset Pool gizmo
// now handles automatic assignment of UI panel instances to each player.
// This ensures all players can see and interact with their own private panel.
// ============================================================================

class OwnershipBootstrap extends Component<typeof OwnershipBootstrap> {
  static propsDefinition = {
    // NOTE: uiPanel removed - Asset Pool gizmo now handles UI panel assignment
    // Each player automatically gets their own panel instance from the pool
    gameManager: {
      type: PropTypes.Entity,
      description: 'The GameManager entity (optional) to transfer ownership'
    }
  };

  start() {
    console.log('OwnershipBootstrap: Starting...');
    
    // Listen for players entering the world
    this.connectCodeBlockEvent(
      this.entity,
      hz.CodeBlockEvents.OnPlayerEnterWorld,
      (player: Player) => {
        this.handlePlayerEnter(player);
      }
    );
    
    console.log('OwnershipBootstrap: Listening for player join events');
  }

  private handlePlayerEnter(player: Player) {
    console.log('='.repeat(60));
    console.log(`OwnershipBootstrap: Player ${player.name.get()} entered world`);
    console.log('='.repeat(60));
    
    try {
      // NOTE: UI Panel ownership is now handled by the Asset Pool gizmo
      // Each player automatically receives their own panel instance
      
      // Transfer ownership of Game Manager (if provided)
      if (this.props.gameManager) {
        console.log('Transferring ownership of Game Manager to player...');
        this.props.gameManager.owner.set(player);
        console.log('✅ Game Manager ownership transferred');
      }
      
      console.log('OwnershipBootstrap: Transfer complete');
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error('OwnershipBootstrap: Error transferring ownership:', error);
    }
  }
}

// Register the component
hz.Component.register(OwnershipBootstrap);
