import * as hz from 'horizon/core';
import { PropTypes, Component, Entity, Player } from 'horizon/core';

// ============================================================================
// OWNERSHIP BOOTSTRAP SCRIPT
// ============================================================================
// This small server-side script transfers ownership of the UI and related
// entities to the joining player, resolving 'running on server' warnings
// and ensuring Local UI works correctly.
// ============================================================================

class OwnershipBootstrap extends Component<typeof OwnershipBootstrap> {
  static propsDefinition = {
    uiPanel: {
      type: PropTypes.Entity,
      description: 'The Custom UI Panel (UIGizmo) to transfer ownership'
    },
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
      // Transfer ownership of UI Panel
      if (this.props.uiPanel) {
        console.log('Transferring ownership of UI Panel to player...');
        this.props.uiPanel.owner.set(player);
        console.log('✅ UI Panel ownership transferred');
      } else {
        console.warn('⚠️ No UI Panel entity specified');
      }
      
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

