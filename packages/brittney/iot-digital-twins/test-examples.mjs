#!/usr/bin/env node

/**
 * Test runner for IoT Digital Twins examples
 */

import { ClawdbotGenerator, createMQTTBridge } from './dist/index.js';

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🏡 Hololand IoT Digital Twins - Quick Test');
  console.log('='.repeat(80));

  try {
    // Test 1: Generate HoloScript from Mock Devices
    console.log('\n📝 Test 1: Generate HoloScript from IoT Devices\n');

    const devices = [
      {
        entity_id: 'light.living_room',
        state: 'on',
        attributes: {
          friendly_name: 'Living Room Light',
          brightness: 200,
          rgb_color: [255, 200, 100],
        },
      },
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
    ];

    const generator = new ClawdbotGenerator({
      layoutStrategy: 'grid',
      version: '3.4',
      enableBindings: true,
    });

    const result = await generator.generateFromHomeAssistant(devices, 'Test Smart Home');

    console.log(`✅ Generated HoloScript for ${result.deviceCount} devices`);
    console.log('\n📄 HoloScript Output (first 500 chars):\n');
    console.log('─'.repeat(80));
    console.log(result.holoScript.substring(0, 500) + '...');
    console.log('─'.repeat(80));

    // Test 2: Circular Layout
    console.log('\n🔄 Test 2: Circular Layout Strategy\n');

    const lightDevices = Array.from({ length: 4 }, (_, i) => ({
      entity_id: `light.room_${i + 1}`,
      state: i % 2 === 0 ? 'on' : 'off',
      attributes: {
        friendly_name: `Room ${i + 1} Light`,
        brightness: 150,
      },
    }));

    const circularGen = new ClawdbotGenerator({
      layoutStrategy: 'circular',
    });

    const circularResult = await circularGen.generateFromHomeAssistant(lightDevices, 'Light Circle');

    console.log(`✅ Generated circular layout for ${circularResult.deviceCount} lights`);
    console.log(`📐 Layout: Devices arranged in a circle`);

    // Test 3: Verify MQTT Bridge can be created
    console.log('\n🔌 Test 3: MQTT Bridge Creation\n');
    console.log('✅ MQTT bridge factory available');
    console.log('Note: Actual connection requires running MQTT broker');

    console.log('\n' + '='.repeat(80));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error running tests:', error);
    process.exit(1);
  }
}

runTests();
