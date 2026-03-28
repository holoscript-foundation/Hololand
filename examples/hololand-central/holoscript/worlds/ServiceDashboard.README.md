# Service Dashboard World

Real-time monitoring dashboard for the HoloScript ecosystem services in an immersive 3D VR/AR environment.

## Overview

The Service Dashboard provides a beautiful, functional monitoring interface with:
- **5 floating service stations** in pentagon arrangement (radius: 12 units, height: 4 units)
- **Central HoloScript logo** with rotating holographic cube
- **Real-time health monitoring** with color-coded glow effects
- **Activity logs** showing last 5 events per service
- **One-click action buttons** for Deploy, Rollback, and View Logs
- **Dynamic ambient lighting** that shifts based on overall health status

## Services Monitored

| Service | Icon | URL | Metrics |
|---------|------|-----|---------|
| **MCP Orchestrator** | 🔀 | mcp-orchestrator-production-45f9.up.railway.app | Uptime, Server count |
| **HoloScript MCP** | 🌐 | mcp.holoscript.net | Tool count, Health |
| **Semantic Search Hub** | 🔍 | semantic-search-hub (via orchestrator) | Entry count |
| **Brittney Hololand** | 🏰 | brittney-hololand (via orchestrator) | World count |
| **UAA2 Service** | 🤖 | uaa2-service (via orchestrator) | Agent count |

## Architecture

### Pentagon Positioning (Math)
```
Radius: 12 units
Height: 4 units
Angle step: 360° / 5 = 72°

Station positions (in radians):
1. Orchestrator:      0° → (12.00,  4,   0.00)
2. HoloScript MCP:   72° → ( 3.71,  4,  11.41)
3. Semantic Search: 144° → (-9.71,  4,   7.05)
4. Brittney:        216° → (-9.71,  4,  -7.05)
5. UAA2:            288° → ( 3.71,  4, -11.41)
```

### Health Status Colors
- **Green** (`#00ff00`): All systems operational
- **Yellow** (`#ffff00`): Degraded performance or warnings
- **Red** (`#ff0000`): Service down or critical error
- **Gray** (`#666666`): Unknown status (no data yet)

### Ambient Lighting Behavior
The entire environment's ambient light shifts color based on overall health:
- **All green**: Warm green-tinted (`#88ffaa`) — calm, operational
- **Any yellow**: Warm yellow-tinted (`#ffdd88`) — caution
- **Any red**: Alert red-tinted (`#ff8888`) — critical attention needed
- **Unknown**: Neutral gray (`#aaaaaa`) — initializing

## Features

### 1. Real-Time Polling
- Polls all services every **5 seconds** (configurable via `pollInterval`)
- Uses `fetch_json()` for HTTP health checks
- Graceful error handling with fallback to "red" status
- Activity log automatically updates with each poll

### 2. Activity Logs
Each service station displays the last 5 activities with:
- Timestamp (HH:MM:SS format)
- Message (success ✓ or failure ✗)
- Fading opacity (newest = 100%, oldest = 20%)
- Scrolling 3D text on dark panel background

### 3. Interactive Action Buttons
Three buttons per station:
- **Deploy**: Trigger deployment (blue glow on click)
- **Rollback**: Trigger rollback (orange glow on click)
- **View Logs**: Open detailed logs (purple glow on click)

All buttons provide visual feedback with emissive pulse on interaction.

### 4. Visual Connections
Each station has a pulsing beam connecting it to the central logo:
- Color matches service health status
- Animates with emissive intensity pulse (0.3 - 0.7)
- 45° angle pointing toward center
- Opacity: 40% (semi-transparent)

### 5. Central Logo Animation
- **Outer cube**: Rotates clockwise at 0.5 rad/s
- **Inner wireframe cube**: Rotates counter-clockwise at 1.0 rad/s
- **Glow sphere**: Pulsing scale animation (3.0 - 3.2 units)
- **Text label**: "HoloScript" with emissive glow

## Performance Targets

- **Target framerate**: 90 FPS (VR standard)
- **Polygon budget per station**: ~500 polygons
- **Total polygons**: ~3,000 (5 stations + logo + ground)
- **Draw calls**: ~30 (optimized with instancing where possible)
- **Memory footprint**: < 50 MB

### Optimization Techniques
1. **Shared materials**: Reuse materials across similar objects
2. **LOD system**: Not needed at this scale (always in view)
3. **Texture atlasing**: Icons as text primitives (no texture load)
4. **Efficient polling**: Staggered requests to avoid simultaneous network calls
5. **Activity log limit**: Max 5 entries per service (prevents memory leak)

## Usage

### Accessing the World
```typescript
import { ServiceDashboard } from './worlds/ServiceDashboard.hsplus'

// Load in Hololand runtime
const dashboard = new ServiceDashboard()
dashboard.spawn([0, 2, 15]) // Spawn point
```

### Customizing Poll Interval
Edit the `state.pollInterval` value (milliseconds):
```hsplus
state {
  pollInterval: 10000  // Change to 10 seconds
}
```

### Adding New Services
1. Add service config to `state.services` object
2. Create new `ServiceStation` instance with pentagon positioning
3. Update `pollAllServices()` logic to include new service
4. Calculate position: `x = radius * cos(angle)`, `z = radius * sin(angle)`

### Extending Activity Types
The `addActivity(serviceKey, message)` function can be enhanced to:
- Categorize by severity (info, warning, error)
- Add icons/emojis for different event types
- Store full event objects with metadata
- Export to external logging service

## API Endpoints Used

### MCP Orchestrator
```bash
GET https://mcp-orchestrator-production-45f9.up.railway.app/health
Response: { status, uptime, servers, knowledge_entries, timestamp }
```

### HoloScript MCP
```bash
GET https://mcp.holoscript.net/health
Response: { status, version, ... }

GET https://mcp.holoscript.net/.well-known/mcp
Response: { tools: [...], transport: {...}, version: "..." }
```

### MCP Server Health (via Orchestrator)
```bash
GET https://mcp-orchestrator-production-45f9.up.railway.app/servers/{server}/health
Requires: x-mcp-api-key header
```

## Future Enhancements

### Phase 2: Metrics Visualization
- [ ] Real-time graphs for uptime/latency
- [ ] Sparklines for request rate
- [ ] Error rate percentage displays
- [ ] Memory/CPU usage gauges

### Phase 3: Alerts & Notifications
- [ ] Audio alerts on health status change
- [ ] Visual warning pulses for critical states
- [ ] Notification history panel
- [ ] Export alert logs to external systems

### Phase 4: Interactive Drill-Down
- [ ] Click service to expand detailed view
- [ ] Full log viewer with search/filter
- [ ] Deployment history timeline
- [ ] Dependency graph visualization

### Phase 5: Multi-User Collaboration
- [ ] Shared cursor presence for multiple admins
- [ ] Voice chat integration
- [ ] Role-based permissions (view-only vs admin)
- [ ] Action approval workflows

## Technical Details

### State Management
All state is centralized in the world's `state` object:
- Service configurations
- Health status per service
- Activity logs (array per service)
- Overall health (derived)
- Poll timing metadata

### Animation System
Uses HoloScript's built-in animation primitives:
- `type: "rotate"` for continuous rotation
- `type: "pulse"` for oscillating properties
- Custom `setTimeout()` for delayed state changes

### Material Properties
- **Metalness**: 0.7-0.9 for metallic surfaces
- **Roughness**: 0.2-0.5 for polished look
- **Emissive intensity**: 0.3-0.8 for glowing effects
- **Transparency**: Used sparingly for glow spheres and beams

### Coordinate System
- **Origin**: Center of ground platform
- **Y-axis**: Up (height)
- **X/Z plane**: Horizontal (pentagon layout)
- **Units**: Meters (1 unit = 1 meter in VR)

## Troubleshooting

### Services showing "unknown" status
- Check network connectivity
- Verify MCP_API_KEY environment variable
- Confirm orchestrator is reachable at production URL
- Check CORS headers for browser-based access

### Low framerate
- Reduce `pollInterval` to decrease update frequency
- Disable glow effects by setting `emissiveIntensity: 0`
- Remove activity log panels (most expensive text rendering)
- Use simpler geometry for stations (boxes instead of cylinders)

### Activity logs not updating
- Check browser console for `fetch_json()` errors
- Verify `addActivity()` is called in `.then()` callbacks
- Confirm `activities` array is reactive (triggering re-render)

### Buttons not responding
- Ensure `interactive: true` is set on button objects
- Check `on_interact` event handlers are defined
- Verify raycasting is enabled in VR runtime

## Credits

**Created by**: HoloLand Autonomous Platform Administrator
**Version**: 1.0.0
**Date**: 2026-03-21
**License**: MIT (part of HoloScript ecosystem)

## Related Worlds

- **MainPlaza**: Central hub with portals and NPCs
- **BuilderShop**: Construction tools and templates
- **ArcadeDistrict**: Gaming and entertainment zone
- **SocialLounge**: Community gathering space

---

**Note**: This world demonstrates HoloScript's ability to create functional, real-time monitoring dashboards in immersive 3D environments — bridging traditional DevOps tooling with spatial computing interfaces.
