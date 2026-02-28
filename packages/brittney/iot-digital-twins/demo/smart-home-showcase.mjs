#!/usr/bin/env node

/**
 * 🏡 Smart Home VR Showcase Demo
 *
 * This demo generates a complete VR smart home from realistic IoT devices,
 * showcasing the full Clawdbot → HoloScript → VR pipeline.
 *
 * Features demonstrated:
 * - 20+ realistic IoT devices
 * - Multiple device types (lights, climate, security, entertainment)
 * - Real-time MQTT bindings
 * - Room-based spatial layout
 * - Professional HoloScript output
 */

import { ClawdbotGenerator } from '../dist/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Realistic Smart Home Device Data
// ============================================================================

const smartHomeDevices = [
  // === LIVING ROOM ===
  {
    entity_id: 'light.living_room_chandelier',
    state: 'on',
    attributes: {
      friendly_name: 'Living Room Chandelier',
      brightness: 200,
      color_temp: 370,
      rgb_color: [255, 247, 251],
      supported_features: 63,
    },
  },
  {
    entity_id: 'light.living_room_accent_lights',
    state: 'on',
    attributes: {
      friendly_name: 'Living Room Accent Lights',
      brightness: 150,
      rgb_color: [255, 120, 50],
      effect: 'colorloop',
    },
  },
  {
    entity_id: 'climate.living_room',
    state: 'heat',
    attributes: {
      friendly_name: 'Living Room Thermostat',
      temperature: 21.5,
      target_temperature: 22.0,
      current_temperature: 21.5,
      hvac_mode: 'heat',
      fan_mode: 'auto',
    },
  },
  {
    entity_id: 'media_player.living_room_tv',
    state: 'playing',
    attributes: {
      friendly_name: 'Living Room TV',
      volume_level: 0.35,
      media_title: 'Planet Earth II',
      app_name: 'Netflix',
    },
  },

  // === KITCHEN ===
  {
    entity_id: 'light.kitchen_ceiling',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen Ceiling Lights',
      brightness: 255,
      color_temp: 250,
    },
  },
  {
    entity_id: 'light.kitchen_under_cabinet',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen Under-Cabinet Lights',
      brightness: 180,
      rgb_color: [255, 255, 200],
    },
  },
  {
    entity_id: 'sensor.refrigerator_temperature',
    state: '3.5',
    attributes: {
      friendly_name: 'Refrigerator Temperature',
      unit_of_measurement: '°C',
      device_class: 'temperature',
    },
  },
  {
    entity_id: 'binary_sensor.dishwasher_running',
    state: 'on',
    attributes: {
      friendly_name: 'Dishwasher',
      device_class: 'running',
    },
  },

  // === BEDROOM ===
  {
    entity_id: 'light.bedroom_ceiling',
    state: 'off',
    attributes: {
      friendly_name: 'Bedroom Ceiling Light',
      brightness: 0,
    },
  },
  {
    entity_id: 'light.bedroom_bedside_left',
    state: 'on',
    attributes: {
      friendly_name: 'Bedside Lamp (Left)',
      brightness: 80,
      rgb_color: [255, 180, 100],
    },
  },
  {
    entity_id: 'light.bedroom_bedside_right',
    state: 'on',
    attributes: {
      friendly_name: 'Bedside Lamp (Right)',
      brightness: 80,
      rgb_color: [255, 180, 100],
    },
  },
  {
    entity_id: 'climate.bedroom',
    state: 'cool',
    attributes: {
      friendly_name: 'Bedroom AC',
      temperature: 19.0,
      target_temperature: 19.0,
      current_temperature: 20.5,
      hvac_mode: 'cool',
    },
  },
  {
    entity_id: 'sensor.bedroom_humidity',
    state: '45',
    attributes: {
      friendly_name: 'Bedroom Humidity',
      unit_of_measurement: '%',
      device_class: 'humidity',
    },
  },

  // === OFFICE ===
  {
    entity_id: 'light.office_desk',
    state: 'on',
    attributes: {
      friendly_name: 'Office Desk Lamp',
      brightness: 255,
      color_temp: 200, // Cool white for productivity
    },
  },
  {
    entity_id: 'switch.office_monitor_power',
    state: 'on',
    attributes: {
      friendly_name: 'Monitor Power',
      current_power_w: 45,
    },
  },
  {
    entity_id: 'sensor.office_air_quality',
    state: '450',
    attributes: {
      friendly_name: 'Office Air Quality (CO2)',
      unit_of_measurement: 'ppm',
      device_class: 'carbon_dioxide',
    },
  },

  // === SECURITY ===
  {
    entity_id: 'camera.front_door',
    state: 'idle',
    attributes: {
      friendly_name: 'Front Door Camera',
      motion_detected: false,
      recording: true,
      battery_level: 95,
    },
  },
  {
    entity_id: 'camera.backyard',
    state: 'recording',
    attributes: {
      friendly_name: 'Backyard Camera',
      motion_detected: true,
      recording: true,
      battery_level: 78,
    },
  },
  {
    entity_id: 'lock.front_door',
    state: 'locked',
    attributes: {
      friendly_name: 'Front Door Lock',
      battery_level: 92,
    },
  },
  {
    entity_id: 'lock.garage_door',
    state: 'unlocked',
    attributes: {
      friendly_name: 'Garage Door Lock',
      battery_level: 100,
    },
  },

  // === GARAGE ===
  {
    entity_id: 'cover.garage_door',
    state: 'closed',
    attributes: {
      friendly_name: 'Garage Door',
      current_position: 0,
      supported_features: 15,
    },
  },
  {
    entity_id: 'light.garage',
    state: 'off',
    attributes: {
      friendly_name: 'Garage Light',
      brightness: 0,
    },
  },

  // === OUTDOOR ===
  {
    entity_id: 'light.porch',
    state: 'on',
    attributes: {
      friendly_name: 'Porch Light',
      brightness: 200,
      color_temp: 400,
    },
  },
  {
    entity_id: 'sensor.outdoor_temperature',
    state: '15.5',
    attributes: {
      friendly_name: 'Outdoor Temperature',
      unit_of_measurement: '°C',
      device_class: 'temperature',
    },
  },
];

// ============================================================================
// Demo Execution
// ============================================================================

async function runDemo() {
  console.log('\n' + '═'.repeat(80));
  console.log('🏡 SMART HOME VR SHOWCASE DEMO');
  console.log('═'.repeat(80));
  console.log('\n📊 Demo Configuration:');
  console.log(`   • Total Devices: ${smartHomeDevices.length}`);
  console.log(`   • Device Types: ${new Set(smartHomeDevices.map(d => d.entity_id.split('.')[0])).size}`);
  console.log(`   • Layout Strategy: Room-based spatial arrangement`);
  console.log(`   • Real-time Sync: MQTT enabled (<100ms latency)`);

  console.log('\n🔧 Initializing Clawdbot Generator...');

  const generator = new ClawdbotGenerator({
    layoutStrategy: 'room',
    version: '3.4',
    enableBindings: true,
  });

  console.log('✅ Generator ready\n');

  console.log('🏗️  Generating HoloScript VR scene...');

  const startTime = Date.now();
  const result = await generator.generateFromHomeAssistant(
    smartHomeDevices,
    'Smart Home VR Dashboard'
  );
  const duration = Date.now() - startTime;

  console.log(`✅ Generation complete in ${duration}ms\n`);

  // ============================================================================
  // Output Statistics
  // ============================================================================

  console.log('📈 Generation Statistics:');
  console.log(`   • Devices Mapped: ${result.deviceCount}`);
  console.log(`   • HoloScript Size: ${(result.holoScript.length / 1024).toFixed(2)} KB`);
  console.log(`   • Lines of Code: ${result.holoScript.split('\n').length}`);
  console.log(`   • Performance: ${duration}ms (Target: <50ms)`);
  console.log(`   • Status: ${duration < 50 ? '🟢 Excellent' : duration < 100 ? '🟡 Good' : '🔴 Needs Optimization'}`);

  // ============================================================================
  // Device Breakdown
  // ============================================================================

  console.log('\n📊 Device Breakdown:');
  const deviceTypes = {};
  smartHomeDevices.forEach(device => {
    const type = device.entity_id.split('.')[0];
    deviceTypes[type] = (deviceTypes[type] || 0) + 1;
  });

  Object.entries(deviceTypes)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const icon = {
        light: '💡',
        climate: '🌡️',
        camera: '📹',
        lock: '🔒',
        switch: '🔌',
        sensor: '📊',
        binary_sensor: '⚡',
        cover: '🚪',
        media_player: '📺',
      }[type] || '🔧';
      console.log(`   ${icon} ${type.padEnd(15)} : ${count} device${count > 1 ? 's' : ''}`);
    });

  // ============================================================================
  // Save Generated HoloScript
  // ============================================================================

  console.log('\n💾 Saving Generated Files...');

  const outputDir = join(process.cwd(), 'demo', 'output');
  const holoFilePath = join(outputDir, 'smart-home-dashboard.holo');
  const statsFilePath = join(outputDir, 'generation-stats.json');

  try {
    // Ensure output directory exists
    await import('fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }));

    // Save HoloScript file
    writeFileSync(holoFilePath, result.holoScript, 'utf-8');
    console.log(`   ✅ HoloScript saved: ${holoFilePath}`);

    // Save statistics
    const stats = {
      timestamp: new Date().toISOString(),
      deviceCount: result.deviceCount,
      generationTime: duration,
      holoScriptSize: result.holoScript.length,
      linesOfCode: result.holoScript.split('\n').length,
      deviceTypes,
      devices: smartHomeDevices.map(d => ({
        id: d.entity_id,
        type: d.entity_id.split('.')[0],
        name: d.attributes.friendly_name,
        state: d.state,
      })),
    };
    writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf-8');
    console.log(`   ✅ Statistics saved: ${statsFilePath}`);

  } catch (error) {
    console.error(`   ❌ Error saving files: ${error.message}`);
  }

  // ============================================================================
  // Preview Generated HoloScript
  // ============================================================================

  console.log('\n📄 HoloScript Preview (first 50 lines):');
  console.log('─'.repeat(80));
  const previewLines = result.holoScript.split('\n').slice(0, 50);
  previewLines.forEach((line, i) => {
    console.log(`${String(i + 1).padStart(3)} │ ${line}`);
  });
  if (result.holoScript.split('\n').length > 50) {
    console.log('... │ (truncated - see full output in file)');
  }
  console.log('─'.repeat(80));

  // ============================================================================
  // Real-time MQTT Simulation
  // ============================================================================

  console.log('\n🔌 MQTT Real-time Sync Configuration:');
  console.log('   • Broker: mqtt://homeassistant.local:1883');
  console.log('   • Topic Pattern: homeassistant/+/+/state');
  console.log('   • Latency Target: <100ms');
  console.log('   • Bidirectional: ✅ VR ↔ Physical');
  console.log('\n   📝 Note: Connect to real MQTT broker to enable live sync');

  // ============================================================================
  // Next Steps
  // ============================================================================

  console.log('\n🚀 Next Steps:');
  console.log('   1. Open the generated .holo file in Hololand');
  console.log('   2. Connect to your Home Assistant MQTT broker');
  console.log('   3. Experience real-time VR control of your smart home');
  console.log('   4. Share the demo video/screenshots!');

  console.log('\n' + '═'.repeat(80));
  console.log('✨ DEMO COMPLETE - Ready to showcase!');
  console.log('═'.repeat(80) + '\n');

  // Return stats for programmatic use
  return {
    success: true,
    deviceCount: result.deviceCount,
    generationTime: duration,
    outputFile: holoFilePath,
    statsFile: statsFilePath,
  };
}

// ============================================================================
// Execute Demo
// ============================================================================

runDemo().catch(error => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});
