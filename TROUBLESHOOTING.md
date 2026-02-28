# 🔧 HoloLand Troubleshooting Guide

**Quick help for common issues**

Having trouble? This guide covers the most common issues and their solutions. If you don't find your issue here, check the [GitHub Issues](https://github.com/brianonbased-dev/Hololand/issues) or ask in [Discord](https://discord.gg/hololand).

---

## 📑 Table of Contents

- [Installation Issues](#installation-issues)
- [Development Issues](#development-issues)
- [Build & Compilation](#build--compilation)
- [Deployment Issues](#deployment-issues)
- [VR/AR Issues](#vrar-issues)
- [Performance Issues](#performance-issues)
- [Networking/Multiplayer](#networkingmultiplayer)
- [Package-Specific Issues](#package-specific-issues)
- [Getting Help](#getting-help)

---

## Installation Issues

### "Module not found" errors

**Symptom**: `Error: Cannot find module '@hololand/world'`

**Solutions**:
```bash
# 1. Install all dependencies
pnpm install

# 2. Rebuild all packages
pnpm build

# 3. Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 4. Verify package structure
ls packages/*/dist
```

**Still not working?**
- Check you're using Node.js 18+ (`node --version`)
- Verify you're in the project root directory
- Try `pnpm install --force`

---

### pnpm command not found

**Symptom**: `bash: pnpm: command not found`

**Solution**:
```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

**Alternative**: Use `npx pnpm` if you don't want global install

---

### TypeScript errors on install

**Symptom**: `TS2307: Cannot find module` during build

**Solutions**:
```bash
# 1. Ensure TypeScript is installed
pnpm add -D typescript

# 2. Regenerate types
pnpm build

# 3. Clear TypeScript cache
rm -rf packages/*/dist/**/*.d.ts
pnpm build
```

---

### Git clone fails

**Symptom**: `Permission denied` or `Repository not found`

**Solutions**:
```bash
# Use HTTPS instead of SSH
git clone https://github.com/brianonbased-dev/Hololand.git

# Or set up SSH keys
# See: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

---

## Development Issues

### Scene not loading in browser

**Symptom**: Blank screen or "Failed to load world"

**Checklist**:

1. **Check browser console** (F12)
   - Look for error messages
   - Note the line number and file

2. **Common fixes**:

```bash
# Syntax error in HoloScript
# - Check line number in error message
# - Verify closing braces }
# - Validate HoloScript syntax

# Missing dependencies
pnpm install

# Outdated build
pnpm build

# Port already in use
# - Kill process on port 5173
# - Or use different port: pnpm dev --port 3000
```

3. **Verify file paths**:
```holoscript
// ❌ Wrong - absolute path
import scene from "/home/user/scenes/world.holo"

// ✅ Correct - relative path
import scene from "./scenes/world.holo"
```

---

### Hot reload not working

**Symptom**: Changes don't appear without full refresh

**Solutions**:
```bash
# 1. Restart dev server
# Ctrl+C, then pnpm dev

# 2. Clear browser cache
# Ctrl+Shift+R (hard refresh)

# 3. Check Vite config
# Ensure vite.config.ts has:
export default {
  server: {
    watch: {
      usePolling: true  // For WSL/Docker
    }
  }
}
```

---

### TypeScript type errors

**Symptom**: Red squiggles in IDE, `Type 'X' is not assignable to type 'Y'`

**Solutions**:
```bash
# 1. Regenerate type definitions
pnpm build

# 2. Restart TypeScript server (VS Code)
# Ctrl+Shift+P → "TypeScript: Restart TS Server"

# 3. Check tsconfig.json paths
# Verify package references are correct
```

---

### Import errors ("Cannot find module")

**Symptom**: `Cannot find module '@hololand/world'` in TypeScript

**Solutions**:
```typescript
// Check import style

// ❌ Wrong
import World from '@hololand/world'

// ✅ Correct (named export)
import { World } from '@hololand/world'

// ✅ Correct (default export)
import HololandWorld from '@hololand/world'
```

```bash
# Verify package exports in package.json
cat packages/world/package.json | grep exports
```

---

## Build & Compilation

### Build fails with "Asset not found"

**Symptom**: `Error: Asset not found: models/tree.glb`

**Solutions**:
```bash
# 1. Check asset path (relative to world file)
ls assets/models/tree.glb

# 2. Verify asset directory structure
my-world/
├── world.hsplus
└── assets/
    └── models/
        └── tree.glb  # ✅ Correct structure

# 3. Use correct path in HoloScript
object "Tree" {
  model: "./assets/models/tree.glb"  # Relative path
}
```

---

### Build succeeds but files missing

**Symptom**: `dist/` folder empty or incomplete

**Solutions**:
```bash
# 1. Check build output
pnpm build 2>&1 | tee build.log

# 2. Verify package.json scripts
cat package.json | grep -A 5 scripts

# 3. Clean and rebuild
rm -rf dist/
pnpm build

# 4. Check for TypeScript errors
pnpm typecheck
```

---

### Out of memory during build

**Symptom**: `FATAL ERROR: Ineffective mark-compacts near heap limit`

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm build

# Or in package.json script:
"build": "NODE_OPTIONS='--max-old-space-size=8192' vite build"
```

---

## Deployment Issues

### Publish fails (401 Unauthorized)

**Symptom**: `401 Unauthorized - Please log in`

**Solutions**:
```bash
# 1. Log out and log in again
holoscript logout
holoscript login

# 2. Verify credentials
holoscript whoami

# 3. Check API key (if using)
echo $HOLOLAND_API_KEY
```

---

### World doesn't load in production

**Symptom**: Works locally, fails in deployment

**Common causes**:

1. **Mixed content (HTTP/HTTPS)**
```json
// Fix: Ensure all assets use HTTPS
{
  "assets": {
    "baseUrl": "https://cdn.hololand.io"  // Not http://
  }
}
```

2. **CORS errors**
```javascript
// Check server headers
Access-Control-Allow-Origin: *
```

3. **Path issues**
```bash
# Use absolute paths for deployed assets
# In production: /assets/model.glb
# Not: ../assets/model.glb
```

---

### Large file size / Slow loading

**Symptom**: World takes 30+ seconds to load

**Solutions**:
```bash
# 1. Optimize assets
holoscript optimize world.hsplus --textures --quality 0.8

# 2. Compress textures
# Reduce to 2048x2048 or lower

# 3. Reduce polygon count
holoscript optimize world.hsplus --meshes --target-tris 100000

# 4. Enable compression
# In server config (nginx):
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

**Performance targets**:
| Platform | Max File Size | Max Polygons |
|----------|---------------|--------------|
| Browser | 50 MB | 500K tris |
| Quest 2 | 100 MB | 750K tris |
| Quest 3 | 150 MB | 1.5M tris |
| Desktop VR | 500 MB | 5M tris |

---

## VR/AR Issues

### VR mode not working

**Symptom**: "Enter VR" button doesn't appear

**Checklist**:

1. **Browser support**
   - ✅ Chrome/Edge (Chromium)
   - ✅ Firefox Reality
   - ❌ Safari (no WebXR)

2. **HTTPS required**
```bash
# WebXR only works on HTTPS or localhost
# Use ngrok for testing:
ngrok http 5173
```

3. **Check WebXR support**
```javascript
// In browser console
if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    console.log('VR supported:', supported);
  });
}
```

---

### Objects not interactive in VR

**Symptom**: Can't grab or click objects

**Solution**:
```holoscript
// Add @interactive trait
object "Button" {
  @interactive  // ✅ Required for VR interaction
  geometry: "box"
  position: [0, 1, 0]
}
```

**Also check**:
- Object has collider (physics enabled)
- Object is within reach (< 10 units from player)
- Controllers are tracked

---

### Low FPS in VR

**Symptom**: Stuttering, < 72 FPS on Quest

**Solutions**:

1. **Reduce object count**
```holoscript
// Use instancing for repeated objects
object "Tree" {
  @instanced
  instances: [
    { position: [0, 0, 0] },
    { position: [5, 0, 0] },
    { position: [10, 0, 0] }
  ]
}
```

2. **Use simpler geometries**
```holoscript
// ✅ Good for Quest
geometry: "box"        // 12 faces
geometry: "cylinder"   // 24 faces

// ⚠️ Use sparingly
geometry: "sphere"     // 800 faces

// ❌ Avoid on Quest
geometry: "icosphere"  // 5000+ faces
```

3. **Enable LOD (Level of Detail)**
```holoscript
object "Complex Model" {
  @lod
  levels: [
    { distance: 0, geometry: "high-poly.glb" },
    { distance: 10, geometry: "medium-poly.glb" },
    { distance: 20, geometry: "low-poly.glb" }
  ]
}
```

---

### Hand tracking not working

**Symptom**: Quest hand tracking not detected

**Requirements**:
- Quest 2/3/Pro only
- Hand tracking enabled in Quest settings
- Good lighting (not too dark)
- Hands visible to cameras

**Code**:
```javascript
// Check hand tracking support
const session = await navigator.xr.requestSession('immersive-vr', {
  requiredFeatures: ['hand-tracking']
});
```

---

## Performance Issues

### Memory leaks

**Symptom**: Browser tab slows down over time

**Solutions**:
```javascript
// Dispose of Three.js objects properly
scene.traverse(object => {
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(m => m.dispose());
    } else {
      object.material.dispose();
    }
  }
});

// Dispose textures
textureLoader.dispose();

// Remove event listeners
window.removeEventListener('resize', onResize);
```

---

### Slow startup time

**Symptom**: World takes 10+ seconds to initialize

**Solutions**:

1. **Lazy load assets**
```typescript
// Don't load all assets upfront
const model = await loadAsset('model.glb');  // Load on demand
```

2. **Use asset streaming**
```bash
# Enable in config
{
  "streaming": {
    "enabled": true,
    "chunkSize": 1024  // 1KB chunks
  }
}
```

3. **Preload critical assets only**
```typescript
// Preload essentials, lazy load rest
await preload(['player.glb', 'ground.jpg']);
// World is now interactive
lazyLoad(['decorations', 'particles']);  // Background loading
```

---

## Networking/Multiplayer

### Players can't see each other

**Symptom**: Multiplayer but avatars invisible

**Checklist**:

1. **Network configuration**
```holoscript
// Ensure objects are marked @networked
object "Player Avatar" {
  @networked  // ✅ Required for multiplayer sync
  geometry: "capsule"
}
```

2. **Connection status**
```bash
# Check network console
# Should see: "Connected to room: <room-id>"
```

3. **Firewall/NAT issues**
```bash
# WebRTC requires open ports
# Check STUN/TURN server config
```

---

### High latency (lag)

**Symptom**: > 200ms delay between actions

**Solutions**:

1. **Use closer server region**
```javascript
const config = {
  region: 'us-east',  // Choose closest region
  fallbackRegions: ['us-west', 'eu-central']
};
```

2. **Enable client-side prediction**
```holoscript
state {
  @networked
  @predicted  // Reduces perceived lag
  playerPosition: [0, 0, 0]
}
```

3. **Reduce sync frequency**
```holoscript
object "SlowMovingObject" {
  @networked
  syncRate: 5  // 5 updates/second (default: 20)
}
```

---

## Package-Specific Issues

### @hololand/world issues

#### Physics not working

```typescript
// Ensure physics is enabled
const world = new World({
  physics: {
    enabled: true,
    gravity: [0, -9.81, 0]
  }
});
```

---

### @hololand/renderer issues

#### Textures not loading

```typescript
// Check texture paths
const texture = textureLoader.load('./textures/wood.jpg');

// Enable CORS for external textures
// Server must send: Access-Control-Allow-Origin: *
```

---

### @hololand/network issues

#### CRDT sync errors

```bash
# Check Yjs version compatibility
pnpm list yjs

# Update to latest
pnpm update yjs
```

---

### @hololand/brittney-service issues

#### AI not responding

**Checklist**:
1. API key set: `echo $ANTHROPIC_API_KEY`
2. Network access (not behind restrictive firewall)
3. Rate limits not exceeded

```bash
# Test connection
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY"
```

---

## Getting Help

### Before asking for help

Please gather this information:

1. **Version info**
```bash
node --version
pnpm --version
holoscript --version
```

2. **Error message** (full stack trace)

3. **Minimal reproduction**
- Simplest code that reproduces the issue
- Share on CodeSandbox or GitHub

4. **Environment**
- OS (Windows/Mac/Linux)
- Browser (Chrome/Firefox/Safari)
- VR headset (Quest 2/3, Index, etc.)

---

### Where to get help

| Type | Link | Response Time |
|------|------|---------------|
| **Bug report** | [GitHub Issues](https://github.com/brianonbased-dev/Hololand/issues) | 24-48 hours |
| **Question** | [GitHub Discussions](https://github.com/brianonbased-dev/Hololand/discussions) | 1-3 days |
| **Chat** | [Discord](https://discord.gg/hololand) | Real-time |
| **Email** | support@hololand.io | 1-2 days |

---

### Reporting bugs

**Good bug report** ✅:
```markdown
**Issue**: World fails to load on Quest 2

**Steps to reproduce**:
1. Build with: `holoscript build world.hsplus --target quest`
2. Install APK on Quest 2
3. Launch app
4. Stuck on loading screen

**Expected**: World loads within 5 seconds
**Actual**: Infinite loading screen

**Environment**:
- Node: v20.10.0
- Hololand: v2.0.0
- Quest OS: v62

**Error logs**:
```
Error: Failed to load asset: model.glb
  at AssetLoader.load (AssetLoader.ts:45)
```

**Screenshots**: [attached]
```

**Bad bug report** ❌:
```markdown
It doesn't work. Please fix.
```

---

## Common Error Messages

### `EADDRINUSE: address already in use`

**Cause**: Port 5173 (or other) already in use

**Solutions**:
```bash
# Find process using port
lsof -i :5173  # Mac/Linux
netstat -ano | findstr :5173  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
pnpm dev --port 3000
```

---

### `ERR_OSSL_EVP_UNSUPPORTED`

**Cause**: Node.js 17+ OpenSSL incompatibility

**Solution**:
```bash
# Add to package.json scripts:
"dev": "NODE_OPTIONS='--openssl-legacy-provider' vite dev"
```

---

### `Cannot find module 'three'`

**Cause**: three.js not installed

**Solution**:
```bash
pnpm add three @types/three
```

---

### `WebXR not supported`

**Cause**: Browser or device doesn't support WebXR

**Solutions**:
- Use Chrome/Edge on desktop
- Use Firefox Reality on VR headset
- Ensure HTTPS (required for WebXR)

---

## Performance Benchmarks

Use these targets to diagnose performance issues:

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| **Initial load** | < 3s | 3-8s | > 8s |
| **FPS (desktop)** | 60 FPS | 45-60 FPS | < 45 FPS |
| **FPS (Quest)** | 72 FPS | 60-72 FPS | < 60 FPS |
| **Memory usage** | < 500 MB | 500-1000 MB | > 1 GB |
| **Network latency** | < 50ms | 50-150ms | > 150ms |

**Measure performance**:
```javascript
// Check FPS
console.log(renderer.info.render.fps);

// Check memory
console.log(performance.memory.usedJSHeapSize / 1024 / 1024, 'MB');

// Check draw calls
console.log(renderer.info.render.calls);
```

---

## Still Need Help?

If you've tried everything above and still have issues:

1. **Search [existing issues](https://github.com/brianonbased-dev/Hololand/issues)**
2. **Ask in [Discord](https://discord.gg/hololand)** - fastest response
3. **Open a [new issue](https://github.com/brianonbased-dev/Hololand/issues/new)** - for bugs
4. **Email support@hololand.io** - for urgent/private issues

**We're here to help!** 🎉

---

## Contributing

Found a solution not listed here? [Submit a PR](https://github.com/brianonbased-dev/Hololand/pulls) to help others!

---

**Last Updated**: February 21, 2026

---

*Built with ❤️ by the Hololand community*
