/**
 * Genesis - The Origin of Holoverse
 * 
 * A showcase scene for the Founder Demo demonstrating:
 * - Particle Systems (Starfield)
 * - Physics (Floating Monoliths)
 * - Audio (Ambient Soundscape)
 * - AI Presence (Brittney Avatar)
 * - Interactive UI
 */

scene Genesis {
  // Global ambience
  @environment {
    skybox: "space_nebula_purple",
    gravity: [0, -0.5, 0], // Low gravity
    fog: {
      color: "#1a0b2e",
      density: 0.02
    }
  }

  // Ambient Audio
  @audio {
    source: "ambient_space_drone.mp3",
    loop: true,
    volume: 0.4,
    spatial: false
  }

  // 1. The Central Monolith (Physics & Reflection)
  object Monolith {
    mesh: "cube",
    scale: [1, 4, 0.2],
    position: [0, 2, -5],
    
    @material {
      type: "pbr",
      color: "#000000",
      roughness: 0.1,
      metalness: 0.9,
      emissive: "#2a0055",
      emissiveIntensity: 0.5
    }

    @physics {
      mass: 0, // Static
      collider: "box"
    }

    @interact {
      onHover: "scale(1.1)",
      onClick: "brittney_ask('What represents this monolith?')"
    }
  }

  // 2. Data Streams (Particles)
  object DataStream {
    position: [0, 0, 0],
    
    @particles {
      count: 2000,
      texture: "code_glyph.png",
      color: ["#00ffaa", "#0055ff"],
      lifetime: 5.0,
      speed: 0.5,
      emissionRate: 50,
      shape: "cone"
    }
  }

  // 3. Brittney Avatar Placeholder
  object BrittneyAvatar {
    mesh: "capsule",
    position: [2, 1.5, -3],
    
    @material {
      type: "hologram",
      color: "#00ff00",
      opacity: 0.8,
      glitchIntensity: 0.1
    }

    @ui {
      type: "floating_text",
      text: "I am Brittney. Ask me anything.",
      offset: [0, 1.2, 0]
    }
  }

  // 4. Interactive Orb (Physics Toy)
  object WisdomOrb {
    mesh: "sphere",
    scale: [0.5, 0.5, 0.5],
    position: [-1, 2, -2],
    
    @material {
      type: "glass",
      color: "#ff0055",
      transmission: 0.9
    }

    @physics {
      mass: 1.0,
      restitution: 0.9 // Bouncy
    }

    @manipulate {
      grab: true,
      throw: true
    }
  }

  // 5. Dashboard Panel
  component DashboardPanel {
    @ui_panel {
      width: 800,
      height: 600,
      position: [0, 1.5, -4],
      rotation: [0, 0, 0],
      content: "<h1>Holoverse System Status</h1><div id='stats'></div>"
    }

    script {
      onStart: `
        // Subscribe to mesh stats
        const updateStats = async () => {
          const status = await brittney_get_mesh_status();
          document.getElementById('stats').innerHTML = 
            'Agents: ' + status.agents.length + '<br>' +
            'Servers: ' + status.servers.length;
        };
        setInterval(updateStats, 5000);
      `
    }
  }
}
