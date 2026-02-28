# 🤖 Automated Video Recording

> **Record the IoT Digital Twins demo using Hololand's built-in recording capabilities**

This guide shows you how to use the automated recording system to create professional demo videos without manual screen recording.

---

## 🚀 Quick Start

```bash
# Install dependencies (first time only)
cd packages/brittney/iot-digital-twins
pnpm install

# Record the demo automatically
pnpm record

# Or record terminal output
pnpm record:terminal
```

**That's it!** The system will:
1. Launch headless browser
2. Load the visualizer
3. Start canvas recording
4. Automate interactions (clicking devices, showing overlays)
5. Save video to `output/demo-recording.webm`

---

## 📦 What's Included

### 1. Web Recording (`pnpm record`)

**Records:**
- Interactive visualizer with all 24 devices
- Automated device clicks
- Overlays showing stats and CTAs
- Smooth scrolling and transitions

**Output:**
- File: `demo/output/demo-recording.webm`
- Resolution: 1920x1080 (Full HD)
- FPS: 60
- Duration: 2 minutes
- Codec: VP9 (WebM)
- Bitrate: 8 Mbps

**Timeline:**
| Time | Action |
|------|--------|
| 0:00-0:05 | Title overlay appears |
| 0:05-0:10 | Stats overlay (2ms, 24 devices, etc.) |
| 0:10-0:20 | Click first device (light) |
| 0:20-0:30 | Click second device (thermostat) |
| 0:30-0:40 | Click third device (camera) |
| 0:40-0:50 | Scroll through devices |
| 0:50-1:00 | MQTT sync overlay |
| 1:00-1:20 | Platform support overlay |
| 1:20-1:40 | Use case highlights |
| 1:40-2:00 | GitHub CTA overlay |

### 2. Terminal Recording (`pnpm record:terminal`)

**Records:**
- Terminal output showing demo execution
- 2ms generation time
- Device statistics
- Generated file paths

**Output:**
- File: `demo/output/terminal-recording.cast`
- Format: Asciinema cast file
- Playable: Yes (with asciinema player)

---

## 🎨 Customization

### Change Recording Duration

Edit `record-demo.mjs`:

```javascript
const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 60,
  duration: 120000, // Change to your desired duration (in ms)
  outputPath: join(__dirname, 'output', 'demo-recording.webm'),
};
```

### Add Custom Overlays

Add to the timeline array:

```javascript
const timeline = [
  // ... existing steps
  {
    time: 30000, // 30 seconds
    action: 'Show custom overlay'
  },
];
```

Then handle in the overlay injection:

```javascript
if (action.includes('custom')) {
  overlay.innerHTML = `
    <div>Your Custom Text</div>
    <div style="font-size: 18px; margin-top: 10px;">
      Subtitle
    </div>
  `;
}
```

### Change Resolution

```javascript
const CONFIG = {
  width: 3840,  // 4K width
  height: 2160, // 4K height
  // ... rest of config
};
```

**Supported resolutions:**
- 1920x1080 (Full HD) - Default
- 2560x1440 (2K)
- 3840x2160 (4K)
- 1280x720 (HD)

### Change Video Codec

Edit the MediaRecorder mime type:

```javascript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',  // VP9 (best quality)
  // or
  mimeType: 'video/webm;codecs=vp8',  // VP8 (wider compatibility)
  // or
  mimeType: 'video/webm;codecs=h264', // H.264 (most compatible)
  videoBitsPerSecond: 8000000, // Bitrate
});
```

---

## 🔧 Advanced Usage

### Record with Custom Devices

```javascript
// Create custom device data
const customDevices = [
  {
    entity_id: 'light.my_light',
    state: 'on',
    attributes: {
      friendly_name: 'My Custom Light',
      brightness: 255,
    },
  },
];

// Generate scene
import { ClawdbotGenerator } from '../dist/index.js';
const generator = new ClawdbotGenerator();
const result = await generator.generateFromHomeAssistant(customDevices);

// Then record as usual
```

### Record Multiple Takes

```bash
# Record take 1
pnpm record
mv demo/output/demo-recording.webm demo/output/take-1.webm

# Record take 2
pnpm record
mv demo/output/demo-recording.webm demo/output/take-2.webm

# Record take 3
pnpm record
mv demo/output/demo-recording.webm demo/output/take-3.webm

# Choose best take for final video
```

### Batch Recording

Create `batch-record.sh`:

```bash
#!/bin/bash

# Record 5 takes automatically
for i in {1..5}
do
  echo "Recording take $i..."
  pnpm record
  mv demo/output/demo-recording.webm demo/output/take-$i.webm
  sleep 5
done

echo "All takes recorded!"
```

---

## 📊 Output Formats

### WebM (Default)

**Pros:**
- Excellent quality
- Open source codec
- Small file sizes
- Works in Chrome/Firefox

**Cons:**
- Limited Safari support
- Not ideal for editing

**Use for:**
- YouTube uploads
- Web embedding
- Twitter videos

### Convert to MP4

```bash
# Install FFmpeg first
# Then convert:

ffmpeg -i demo/output/demo-recording.webm \
       -c:v libx264 \
       -preset slow \
       -crf 18 \
       -c:a aac \
       -b:a 192k \
       demo/output/demo-recording.mp4
```

**MP4 benefits:**
- Universal compatibility
- Works in all browsers
- Ideal for editing
- Smaller file size

---

## 🎬 Post-Production

### Extract Frames

```bash
# Extract all frames as PNG
ffmpeg -i demo/output/demo-recording.webm \
       demo/output/frames/frame-%04d.png

# Extract every 10th frame
ffmpeg -i demo/output/demo-recording.webm \
       -vf "select=not(mod(n\,10))" \
       -vsync vfr \
       demo/output/frames/frame-%04d.png
```

### Create GIF

```bash
# Convert to GIF for social media
ffmpeg -i demo/output/demo-recording.webm \
       -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
       -loop 0 \
       demo/output/demo.gif
```

### Add Background Music

```bash
# Mix with music (adjust -filter_complex for volume)
ffmpeg -i demo/output/demo-recording.webm \
       -i background-music.mp3 \
       -filter_complex "[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2:duration=first[a]" \
       -map 0:v -map "[a]" \
       -c:v copy -c:a aac \
       demo/output/demo-with-music.mp4
```

### Add Intro/Outro

```bash
# Concatenate videos
# Create file list: filelist.txt
# file 'intro.mp4'
# file 'demo-recording.webm'
# file 'outro.mp4'

ffmpeg -f concat -safe 0 -i filelist.txt \
       -c copy \
       demo/output/final.mp4
```

---

## 🐛 Troubleshooting

### "Puppeteer not found"

```bash
# Install dependencies
cd packages/brittney/iot-digital-twins
pnpm install
```

### "Canvas not found"

The visualizer might not have loaded. Check:
1. `visualizer.html` exists in demo folder
2. Browser console for errors
3. Try increasing wait time in script

**Fix:**
```javascript
// In record-demo.mjs, add longer wait
await page.goto(visualizerPath, { waitUntil: 'networkidle0' });
await new Promise(resolve => setTimeout(resolve, 5000)); // Add 5s wait
```

### "Recording is empty"

MediaRecorder might not be supported. Check:
1. Chromium version (should be latest)
2. Codec support
3. Canvas rendering

**Fix:**
```javascript
// Try different codec
mimeType: 'video/webm;codecs=vp8'  // Instead of vp9
```

### "File size too large"

Reduce bitrate:
```javascript
videoBitsPerSecond: 4000000, // 4 Mbps instead of 8
```

Or reduce resolution:
```javascript
const CONFIG = {
  width: 1280,  // HD instead of Full HD
  height: 720,
  // ...
};
```

---

## 📈 Performance Tips

### Faster Recording

```javascript
// Reduce FPS for faster processing
const CONFIG = {
  fps: 30,  // Instead of 60
  // ...
};
```

### Better Quality

```javascript
// Increase bitrate
videoBitsPerSecond: 15000000, // 15 Mbps
```

### Smaller Files

```javascript
// Use VP8 instead of VP9
mimeType: 'video/webm;codecs=vp8',
videoBitsPerSecond: 3000000, // 3 Mbps
```

---

## 🔄 Integration with CI/CD

### GitHub Actions

```yaml
# .github/workflows/record-demo.yml
name: Record Demo Video

on:
  push:
    paths:
      - 'packages/brittney/iot-digital-twins/**'

jobs:
  record:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Record demo
        run: |
          cd packages/brittney/iot-digital-twins
          pnpm record

      - name: Upload video
        uses: actions/upload-artifact@v3
        with:
          name: demo-video
          path: packages/brittney/iot-digital-twins/demo/output/demo-recording.webm
```

---

## 📚 Additional Resources

### FFmpeg Documentation
- [Official FFmpeg Docs](https://ffmpeg.org/documentation.html)
- [FFmpeg Wiki](https://trac.ffmpeg.org/wiki)

### Puppeteer Documentation
- [Puppeteer API](https://pptr.dev/)
- [Puppeteer Examples](https://github.com/puppeteer/puppeteer/tree/main/examples)

### MediaRecorder API
- [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Browser Compatibility](https://caniuse.com/mediarecorder)

---

## 🎉 Success!

You now have:
- ✅ Automated video recording
- ✅ Customizable timelines
- ✅ Professional output quality
- ✅ Post-production tools
- ✅ CI/CD integration

**Next steps:**
1. Record your first take: `pnpm record`
2. Review the output
3. Customize overlays
4. Add music and effects
5. Publish to YouTube!

---

**🎬 Happy recording!**

---

**Built with ❤️ for the Hololand ecosystem**

*Automated video recording for IoT Digital Twins demo*
