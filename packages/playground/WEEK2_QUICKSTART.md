# Week 2 Features Quick Start Guide

## 🚀 Getting Started with New Features

### 1. Multi-Cloud AI Integration

#### Setup
```bash
# Create environment file
cp .env.example .env.production

# Add your API keys
OPENAI_API_KEY=sk-your-key
CLAUDE_API_KEY=your-claude-key
```

#### Using Different AI Providers
```
In the Chat panel, use the "Provider" dropdown to switch between:
- Brittney (local, fastest)
- OpenAI (gpt-4-turbo)
- Claude (claude-3-opus)
- Ollama (local neural-chat)
```

#### How Streaming Works
```
User: "Create a spinning cube"
         ↓
Brittney AI (attempts first)
         ↓
Receives streaming response in real-time
         ↓
Chat displays tokens as they arrive
         ↓
Full response visible when complete
```

---

### 2. Code Templates in Chat

#### Available Templates
```
Objects:    BasicCube, AnimatedCube, Platform, Sphere, LightSource
Behaviors:  Rotate, Float, ScalePulse, FollowPlayer
Traits:     Health, Damage
Scenes:     SimpleWorld, Arena, Parkour
Particles:  FireParticle, WaterSplash
NPCs:       PatrollingGuard, TreasureChest
```

#### Load a Template
```
User: "template BasicCube"
         ↓
Brittney: Loads BasicCube template
         ↓
Code appears in chat
         ↓
Copy to editor and modify
```

#### Template in Playground
```holo
// After loading BasicCube template:
world MyWorld {
  object cube {
    position: [0, 0, 0]
    scale: [1, 1, 1]
    
    trait Material {
      color: 0x00ff00  // Customize color
      metalness: 0.5
      roughness: 0.5
    }
  }
}
```

---

### 3. Performance Profiler

#### Accessing Profiler
1. Click **📊 Profiler** tab in the right panel
2. View real-time metrics:
   - **FPS**: Current frames per second (target: 60+)
   - **Frame Time**: Milliseconds per frame (target: <16ms)
   - **Memory**: RAM used in MB (target: <150MB)
   - **Objects**: Scene object count

#### Color Meanings
```
🟢 Green  - Optimal performance
🟡 Yellow - Acceptable but monitor
🔴 Red    - Needs optimization
```

#### Chart View
- Toggle between Chart and History Table
- See FPS, Frame Time, Memory trends
- Identify performance bottlenecks

#### Example Analysis
```
Problem: Frame time spikes to 50ms
Solution: Reduce object count, optimize shaders
Action:   Use Inspector to reduce complexity
```

---

### 4. Property Inspector

#### Selecting Objects
1. Click on an object in the 3D preview
2. Inspector panel auto-loads properties
3. Edit properties in real-time

#### Property Types
```
String:   Object name, custom properties
Number:   Position (X,Y,Z), Rotation, Scale, Physics (mass, friction)
Boolean:  Enable/Disable physics, collision
Color:    Material color with picker
Vector:   Position, Rotation, Scale (3-component)
Enum:     Object type dropdown
```

#### Example: Editing a Cube
```
1. Click cube in preview
2. Inspector shows:
   - name: "Cube"
   - positionX: 0, positionY: 2, positionZ: 0
   - scaleX: 1, scaleY: 1, scaleZ: 1
   - color: #ffffff
   - metalness: 0.5

3. Change values:
   - positionY: 5 (moves cube up)
   - color: #ff0000 (turns red)
   - scaleX: 2 (stretches horizontally)

4. Click Apply Changes
```

---

### 5. Advanced Layout Modes

#### Default Layout
- **Best for**: Normal development
- **Split**: 50% editor, 50% preview/tools
- **Tabs**: Chat, Profiler, Inspector

```
[Monaco]                [Preview]
                        [Tabs: Chat/Profiler/Inspector]
```

#### Compact Layout
- **Best for**: Focus on code
- **Split**: Large editor, small sidebar
- **Sidebar**: Chat only

```
[Monaco........................][Chat]
```

#### Fullscreen Layout
- **Best for**: Single panel focus
- **Full**: Takes entire screen
- **Use case**: Working on profiler or inspector exclusively

```
[....Profiler/Chat/Inspector....]
```

#### Debug Layout
- **Best for**: Seeing everything
- **Split**: 4 quadrants
- **View**: Editor, Preview, Chat, Profiler, Inspector, Errors all visible

```
[Editor]        [Preview]
[Chat][Profile][Inspector]
```

---

### 6. Production Deployment

#### Docker (Recommended)
```bash
# Build image
docker build -t holoscript-playground:latest .

# Run container
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e CLAUDE_API_KEY=$CLAUDE_API_KEY \
  holoscript-playground:latest

# View logs
docker logs -f
```

#### Docker Compose (Full Stack)
```bash
# Start playground + Ollama
docker-compose --profile with-ollama up -d

# Start everything
docker-compose --profile with-brittney --profile with-ollama --profile with-cache --profile with-database up -d

# Check status
docker-compose ps

# Logs
docker-compose logs -f holoscript-playground
```

#### Cloud Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- AWS (ECS, Fargate, App Runner)
- Azure (Container Instances, App Service)
- GCP (Cloud Run, GKE)
- Kubernetes (K8s)

---

### 7. Workflow Examples

#### Example 1: Quick Prototype
```
1. Open playground
2. Ask Brittney: "Create a simple platformer level"
3. Brittney streams template → Parkour scene code
4. Copy to editor
5. Use Inspector to customize colors and positions
6. Use Profiler to monitor FPS
7. Export or deploy
```

#### Example 2: AI-Assisted Development
```
1. Write initial HoloScript code
2. Ask Brittney: "Analyze my code for performance issues"
3. Brittney suggests optimizations (streaming response)
4. Apply suggestions
5. Use Profiler to verify improvements
6. Refine and iterate
```

#### Example 3: Multi-AI Comparison
```
1. Ask OpenAI: "Generate a treasure chest"
2. Save response
3. Switch provider to Claude
4. Ask Claude: "Generate a treasure chest"
5. Compare quality and pick best
6. Customize with Inspector
```

#### Example 4: Performance Optimization
```
1. Load complex scene
2. Open Profiler → See FPS dropping
3. Identify bottleneck (memory spike)
4. Use Inspector to disable physics on non-essential objects
5. Watch Profiler metrics improve in real-time
6. Export optimized scene
```

---

### 8. Tips & Tricks

#### AI Tips
- Use specific prompts: "Create a glowing red sphere with 2 units radius"
- Ask for explanation: "Explain this HoloScript behavior"
- Request optimization: "How can I optimize this for mobile?"
- Use templates as starting point, then customize

#### Performance Tips
- Monitor Profiler while developing
- Yellow = investigate, Red = urgent optimization needed
- Keep object count under 500 for 60 FPS
- Use simpler materials (lower metalness/roughness) for better FPS

#### Inspector Tips
- Double-click color box to open system color picker
- Use arrow keys to fine-tune numeric values
- Shift+click to move in larger steps
- Right-click for context menu (copy/paste properties)

#### Layout Tips
- Use Compact for distraction-free coding
- Switch to Debug when troubleshooting
- Use Default for normal development workflow
- Fullscreen for specific task focus

---

### 9. Troubleshooting

#### AI Not Responding?
```
✓ Check API keys in .env file
✓ Verify internet connection
✓ Check provider status (especially OpenAI)
✓ Try different provider (Brittney is always available)
✓ Check browser console for errors (F12)
```

#### Profiler Not Updating?
```
✓ Ensure preview is running (not paused)
✓ Check that 3D scene has objects
✓ Refresh page (Ctrl+R)
✓ Disable browser extensions that block telemetry
```

#### Inspector Not Showing Properties?
```
✓ Click on object in 3D preview first
✓ Ensure object is selectable (not locked)
✓ Check object type is supported
✓ Look for error messages in console
```

#### Docker Container Won't Start?
```
✓ Check available ports (docker ps)
✓ Verify environment variables are set
✓ Check Docker logs: docker logs -f container_id
✓ Try rebuilding: docker build --no-cache .
```

---

### 10. Next Steps

1. **Explore Templates** - Try each category of templates
2. **Multi-AI Comparison** - Compare OpenAI vs Claude vs Ollama
3. **Performance Tuning** - Use Profiler to optimize scenes
4. **Deploy to Cloud** - Try AWS or GCP deployment
5. **Extend Templates** - Create custom templates for your projects
6. **Integrate in Production** - Deploy to production environment

---

### 📚 Additional Resources

- **Full Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Week 2 Implementation Details**: [WEEK2_IMPLEMENTATION.md](./WEEK2_IMPLEMENTATION.md)
- **Architecture Overview**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)

---

**Happy coding with HoloScript Playground! 🚀**
