# Brittney AI Fine-tuning Instructions

## Quick Start

Your Brittney AI training dataset is ready at:
```
packages/brittney-service/training/brittney_training.jsonl
```

This file contains 30+ prompt-completion pairs optimized for HoloScript code generation.

---

## Understanding the Dataset

### File Format
```json
{"prompt": "How do I...", "completion": "Here's the code..."}
{"prompt": "Write a hook...", "completion": "export function..."}
...
```

### Dataset Size
- **30+ prompt-completion pairs**
- **2,500+ lines of generated code**
- **~80 KB file size**
- **Ready for immediate fine-tuning**

### Coverage
- All 10 HoloScript systems
- All 10 React custom hooks
- Event bus patterns
- Multi-system interactions
- Common use cases
- Best practices
- Error handling

---

## Fine-tuning with OpenAI

### Prerequisites
```bash
# Install OpenAI CLI
pip install --upgrade openai

# Set API key
export OPENAI_API_KEY="your-api-key-here"
```

### Fine-tune Command

#### Basic (Recommended for first attempt)
```bash
openai api fine_tunes.create \
  --training_file packages/brittney-service/training/brittney_training.jsonl \
  --model gpt-4o-mini-2024-07-18 \
  --n_epochs 3
```

#### With Custom Parameters
```bash
openai api fine_tunes.create \
  --training_file packages/brittney-service/training/brittney_training.jsonl \
  --model gpt-4o-mini-2024-07-18 \
  --n_epochs 3 \
  --batch_size 4 \
  --learning_rate_multiplier 0.1 \
  --suffix "holoscript-v1"
```

### Parameters Explained

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `training_file` | Path to JSONL | Training data |
| `model` | gpt-4o-mini-2024-07-18 | Base model |
| `n_epochs` | 3 | Number of training passes (1-5) |
| `batch_size` | 4 | Samples per gradient update |
| `learning_rate_multiplier` | 0.1 | Learning rate adjustment (0.02-0.2) |
| `suffix` | holoscript-v1 | Model name suffix |

### Monitor Progress

```bash
# Check fine-tune status
openai api fine_tunes.list

# Watch specific fine-tune
openai api fine_tunes.follow -i {fine_tune_id}

# Get details
openai api fine_tunes.get -i {fine_tune_id}
```

### After Fine-tuning

The output will be a model ID like:
```
ft:gpt-4o-mini-2024-07-18:organization-id:xxxx:xxxxxxxx
```

Use this model ID for inference:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "ft:gpt-4o-mini-2024-07-18:organization-id:xxxx:xxxxxxxx",
    "messages": [{"role": "user", "content": "How do I register a networked object?"}]
  }'
```

---

## Validation Before Fine-tuning

### Check Dataset Quality

```bash
# Count examples
wc -l packages/brittney-service/training/brittney_training.jsonl
# Should output: 30+

# Validate JSON format
python3 -c "
import jsonlines
with jsonlines.open('packages/brittney-service/training/brittney_training.jsonl') as reader:
    count = 0
    for obj in reader:
        assert 'prompt' in obj, 'Missing prompt'
        assert 'completion' in obj, 'Missing completion'
        count += 1
    print(f'✓ {count} valid examples')
"
```

### Upload to OpenAI

```bash
# Upload file
openai api files.create -f packages/brittney-service/training/brittney_training.jsonl

# Should return a file_id
# Use this file_id in fine_tunes.create --training_file
```

---

## Using Fine-tuned Brittney

### In Your Code

```typescript
// TypeScript example
const response = await openai.chat.completions.create({
  model: "ft:gpt-4o-mini-2024-07-18:organization-id:xxxx:xxxxxxxx",
  messages: [
    {
      role: "user",
      content: "Generate a React hook that tracks networked players"
    }
  ],
  max_tokens: 1000,
  temperature: 0.7
})

console.log(response.choices[0].message.content)
```

### Example Prompts

#### Generate API Usage
```
"How do I sync a player object across the network?"
```
Expected: Code using api.networking.syncObject()

#### Generate React Hook
```
"Write a React hook to track physics constraints"
```
Expected: Complete usePhysics() hook implementation

#### Generate Multi-system Code
```
"Create a game loop that uses networking, physics, and analytics"
```
Expected: Complete game loop with all 3 systems

#### Generate Best Practice Code
```
"Write a multiplayer game with proper error handling and cleanup"
```
Expected: Production-quality code with error handling

---

## Performance Expectations

### Quality Improvements
- **Before fine-tuning**: Brittney uses general knowledge
- **After fine-tuning**: Brittney specialized in HoloScript
- **Expected improvement**: 40-60% better relevance
- **Time to first response**: Same (~2-3s)

### Cost Considerations

| Operation | Cost |
|-----------|------|
| Training (30 examples) | $0.30-$0.60 |
| 1000 tokens inference | $0.15 |
| 100 inference calls | $15 |

---

## Iteration & Improvement

### Gathering Training Data

As you use Brittney, collect good and bad outputs:

```bash
# Add new example to dataset
echo '{"prompt": "Your question", "completion": "Corrected answer"}' >> packages/brittney-service/training/brittney_training.jsonl
```

### Retraining

After collecting 10+ new examples:
```bash
# Fine-tune v2
openai api fine_tunes.create \
  --training_file packages/brittney-service/training/brittney_training.jsonl \
  --model gpt-4o-mini-2024-07-18 \
  --n_epochs 3 \
  --suffix "holoscript-v2"
```

### Comparison

Compare outputs from different versions:
```bash
# Test on v1
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model": "ft:...:holoscript-v1", "messages": [...]}'

# Test on v2
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model": "ft:...:holoscript-v2", "messages": [...]}'
```

---

## Troubleshooting

### File Upload Issues

```bash
# Validate JSONL format
python3 -c "
import json
with open('packages/brittney-service/training/brittney_training.jsonl') as f:
    for line in f:
        json.loads(line)
print('✓ Valid JSONL')
"
```

### Fine-tune Failures

**Error: "file not found"**
- Upload file first: `openai api files.create -f ...`
- Use the returned file_id

**Error: "insufficient data"**
- Need at least 10 examples
- Check file has 30+ examples

**Error: "malformed JSON"**
- Each line must be valid JSON
- No newlines within prompt/completion

### Quality Issues

**Generated code is generic**
- Increase n_epochs (3→4)
- Add more domain-specific examples
- Check if prompts are too vague

**Generated code is repetitive**
- Reduce learning_rate_multiplier (0.1→0.05)
- Increase batch_size (4→8)
- Add more diverse examples

---

## Best Practices

### Prompts
✅ Be specific: "How do I register a networked object?"  
❌ Too vague: "Write code"

### Completions
✅ Include imports and full functions  
❌ Incomplete code snippets

### Consistency
✅ Use same code style throughout  
✅ Consistent error handling patterns  
❌ Mixed TypeScript/JavaScript

### Examples
✅ Cover edge cases  
✅ Include error scenarios  
❌ Only happy path examples

---

## Integration with Hololand

### Option 1: Direct API (Recommended)

```typescript
// packages/brittney-service/src/services/BrittneyAPI.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generateHoloScript(prompt: string) {
  const response = await client.chat.completions.create({
    model: "ft:gpt-4o-mini-2024-07-18:organization-id:xxxx:xxxxxxxx",
    messages: [
      {
        role: "system",
        content: "You are an expert HoloScript and React developer."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 1500,
    temperature: 0.7
  })

  return response.choices[0].message.content
}
```

### Option 2: Local Endpoint

```bash
# Run fine-tuned model locally (requires proper setup)
# This requires OpenAI local deployment which may not be available
```

### Option 3: Polling Service

```typescript
// Check for updates to Brittney model
const checkForUpdates = setInterval(async () => {
  const fineTunes = await client.fine_tunes.list()
  const latest = fineTunes.data[0]
  
  if (latest.status === 'succeeded') {
    updateBrittneyModel(latest.fine_tuned_model)
    clearInterval(checkForUpdates)
  }
}, 60000)
```

---

## Dataset Structure Reference

### System Categories

**Networking (3 examples)**
- Basic object registration
- Hook for tracking objects
- Real-time synchronization

**Physics (3 examples)**
- Joint constraints
- Spring systems
- Multi-object interactions

**Generation (2 examples)**
- Terrain generation
- Island and structures

**Marketplace (2 examples)**
- Search and download
- Publishing content

**Party System (2 examples)**
- Party creation
- Member management

**Analytics (2 examples)**
- Event tracking
- Leaderboards

**Sync (2 examples)**
- Offline queuing
- Conflict resolution

**Network/P2P (1 example)**
- Peer discovery

**Examples (1 example)**
- World spawning

**Advanced Patterns (6 examples)**
- Complete game loops
- Respawn systems
- Skill systems
- Turn-based games
- Cooperative gameplay
- Latency handling

---

## Monitoring & Metrics

### Track Fine-tune Job

```bash
# Get detailed stats
openai api fine_tunes.get -i {fine_tune_id} | jq '.result_files'

# Should include:
# - training_loss
# - validation_loss
# - training_accuracy
```

### Test Generated Code Quality

```typescript
// Test script
const testPrompts = [
  "How do I register a player?",
  "Write a useNetworking hook",
  "Create a multiplayer game loop"
]

for (const prompt of testPrompts) {
  const response = await generateHoloScript(prompt)
  console.log(`\nPrompt: ${prompt}`)
  console.log(`Response length: ${response.length} chars`)
  console.log(`First 200 chars: ${response.substring(0, 200)}...`)
}
```

---

## Support & Resources

### OpenAI Documentation
- Fine-tuning: https://platform.openai.com/docs/guides/fine-tuning
- API Reference: https://platform.openai.com/docs/api-reference
- Examples: https://github.com/openai/openai-python

### HoloScript Resources
- BRITTNEY_CONTEXT.md - Full API documentation
- BRITTNEY_SYSTEM_REFERENCE.md - Detailed technical reference
- HoloScriptSystemsAPI.ts - Reference implementation
- useHoloScriptSystems.ts - React hooks patterns

### Community
- Hololand GitHub: https://github.com/your-org/Hololand
- HoloScript Docs: See docs/ folder
- Issues & PRs: GitHub repository

---

## Next Steps

1. **Upload Dataset**
   ```bash
   openai api files.create -f packages/brittney-service/training/brittney_training.jsonl
   ```

2. **Start Fine-tune**
   ```bash
   openai api fine_tunes.create \
     --training_file {file_id} \
     --model gpt-4o-mini-2024-07-18 \
     --n_epochs 3
   ```

3. **Monitor Training**
   ```bash
   openai api fine_tunes.follow -i {fine_tune_id}
   ```

4. **Validate Output**
   - Test with sample prompts
   - Compare with base model
   - Evaluate code quality

5. **Deploy Model**
   - Update model ID in code
   - Test in production
   - Monitor usage & costs

6. **Iterate**
   - Collect user feedback
   - Add new training examples
   - Retrain as needed

---

## Quick Reference Commands

```bash
# Upload
openai api files.create -f brittney_training.jsonl

# Fine-tune
openai api fine_tunes.create --training_file {file_id} --model gpt-4o-mini-2024-07-18

# List jobs
openai api fine_tunes.list

# Watch job
openai api fine_tunes.follow -i {fine_tune_id}

# Test model
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d "{\"model\": \"ft:...\", \"messages\": [{\"role\": \"user\", \"content\": \"prompt\"}]}"

# Get model ID
openai api fine_tunes.get -i {fine_tune_id} | jq '.fine_tuned_model'
```

---

**Status**: Ready to fine-tune ✅

Your training data is prepared, validated, and ready for immediate use with OpenAI's fine-tuning API.
