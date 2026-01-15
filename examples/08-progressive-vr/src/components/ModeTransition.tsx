/**
 * Mode Transition Overlay
 *
 * Shown while transitioning between desktop and VR modes.
 * Provides visual feedback during the mode switch.
 */

interface ModeTransitionProps {
  targetMode: 'vr' | 'desktop';
}

export function ModeTransition({ targetMode }: ModeTransitionProps) {
  return (
    <div className="mode-transition">
      <div className="transition-content">
        <h2 className="transition-title">
          {targetMode === 'vr' ? 'Entering VR Mode' : 'Returning to Desktop'}
        </h2>
        <p className="transition-subtitle">
          {targetMode === 'vr'
            ? 'Put on your headset and prepare for immersion...'
            : 'Transitioning back to desktop view...'}
        </p>
        <div className="transition-spinner" />
      </div>
    </div>
  );
}
