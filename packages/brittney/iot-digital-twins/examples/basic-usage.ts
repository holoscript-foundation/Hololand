/**
 * Basic Usage Example - IoT Digital Twins
 *
 * This example shows how to use the Clawdbot generator to convert
 * Home Assistant devices into HoloScript compositions.
 */

import { ClawdbotGenerator, createMQTTBridge } from '../dist/index.js';
import type { HomeAssistantDevice } from '../dist/types.js';

// ============================================================================
// Example 1: Generate HoloScript from Mock Devices
// ============================================================================

async function example1_generateHoloScript() {
  console.log('\n📝 Example 1: Generate HoloScript from IoT Devices\n');

  const devices: HomeAssistantDevice[] = [
    // Living Room Light
    {
      entity_id: 'light.living_room',
      state: 'on',
      attributes: {
        friendly_name: 'Living Room Light',
        brightness: 200,
        rgb_color: [255, 200, 100],
      },
    },

    // Bedroom Thermostat
    {
      entity_id: 'climate.bedroom',
      state: 'heat',
      attributes: {
        friendly_name: 'Bedroom Thermostat',
        temperature: 21.5,
        target_temperature: 23.0,
        hvac_mode: 'heat',
      },
    },

    // Front Door Camera
    {
      entity_id: 'camera.front_door',
      state: 'idle',
      attributes: {
        friendly_name: 'Front Door Camera',
        motion_detected: false,
        recording: true,
      },
    },

    // Garage Door Lock
    {
      entity_id: 'lock.garage',
      state: 'locked',
      attributes: {
        friendly_name: 'Garage Door Lock',
        battery_level: 92,
      },
    },
  ];

  const generator = new ClawdbotGenerator({
    layoutStrategy: 'grid',
    version: '3.4',
    enableBindings: true,
  });

  const result = await generator.generateFromHomeAssistant(devices, 'My Smart Home');

  console.log(`✅ Generated HoloScript for ${result.deviceCount} devices\n`);
  console.log('📄 HoloScript Output:\n');
  console.log('─'.repeat(80));
  console.log(result.holoScript);
  console.log('─'.repeat(80));
}

// ============================================================================
// Example 2: Circular Layout
// ============================================================================

async function example2_circularLayout() {
  console.log('\n🔄 Example 2: Circular Layout Strategy\n');

  const devices: HomeAssistantDevice[] = Array.from({ length: 8 }, (_, i) => ({
    entity_id: `light.room_${i + 1}`,
    state: i % 2 === 0 ? 'on' : 'off',
    attributes: {
      friendly_name: `Room ${i + 1} Light`,
      brightness: Math.floor(Math.random() * 255),
      rgb_color: [
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
      ] as [number, number, number],
    },
  }));

  const generator = new ClawdbotGenerator({
    layoutStrategy: 'circular',
  });

  const result = await generator.generateFromHomeAssistant(devices, 'Light Show');

  console.log(`✅ Generated circular layout for ${result.deviceCount} lights`);
  console.log(`📐 Layout: Devices arranged in a circle\n`);
}

// ============================================================================
// Example 3: MQTT Bridge (Simulated)
// ============================================================================

async function example3_mqttBridge() {
  console.log('\n🔌 Example 3: MQTT Bridge Setup\n');

  console.log('Note: This example shows MQTT bridge setup.');
  console.log('To actually connect, you need a running MQTT broker.\n');

  const exampleCode = `
// Connect to Home Assistant MQTT broker
const bridge = await createMQTTBridge({
  url: 'mqtt://homeassistant.local:1883',
  username: 'homeassistant',
  password: 'your-password',
  topics: ['homeassistant/#']
});

// Listen for real-time state updates
bridge.onStateUpdate((update) => {
  console.log(\`Device \${update.entityId} changed to \${update.state}\`);
  // Update VR scene in real-time (<100ms latency)
});

// Control device from VR
await bridge.publishStateUpdate('light.living_room', 'on', {
  brightness: 255,
  rgb_color: [255, 100, 50]
});

console.log('✅ MQTT bridge connected and listening');
  `;

  console.log(exampleCode);
}

// ============================================================================
// Example 4: Custom Device Mappings
// ============================================================================

async function example4_customMappings() {
  console.log('\n⚙️  Example 4: Custom Device Mappings\n');

  const devices: HomeAssistantDevice[] = [
    {
      entity_id: 'light.custom_rgb_strip',
      state: 'on',
      attributes: {
        friendly_name: 'RGB Light Strip',
        brightness: 255,
        rgb_color: [255, 0, 255],
      },
    },
  ];

  const generator = new ClawdbotGenerator({
    customMappings: {
      light: {
        holoTraits: ['@sensor', '@controllable', '@networked', '@emissive', '@animated'],
        holoGeometry: 'icosahedron',
        holoState: {
          power: 'boolean',
          brightness: 'number',
          color: 'string',
        },
        icon: 'wb_incandescent',
        color: '#FF00FF',
      },
    },
  });

  const result = await generator.generateFromHomeAssistant(devices, 'Custom Light');

  console.log('✅ Generated with custom mapping (icosahedron geometry)');
  console.log('📄 HoloScript snippet:\n');
  const lines = result.holoScript.split('\n').slice(7, 15);
  lines.forEach((line) => console.log(line));
}

// ============================================================================
// Run All Examples
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🏡 Hololand IoT Digital Twins - Usage Examples');
  console.log('='.repeat(80));

  try {
    await example1_generateHoloScript();
    await example2_circularLayout();
    await example3_mqttBridge();
    await example4_customMappings();

    console.log('\n' + '='.repeat(80));
    console.log('✅ All examples completed successfully!');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
