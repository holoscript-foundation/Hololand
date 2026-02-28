#!/usr/bin/env node

/**
 * 🎥 Automated Demo Recording
 *
 * Records the IoT Digital Twins demo using Hololand's built-in
 * video recording capabilities.
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Recording configuration
const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 60,
  duration: 120000, // 2 minutes in ms
  outputPath: join(__dirname, 'output', 'demo-recording.webm'),
};

async function recordDemo() {
  console.log('🎥 Starting Automated Demo Recording\n');
  console.log('Configuration:');
  console.log(`  Resolution: ${CONFIG.width}x${CONFIG.height}`);
  console.log(`  FPS: ${CONFIG.fps}`);
  console.log(`  Duration: ${CONFIG.duration / 1000}s`);
  console.log(`  Output: ${CONFIG.outputPath}\n`);

  // Launch headless browser
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${CONFIG.width},${CONFIG.height}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: CONFIG.width,
    height: CONFIG.height,
    deviceScaleFactor: 1,
  });

  console.log('✅ Browser ready\n');

  try {
    // Step 1: Navigate to visualizer
    console.log('📄 Loading visualizer...');
    const visualizerPath = 'file://' + join(__dirname, 'visualizer.html');
    await page.goto(visualizerPath, { waitUntil: 'networkidle0' });
    console.log('✅ Visualizer loaded\n');

    // Step 2: Inject recording script
    console.log('🎬 Starting canvas recording...');

    await page.evaluate((config) => {
      return new Promise((resolve) => {
        // Get canvas element
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          throw new Error('Canvas not found');
        }

        // Create media recorder from canvas stream
        const stream = canvas.captureStream(config.fps);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 8000000, // 8 Mbps
        });

        const chunks = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            window.__recordingData = reader.result;
            resolve();
          };
          reader.readAsDataURL(blob);
        };

        // Store recorder on window for later access
        window.__mediaRecorder = mediaRecorder;
        window.__recordingChunks = chunks;

        // Start recording
        mediaRecorder.start();
        console.log('Recording started');

        // Schedule stop after duration
        setTimeout(() => {
          mediaRecorder.stop();
          console.log('Recording stopped');
        }, config.duration);
      });
    }, CONFIG);

    console.log('✅ Recording started\n');

    // Step 3: Automate demo interactions
    console.log('🎮 Automating demo interactions...\n');

    // Wait 2 seconds before starting interactions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Timeline of interactions (for 2-minute demo)
    const timeline = [
      { time: 5000, action: 'Show title overlay' },
      { time: 10000, action: 'Highlight stats' },
      { time: 20000, action: 'Click first device' },
      { time: 30000, action: 'Click second device' },
      { time: 40000, action: 'Click third device' },
      { time: 50000, action: 'Scroll devices' },
      { time: 60000, action: 'Show MQTT connection' },
      { time: 80000, action: 'Show platform support' },
      { time: 100000, action: 'Show GitHub CTA' },
    ];

    // Execute timeline
    for (const step of timeline) {
      await new Promise(resolve => setTimeout(resolve, step.time));

      console.log(`⏱️  ${step.time / 1000}s: ${step.action}`);

      // Perform action based on step
      if (step.action.includes('Click')) {
        // Click on a device card
        await page.evaluate(() => {
          const cards = document.querySelectorAll('.device-card');
          if (cards.length > 0) {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];
            randomCard.click();

            // Simulate closing alert after 1 second
            setTimeout(() => {
              const alerts = document.querySelectorAll('.alert');
              alerts.forEach(alert => alert.remove());
            }, 1000);
          }
        });
      } else if (step.action.includes('Scroll')) {
        // Smooth scroll through devices
        await page.evaluate(() => {
          const container = document.querySelector('.device-grid');
          if (container) {
            container.scrollBy({ top: 300, behavior: 'smooth' });
          }
        });
      } else if (step.action.includes('overlay') || step.action.includes('Show')) {
        // Inject overlay elements (you can customize these)
        await page.evaluate((action) => {
          const overlay = document.createElement('div');
          overlay.className = 'recording-overlay';
          overlay.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            animation: fadeIn 0.5s;
          `;

          if (action.includes('title')) {
            overlay.innerHTML = `
              <div style="font-size: 48px; margin-bottom: 10px;">⚡ IoT Digital Twins</div>
              <div style="font-size: 24px;">Transform Devices into VR in 2ms</div>
            `;
          } else if (action.includes('stats')) {
            overlay.innerHTML = `
              <div>⚡ 2ms generation time</div>
              <div>📱 24 devices processed</div>
              <div>📝 408 lines of code</div>
              <div>🔄 <100ms MQTT sync</div>
            `;
          } else if (action.includes('MQTT')) {
            overlay.innerHTML = `
              <div>🔌 Real-Time MQTT Sync</div>
              <div style="font-size: 18px; margin-top: 10px;">
                VR ↔ Physical Devices
              </div>
            `;
          } else if (action.includes('platform')) {
            overlay.innerHTML = `
              <div>🌐 18+ Platforms Supported</div>
              <div style="font-size: 18px; margin-top: 10px;">
                Quest | Vision Pro | WebXR | Unity | Unreal
              </div>
            `;
          } else if (action.includes('GitHub')) {
            overlay.innerHTML = `
              <div>⭐ Star us on GitHub</div>
              <div style="font-size: 18px; margin-top: 10px;">
                github.com/hololand/hololand
              </div>
            `;
          }

          document.body.appendChild(overlay);

          // Remove after 3 seconds
          setTimeout(() => {
            overlay.style.animation = 'fadeOut 0.5s';
            setTimeout(() => overlay.remove(), 500);
          }, 3000);
        }, step.action);
      }
    }

    console.log('\n✅ Demo automation complete\n');

    // Step 4: Wait for recording to finish
    console.log('⏳ Waiting for recording to complete...');
    await new Promise(resolve => setTimeout(resolve, CONFIG.duration - Date.now()));

    // Step 5: Extract recorded video data
    console.log('💾 Saving recording...');

    const videoDataUrl = await page.evaluate(() => {
      return window.__recordingData;
    });

    if (!videoDataUrl) {
      throw new Error('No recording data found');
    }

    // Convert data URL to buffer
    const base64Data = videoDataUrl.split(',')[1];
    const videoBuffer = Buffer.from(base64Data, 'base64');

    // Save to file
    writeFileSync(CONFIG.outputPath, videoBuffer);

    console.log(`✅ Recording saved: ${CONFIG.outputPath}`);
    console.log(`📊 File size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

  } catch (error) {
    console.error('❌ Recording failed:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('🎬 Recording complete!\n');
  }
}

// Alternative: Terminal recording using asciinema-style capture
async function recordTerminal() {
  console.log('🎥 Recording Terminal Demo\n');

  const { default: asciinema } = await import('asciinema');

  // Record terminal session
  const rec = asciinema.record({
    command: 'node smart-home-showcase.mjs',
    cols: 120,
    rows: 30,
  });

  const outputFile = join(__dirname, 'output', 'terminal-recording.cast');

  rec.on('data', (data) => {
    // Terminal data
  });

  rec.on('end', () => {
    console.log(`✅ Terminal recording saved: ${outputFile}`);
  });

  return rec;
}

// Main execution
const mode = process.argv[2] || 'web';

if (mode === 'terminal') {
  recordTerminal().catch(console.error);
} else if (mode === 'web') {
  recordDemo().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node record-demo.mjs web       # Record web visualizer');
  console.log('  node record-demo.mjs terminal  # Record terminal output');
  process.exit(1);
}
