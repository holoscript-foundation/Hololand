# @hololand/three-plains

GPS-anchored content system for the Three Plains architecture.

## The Three Plains

| Plain | Description | Coordinate System |
|-------|-------------|-------------------|
| 🌌 **Hololand** | Pure VR world - the OASIS | World-relative XYZ |
| 🥽 **VR Real World** | Digital twin of Earth in VR | GPS (WGS84) |
| 📱 **AR Real World** | Overlay on physical reality | GPS + AR anchors |

## Quick Start

```holo
import { GPSAnchor, switch_plain } from "@hololand/three-plains"
import { Portal } from "@hololand/components"

composition "My GPS World" {
  
  // Place a portal at the Statue of Liberty
  object "LibertyPortal" using "GPSAnchor" {
    latitude: 40.689247
    longitude: -74.044502
    altitude: 0
    altitude_mode: "terrain"
    
    content: {
      object "Portal" using "Portal" {
        destination: "virtual_nyc"
        color: "#00ff88"
      }
    }
  }
  
  logic {
    on_enter {
      // Start in VR Real World mode
      switch_plain("vr_real")
    }
  }
}
```

## Coordinate Conversion

The system handles conversion between:
- **GPS (WGS84)**: Latitude, Longitude, Altitude
- **ECEF**: Earth-Centered Earth-Fixed XYZ
- **ENU**: East-North-Up local coordinates
- **Three.js**: Right-handed Y-up coordinate system

```holo
// Get local 3D position from GPS
local_pos = gps_to_local(
  anchor.latitude, anchor.longitude, anchor.altitude,
  player.latitude, player.longitude, player.altitude
)
// Returns [east, up, north] in meters
```

## Region Loading

Content is loaded in chunks based on player GPS position:

```
┌─────┬─────┬─────┐
│     │     │     │
├─────┼─────┼─────┤
│     │  P  │     │  P = Player
├─────┼─────┼─────┤
│     │     │     │
└─────┴─────┴─────┘

Each region = 500m x 500m
Load radius = 1km around player
```

## Plain Switching

```holo
// Switch between plains
switch_plain("hololand")    // Pure VR
switch_plain("vr_real")     // VR + GPS
switch_plain("ar_real")     // AR + GPS
```

## AR Placement

```holo
import { start_placement } from "@hololand/three-plains/anchors"

// Let user place a virtual object in AR
on_button_click {
  start_placement({
    model: "my_sculpture",
    scale: [1, 1, 1]
  })
}
```

## Data Sources

- **Terrain**: Mapbox Terrain RGB
- **Buildings**: OpenStreetMap 3D
- **Satellite**: Bing Maps Aerial
- **User Content**: Hololand API
