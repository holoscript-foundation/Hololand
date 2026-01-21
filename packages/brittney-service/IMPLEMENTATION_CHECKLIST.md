# Local Brittney Pipeline - Implementation Checklist

## 📋 Pre-Implementation Verification

- [x] **Hardware Check**
  - [x] 32GB RAM available ✅
  - [x] 6GB GPU available ✅
  - [x] i7-11800H processor ✅
  - [x] Sufficient storage for models (~5-10GB)

- [x] **Training Data Ready**
  - [x] 31 high-quality training examples
  - [x] JSONL format verified
  - [x] Feature coverage: 10/10
  - [x] Quality validation: PASSED

- [x] **Software Prerequisites**
  - [ ] Python 3.8+ installed
  - [ ] pip package manager working
  - [ ] Internet connection (for downloads)

## 🔧 Setup Phase (Do Once)

### Phase 1: Install Ollama (5 minutes)
- [ ] Download Ollama from https://ollama.ai
- [ ] Run installer
- [ ] Verify installation: `ollama --version`
- [ ] Confirm service available: `ollama list`
- [ ] Note: Service runs on `http://localhost:11434`

**Status**: ⏳ TO DO

### Phase 2: Download Base Model (10 minutes)
- [ ] Run: `ollama pull mistral:7b-instruct`
- [ ] Verify: `ollama list | grep mistral`
- [ ] Confirm size: ~4.7 GB downloaded
- [ ] Note: Only needed once

**Status**: ⏳ TO DO

### Phase 3: Prepare Training Data (5 minutes)
- [ ] Navigate to: `c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\src`
- [ ] Run: `python local-finetuning-setup.py --validate`
- [ ] Verify output file created: `brittney-finetuning-data.jsonl`
- [ ] Check validation report: All checks should PASS
- [ ] Expected file size: ~250 KB

**Commands**:
```powershell
cd C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\src
python local-finetuning-setup.py --input holoscript-enhanced-training-examples.jsonl --output brittney-finetuning-data.jsonl --validate
```

**Status**: ⏳ TO DO

### Phase 4: Fine-Tune Model (30-60 minutes, mostly waiting)

#### Option A: Together AI (RECOMMENDED)

- [ ] Create Together AI account: https://www.together.ai
- [ ] Get API key from dashboard
- [ ] Set environment variable:
  ```powershell
  $env:TOGETHER_API_KEY = "sk-your-key-here"
  ```
- [ ] Run: `python together-ai-finetuning.py --training-file brittney-finetuning-data.jsonl --wait`
- [ ] Monitor progress in terminal
- [ ] Confirm success: "✅ Fine-tuning completed!"
- [ ] Save model ID from output
- [ ] Cost: $5-10 USD

**Expected Output**:
```
📤 Uploading brittney-finetuning-data.jsonl...
✅ File uploaded with ID: file-xxxxx

🔧 Starting fine-tuning job...
✅ Fine-tuning job created with ID: job-xxxxx

⏳ Waiting for fine-tuning to complete...
   Status: running (45%)
   Status: running (85%)
✅ Fine-tuning completed!
   Model ID: together-ai/models/brittney-holoscript-v1
```

**Status**: ⏳ TO DO

#### Option B: Local Training (Alternative - Free but slow)

- [ ] Install dependencies: `pip install torch transformers peft bitsandbytes`
- [ ] Run: `python local-train-mistral.py --model mistralai/Mistral-7B-Instruct-v0.1 --data brittney-finetuning-data.jsonl --output ./brittney-lora-adapter`
- [ ] Expected time: 2-4 hours
- [ ] Monitor GPU usage
- [ ] Confirm completion: "✅ Training completed!"
- [ ] Save adapter path: `./brittney-lora-adapter`
- [ ] Cost: $0 (but takes time)

**Status**: ⏳ TO DO

### Phase 5: Create Ollama Model (2 minutes)
- [ ] Verify `Modelfile` exists in current directory
- [ ] Run: `ollama create brittney-finetuned -f Modelfile`
- [ ] Verify: `ollama list | grep brittney`
- [ ] Expected: `brittney-finetuned` appears in model list

**Commands**:
```powershell
# Check Modelfile exists
Test-Path Modelfile

# Create model
ollama create brittney-finetuned -f Modelfile

# Verify
ollama list
```

**Status**: ⏳ TO DO

## ✅ Verification Phase

### Test 1: Ollama Service Health (2 minutes)
- [ ] Start Ollama: `ollama serve`
- [ ] In new terminal, check: `curl http://localhost:11434/api/tags`
- [ ] Expected: JSON with `models` array
- [ ] Should show: `mistral:7b-instruct` and `brittney-finetuned`

**Success Criteria**:
```json
{
  "models": [
    {"name": "mistral:7b-instruct", ...},
    {"name": "brittney-finetuned", ...}
  ]
}
```

**Status**: ⏳ TO DO

### Test 2: Direct Model Inference (1 minute)
- [ ] Run: `ollama run brittney-finetuned "Create a simple warrior NPC"`
- [ ] Wait for response (~5-10 seconds)
- [ ] Verify: Output contains HoloScript code
- [ ] Check for: `npc(` function definition
- [ ] Confirm no errors in output

**Expected Output** (simplified):
```
npc("warrior", {
  type: "warrior",
  health: 100,
  behaviors: [...]
})
```

**Status**: ⏳ TO DO

### Test 3: API Request (2 minutes)
```powershell
$body = @{
    model = "brittney-finetuned"
    prompt = "Create a fire mage NPC with fireball attacks"
    stream = $false
} | ConvertTo-Json

curl -X POST http://localhost:11434/api/generate `
  -H "Content-Type: application/json" `
  -d $body
```

- [ ] Request succeeds (HTTP 200)
- [ ] Response includes `response` field
- [ ] Response contains HoloScript code
- [ ] No errors in output

**Status**: ⏳ TO DO

### Test 4: Load Ollama Service in Code (5 minutes)
```typescript
import OllamaService from './services/OllamaService';

const ollama = new OllamaService('http://localhost:11434', 'brittney-finetuned');

// Test health check
const healthy = await ollama.isHealthy();
console.log('Ollama healthy:', healthy); // Should be true

// Test list models
const models = await ollama.listModels();
console.log('Available models:', models); // Should include brittney-finetuned

// Test generation
const code = await ollama.generateNPCBehavior(
  'TestNPC',
  'warrior',
  'patrol and attack'
);
console.log('Generated code:', code); // Should be valid HoloScript
```

- [ ] OllamaService imports successfully
- [ ] Health check returns `true`
- [ ] Models list includes `brittney-finetuned`
- [ ] Generation produces valid HoloScript code
- [ ] No TypeScript errors

**Status**: ⏳ TO DO

### Test 5: Integration Layer (5 minutes)
```typescript
import BrittneyGameIntegrationOllama from './services/BrittneyGameIntegrationOllama';

const brittney = new BrittneyGameIntegrationOllama({
  useLocal: true,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'brittney-finetuned'
});

// Check status
const status = await brittney.getStatus();
console.log('Status:', status);
// Expected:
// {
//   ollamaAvailable: true,
//   ollamaModel: 'brittney-finetuned',
//   fallbackConfigured: false,
//   activeBackend: 'Ollama (Local)'
// }

// Test NPC generation
const npc = await brittney.generateNPCBehavior(
  'Aldric',
  'warrior',
  'patrol, attack, flee'
);
console.log('Generated NPC:', npc);

// Test quest generation
const quest = await brittney.generateQuest(
  'Retrieve the Crystal',
  'Find and return the lost crystal to the village'
);
console.log('Generated Quest:', quest);

// Test ability generation
const ability = await brittney.generateAbility(
  'Fireball',
  'spell',
  'Launch fire at enemies with area damage'
);
console.log('Generated Ability:', ability);
```

- [ ] Integration layer initializes
- [ ] Status check returns correct values
- [ ] Ollama backend detected as available
- [ ] NPC generation produces code
- [ ] Quest generation produces code
- [ ] Ability generation produces code
- [ ] All responses are valid HoloScript

**Status**: ⏳ TO DO

## 🎮 Integration Phase

### Phase 6: Update Hololand Components (10 minutes)

- [ ] Locate `BrittneyGameAssistant.tsx` component
- [ ] Update imports to use `BrittneyGameIntegrationOllama`
- [ ] Initialize with local Ollama config
- [ ] Update generation methods
- [ ] Verify no TypeScript errors
- [ ] Test in dev server

**Changes Required**:
```typescript
// OLD
import BrittneyGameIntegration from './services/BrittneyGameIntegration';
const brittney = new BrittneyGameIntegration();

// NEW
import BrittneyGameIntegrationOllama from './services/BrittneyGameIntegrationOllama';
const brittney = new BrittneyGameIntegrationOllama({
  useLocal: true,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'brittney-finetuned'
});
```

**Status**: ⏳ TO DO

### Phase 7: Test Game Gen UI (10 minutes)
- [ ] Start Hololand dev server: `npm run dev`
- [ ] Navigate to Game Gen tab
- [ ] Generate NPC dialogue
- [ ] Verify code appears in editor
- [ ] Check console for Ollama logs
- [ ] Test quest generation
- [ ] Test ability generation
- [ ] Test scene generation
- [ ] Verify all responses are valid

**Expected Console Logs**:
```
🤖 Generating dialogue for Aldric using local Ollama...
👾 Generating NPC code for Aldric using local Ollama...
🎯 Generating quest "Retrieve the Crystal" using local Ollama...
```

**Status**: ⏳ TO DO

## 📊 Performance Validation

- [ ] **Inference Speed Test** (multiple runs)
  - [ ] First request: ~2-3 seconds (cold start)
  - [ ] Subsequent requests: ~500-800 ms
  - [ ] Record baseline times
  - [ ] Check GPU utilization: Should see GPU usage

- [ ] **Memory Usage** (use Task Manager)
  - [ ] Check memory: Should be 8-10 GB
  - [ ] Check GPU memory: Should be 5-6 GB used
  - [ ] No memory leaks after 10+ requests

- [ ] **Code Quality** (validate outputs)
  - [ ] All generated code is valid HoloScript
  - [ ] No syntax errors in output
  - [ ] Proper formatting and structure
  - [ ] Features used correctly

- [ ] **Reliability** (stress test)
  - [ ] Run 20 sequential requests
  - [ ] All succeed without errors
  - [ ] Model stays responsive
  - [ ] No crashes or hangs

**Status**: ⏳ TO DO

## 🚀 Production Deployment

- [ ] **Setup Production Ollama Instance**
  - [ ] Copy `brittney-finetuned` model to production server
  - [ ] Start Ollama service on production
  - [ ] Verify service is running

- [ ] **Update Production Config**
  - [ ] Point to production Ollama URL
  - [ ] Verify connectivity
  - [ ] Setup monitoring

- [ ] **Monitor and Log**
  - [ ] Setup request logging
  - [ ] Monitor inference times
  - [ ] Track error rates
  - [ ] Monitor resource usage

- [ ] **Documentation**
  - [ ] Document setup steps
  - [ ] Create runbook for troubleshooting
  - [ ] Setup alert thresholds

**Status**: ⏳ TO DO

## 📈 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Ollama startup | < 5 sec | ⏳ TBD |
| Model load | < 3 sec | ⏳ TBD |
| Warm inference | 500-800 ms | ⏳ TBD |
| Memory usage | 8-10 GB | ⏳ TBD |
| GPU usage | 5-6 GB | ⏳ TBD |
| Success rate | > 99% | ⏳ TBD |

## ✨ Success Criteria (All Must Pass)

- [x] Training data prepared (31 examples)
- [ ] Ollama installed and running
- [ ] Mistral model downloaded
- [ ] Model fine-tuned (or started)
- [ ] Ollama model created (`brittney-finetuned`)
- [ ] Direct inference works (`ollama run`)
- [ ] API requests work (`curl`)
- [ ] TypeScript services compile
- [ ] Integration layer initializes
- [ ] Hololand components updated
- [ ] Game Gen UI generates code
- [ ] All output is valid HoloScript
- [ ] Performance meets targets
- [ ] No API costs charged

## 🎯 Final Checklist

Once ALL sections above are complete:

- [ ] **Documentation**
  - [ ] README updated
  - [ ] Setup instructions finalized
  - [ ] Troubleshooting guide prepared
  - [ ] Performance baselines recorded

- [ ] **Quality Assurance**
  - [ ] All tests passing
  - [ ] No console errors
  - [ ] Code reviewed
  - [ ] Performance acceptable

- [ ] **Deployment**
  - [ ] Production ready
  - [ ] Monitoring active
  - [ ] Rollback plan prepared
  - [ ] Team trained

- [ ] **Communication**
  - [ ] Stakeholders notified
  - [ ] Documentation shared
  - [ ] Support ready
  - [ ] Success metrics published

## 📞 Quick Reference

**Help Files**:
- Setup guide: `LOCAL_PIPELINE_SETUP.md`
- Quick ref: `QUICK_REFERENCE.md`
- Code docs: `OllamaService.ts`
- Integration: `BrittneyGameIntegrationOllama.ts`

**Support Commands**:
```powershell
# Check Ollama status
ollama ps

# List models
ollama list

# Test API
curl http://localhost:11434/api/tags

# Start service
ollama serve
```

---

## 🎉 When All Complete

You will have:
- ✅ Zero OpenAI API costs
- ✅ Local AI inference pipeline
- ✅ Fast generation (500-800ms)
- ✅ Production-ready system
- ✅ Full data privacy
- ✅ Unlimited generation capacity

**Estimated Total Time**: 1-2 hours (mostly waiting for fine-tuning)

**Cost**: $5-10 (one-time, for Together AI)

**Ongoing Costs**: $0 ✅

Let's do this! 🚀
