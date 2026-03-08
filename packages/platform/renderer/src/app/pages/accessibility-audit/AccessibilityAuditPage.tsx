/**
 * Accessibility Audit Dashboard Page
 *
 * Page wrapper that integrates the AccessibilityAuditDashboard component
 * into the Hololand application shell. Provides a demo scan using the
 * built-in WCAG-compliant museum example to demonstrate the scanner.
 *
 * Responsibilities:
 *   - Renders within the application layout
 *   - Provides sample .holo content for demo scanning
 *   - Provides page-level metadata (document title)
 *   - Maintains WCAG 2.1 AA accessibility
 *
 * @module pages/accessibility-audit/AccessibilityAuditPage
 */

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import {
  AccessibilityAuditDashboard,
  useAccessibilityAudit,
} from '../../components/accessibility-audit-dashboard';

// =============================================================================
// DEMO HOLO CONTENT
// =============================================================================

/**
 * A small .holo file for demonstration. In production, this would be loaded
 * from the filesystem or supplied by the HoloScript toolchain.
 */
const DEMO_HOLO_SOURCE = `
composition "Demo Scene" {
  environment {
    skybox: "studio_hdr"
    ambient_light: 0.6
    shadows: true
  }

  accessibility {
    font_scale: 1.0
    contrast_mode: "normal"
    reduce_motion: false
    screen_reader: true
    locale: "en-US"
  }

  template "InteractiveBase" {
    @accessible {
      role: "button"
      focus_visible: true
      tab_index: 0
    }
    @high_contrast {
      mode: "auto"
      outline_width: 2
      outline_color: "#FFFF00"
    }
  }

  object "WelcomeSign" {
    @accessible {
      role: "heading"
      label: "Welcome to the Demo"
      description: "A welcome sign at the entrance"
      tab_index: 1
      focus_visible: true
    }
    @alt_text {
      text: "Welcome sign reading: Welcome to the Demo Scene"
      verbose: "A large floating sign at the entrance of the demo scene"
      language: "en"
    }
    @screen_reader {
      semantic_structure: true
      navigation_order: 1
      reading_mode: "linear"
      verbosity: "verbose"
    }
    @high_contrast {
      mode: "auto"
      outline_width: 2
      outline_color: "#FFFFFF"
    }

    geometry: "cube"
    position: [0, 2, -3]
    scale: [2, 0.5, 0.1]
    color: "#1a1a2e"
    text: "Welcome to the Demo"
    fontSize: 0.08
    fontColor: "#ffffff"
  }

  object "InteractiveOrb" using "InteractiveBase" {
    @alt_text {
      text: "Glowing interactive orb"
      verbose: "A cyan glowing sphere that responds to interaction"
      language: "en"
    }
    @screen_reader {
      semantic_structure: true
      navigation_order: 2
      reading_mode: "spatial"
      verbosity: "verbose"
      announce_changes: true
    }
    @haptic_cue {
      pattern: "pulse"
      intensity: 0.5
      duration: 80
      trigger_on: "interact"
    }
    @motion_reduced {
      reduce_animations: true
      fade_transitions: true
    }

    geometry: "sphere"
    position: [0, 1.5, -2]
    scale: 0.3
    color: "#00ffff"

    animation pulse {
      property: "scale"
      from: 0.3
      to: 0.35
      duration: 2000
      loop: infinite
    }

    on_activate() {
      audio.play("orb_activate")
    }
  }

  object "InfoPanel" {
    @accessible {
      role: "region"
      label: "Information Panel"
      description: "Displays scene information and controls"
      tab_index: 3
      focus_visible: true
      live_region: "polite"
    }
    @alt_text {
      text: "Information panel showing scene details"
      language: "en"
    }
    @screen_reader {
      semantic_structure: true
      navigation_order: 3
      announce_changes: true
    }
    @high_contrast {
      mode: "auto"
      outline_width: 2
    }

    geometry: "cube"
    position: [2, 1.5, -2]
    scale: [1, 0.8, 0.05]
    color: "#0a0a2e"
    text: "Scene Info"
    fontSize: 0.04
    fontColor: "#e0e0e0"
  }

  object "BackgroundMusic" {
    audio_source "BGM" {
      clip: "sounds/ambient.ogg"
      volume: 0.3
      loop: true
    }
  }

  object "StaticDecoration" {
    geometry: "cube"
    position: [-2, 0.5, -3]
    scale: [1, 1, 1]
    color: "#886644"
  }
}
`;

// =============================================================================
// PAGE COMPONENT
// =============================================================================

const AccessibilityAuditPage: React.FC = () => {
  const [state, actions] = useAccessibilityAudit();
  const [customSource, setCustomSource] = useState('');

  // Set document title
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'A11y Audit | Hololand';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Scan demo file on mount
  useEffect(() => {
    if (!state.report && !state.isScanning) {
      actions.runScan([
        {
          fileName: 'demo-scene.holo',
          filePath: '/examples/demo-scene.holo',
          source: DEMO_HOLO_SOURCE,
        },
      ]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScanCustom = useCallback(() => {
    if (customSource.trim()) {
      actions.runScan([
        {
          fileName: 'custom-input.holo',
          filePath: '/custom-input.holo',
          source: customSource,
        },
      ]);
    }
  }, [customSource, actions]);

  const handleScanDemo = useCallback(() => {
    actions.runScan([
      {
        fileName: 'demo-scene.holo',
        filePath: '/examples/demo-scene.holo',
        source: DEMO_HOLO_SOURCE,
      },
    ]);
  }, [actions]);

  return (
    <article
      aria-labelledby="a11y-audit-page-heading"
      style={{ padding: '0' }}
    >
      <h2
        id="a11y-audit-page-heading"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        Accessibility Audit Dashboard
      </h2>

      {/* Scan Controls */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(8, 12, 28, 0.92)',
          borderBottom: '1px solid rgba(48, 52, 80, 0.85)',
          borderRadius: '8px 8px 0 0',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleScanDemo}
          style={{
            fontSize: '0.75rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            color: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '4px',
            padding: '0.3rem 0.6rem',
            cursor: 'pointer',
          }}
          aria-label="Scan demo .holo file"
        >
          Scan Demo
        </button>

        <textarea
          value={customSource}
          onChange={(e) => setCustomSource(e.target.value)}
          placeholder="Paste .holo source here..."
          style={{
            flex: 1,
            minWidth: '200px',
            maxHeight: '60px',
            fontSize: '0.65rem',
            fontFamily: 'monospace',
            color: '#e8e8f8',
            backgroundColor: 'rgba(16, 20, 44, 0.88)',
            border: '1px solid rgba(48, 52, 80, 0.85)',
            borderRadius: '4px',
            padding: '0.3rem 0.5rem',
            resize: 'vertical',
          }}
          aria-label="Custom .holo source input"
        />

        <button
          type="button"
          onClick={handleScanCustom}
          disabled={!customSource.trim()}
          style={{
            fontSize: '0.75rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            color: customSource.trim() ? '#22c55e' : '#7880a8',
            backgroundColor: customSource.trim() ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
            border: `1px solid ${customSource.trim() ? 'rgba(34, 197, 94, 0.3)' : 'rgba(48, 52, 80, 0.85)'}`,
            borderRadius: '4px',
            padding: '0.3rem 0.6rem',
            cursor: customSource.trim() ? 'pointer' : 'not-allowed',
          }}
          aria-label="Scan custom .holo source"
        >
          Scan Custom
        </button>
      </div>

      {/* Dashboard */}
      <AccessibilityAuditDashboard
        externalState={state}
        externalActions={actions}
        mode="dashboard"
        ariaLabel="Accessibility Audit Dashboard"
        style={{
          borderRadius: '0 0 8px 8px',
        }}
      />
    </article>
  );
};

export default AccessibilityAuditPage;
