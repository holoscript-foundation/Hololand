# Brittney V2 - HoloScript Expert Model

A fine-tuned LLM specialized in HoloScript language for building VR/AR worlds in Hololand.

## Quick Start

### Run with Ollama
```bash
cd models/brittney-v2
ollama create brittney-v2 -f Modelfile
ollama run brittney-v2
```

### Example Prompts
```
"Create a simple HoloScript scene with floating orbs"
"Write a .holo composition with NPC templates"
"Generate an interactive shop scene in HoloScript"
"Explain the difference between .holo and .hsplus"
```

## Model Details

| Property | Value |
|----------|-------|
| Base Model | TinyLlama 1.1B |
| Parameters | 1.1 billion |
| Context Length | 2048 tokens |
| Format | GGUF F16 |
| Size | ~2.2 GB |
| Training Method | LoRA + Full Merge |

## Training Metrics

| Metric | Value |
|--------|-------|
| Final Train Loss | 0.0398 |
| Final Eval Loss | 0.0657 |
| Total Steps | 37,500 |
| Epochs | 3.0 |
| Training Time | 10h 53m |
| Samples/Second | 3.828 |
| Hardware | Local GPU (CUDA) |

## Files

- `brittney-v2.gguf` - The model weights in GGUF format
- `Modelfile` - Ollama configuration with system prompt and parameters

## Capabilities

Brittney V2 can:
- ✅ Generate `.holo` scene compositions
- ✅ Create templates for NPCs, objects, and interactables
- ✅ Write `.hsplus` imperative code
- ✅ Explain HoloScript concepts
- ✅ Debug and optimize scenes
- ✅ Convert between formats

## Architecture Understanding

Brittney thinks in terms of:
- **Nodes** - Objects, NPCs, templates
- **Edges** - Connections, relationships
- **Flow** - Events, actions, state changes
- **Spatial Groups** - Organized areas

## Example Output

```holo
composition "Forest Clearing" {
  template "Tree" {
    state { health: 100, swaying: true }
  }
  
  spatial_group "Grove" {
    object "Oak_1" using "Tree" { position: [0, 0, 5] }
    object "Oak_2" using "Tree" { position: [3, 0, 7] }
  }
  
  logic {
    every(2000) {
      wind_effect(Grove.trees)
    }
  }
}
```

## License

MIT License - Hololand Project
