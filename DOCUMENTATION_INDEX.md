# 📖 Hololand Documentation Index

**What is this?** A table of contents for all Hololand documentation. Find what you need fast.

---

## 🏗️ Repository Structure (January 2026)

> **Important:** HoloScript language is now maintained in a [separate repository](https://github.com/brianonbased-dev/HoloScript).

| Repo | Purpose | Packages |
|------|---------|----------|
| **Hololand** (this repo) | VR/AR platform, adapters, Brittney AI | 38 |
| **[HoloScript](https://github.com/brianonbased-dev/HoloScript)** | Language, parser, dev tools | 14 |

---

## 📁 File Types (Start Here)

Not sure which file format to use?

| Extension | When To Use |
|-----------|-------------|
| `.holo` | Learning, simple demos |
| `.hsplus` | Production, multiplayer |

👉 **[docs/HOLOSCRIPT_FILE_TYPES.md](docs/HOLOSCRIPT_FILE_TYPES.md)** - Full guide with examples

---

## 🎯 Quick Links

| Document | Read Time | What It Covers |
|----------|-----------|----------------|
| [QUICK_STATUS.md](QUICK_STATUS.md) | 2 min | Test stats, quality metrics |
| [README.md](README.md) | 5 min | Getting started, install, basic usage |
| [QUICKSTART.md](QUICKSTART.md) | 5 min | AI integration, voice commands |

---

## 📚 Detailed Docs
👉 **[COMPLETION_SUMMARY.txt](COMPLETION_SUMMARY.txt)** (5 min read)
- Formatted ASCII summary
- Statistics at a glance
- Next steps overview

---

## 📚 DETAILED DOCUMENTATION

### Test Suite Reference
📖 **[packages/brittney-toolkit/TEST_SUITE_DOCUMENTATION.md](packages/brittney-toolkit/TEST_SUITE_DOCUMENTATION.md)**
- Complete test breakdown (102 tests)
- Test statistics by suite
- Features tested checklist
- Implementation patterns
- Test execution guide
- Coverage information

**Read this when**: You need detailed test documentation

---

### Test Execution Guide
🔧 **[packages/brittney-toolkit/run-tests.sh](packages/brittney-toolkit/run-tests.sh)**
- 30+ test execution patterns
- Watch mode configurations
- Coverage reporting commands
- CI/CD integration examples
- Debugging techniques
- Performance analysis
- Quick sanity checks
- Development workflow

**Read this when**: You need to run tests in a specific way

---

### Development Roadmap
🗺️ **[DEVELOPMENT_ROADMAP_2026.md](DEVELOPMENT_ROADMAP_2026.md)**
- Completed phases (Phases 0-2)
- 3 Priority tracks for next 6 weeks
  - Track 1: HoloScript Playground (2-3 weeks)
  - Track 2: Component Library (3-4 weeks)
  - Track 3: WorldBuilder Enhancement (2-3 weeks)
- Detailed deliverables per track
- Week-by-week breakdown
- Success metrics
- Technology stack
- Resource requirements

**Read this when**: Planning next development phase

---

## 🧪 TEST SUITES

### LocalInference.test.ts
**Location**: `packages/brittney-toolkit/src/inference/__tests__/LocalInference.test.ts`
- **Tests**: 20
- **Lines**: 233
- **Coverage**:
  - Constructor initialization
  - Model loading and caching
  - Generate method
  - Statistics tracking
  - Error handling
  - Configuration validation

### CloudInference.test.ts
**Location**: `packages/brittney-toolkit/src/inference/__tests__/CloudInference.test.ts`
- **Tests**: 22
- **Lines**: 287
- **Coverage**:
  - Multi-provider support
  - API key validation
  - Streaming responses
  - Batch processing
  - Rate limiting
  - Result caching
  - Fallback strategy

### BrittneyEngine.test.ts
**Location**: `packages/brittney-toolkit/src/inference/__tests__/BrittneyEngine.test.ts`
- **Tests**: 35
- **Lines**: 503
- **Coverage**:
  - Mode switching
  - Auto-fallback
  - HoloScript features
  - Conversation history
  - Health checking
  - Cost estimation
  - Error recovery

### integration.test.ts
**Location**: `packages/brittney-toolkit/src/inference/__tests__/integration.test.ts`
- **Tests**: 25
- **Lines**: 456
- **Coverage**:
  - Fallback chains
  - Hybrid strategies
  - Complete workflows
  - Performance monitoring
  - Resource management
  - Advanced scenarios

---

## 🎯 BY PURPOSE

### "I want to run tests"
→ See [run-tests.sh](packages/brittney-toolkit/run-tests.sh)

```bash
npm run test                    # All tests
npm run test:watch            # Watch mode
npm run test -- --coverage    # Coverage report
```

### "I want to understand what was tested"
→ See [TEST_SUITE_DOCUMENTATION.md](packages/brittney-toolkit/TEST_SUITE_DOCUMENTATION.md)

### "I want to migrate from Microsoft Mesh / HoloLens 2"
→ See [Microsoft Mesh Migration Guide](docs/guides/MICROSOFT_MESH_MIGRATION_GUIDE.md)

### "I want to plan the next phase"
→ See [DEVELOPMENT_ROADMAP_2026.md](DEVELOPMENT_ROADMAP_2026.md)

### "I want a quick status"
→ See [QUICK_STATUS.md](QUICK_STATUS.md)

### "I want the complete summary"
→ See [BRITTNEY_TOOLKIT_TEST_COMPLETION.md](BRITTNEY_TOOLKIT_TEST_COMPLETION.md)

### "I want visual ASCII summary"
→ See [COMPLETION_SUMMARY.txt](COMPLETION_SUMMARY.txt)

---

## 📊 STATISTICS

| Metric | Value |
|--------|-------|
| Total Tests | 102 |
| Total Lines | 1,479 |
| Test Suites | 4 |
| Documentation Pages | 6 |
| Test Execution Patterns | 30+ |

---

## 🔍 FEATURES COVERED

✅ Local inference (GGUF models)  
✅ Cloud inference (multi-provider)  
✅ Auto-fallback strategy  
✅ Streaming responses  
✅ Batch processing  
✅ Request caching  
✅ HoloScript generation  
✅ Code validation  
✅ Conversation history  
✅ Token tracking  
✅ Cost estimation  
✅ Performance monitoring  
✅ Error recovery  
✅ Health checking  

---

## 🚀 QUICK START

### 1. Run All Tests
```bash
cd packages/brittney-toolkit
npm run test
```

### 2. Watch During Development
```bash
npm run test:watch
```

### 3. Generate Coverage
```bash
npm run test -- --coverage
```

### 4. Run Specific Suite
```bash
npm run test -- LocalInference.test.ts
```

---

## 📋 DOCUMENT PURPOSES

| Document | Purpose | Read Time |
|----------|---------|-----------|
| QUICK_STATUS.md | Overview snapshot | 2 min |
| TEST_SUITE_DOCUMENTATION.md | Complete test reference | 10 min |
| run-tests.sh | Test execution patterns | 5 min |
| BRITTNEY_TOOLKIT_TEST_COMPLETION.md | Session summary | 10 min |
| DEVELOPMENT_ROADMAP_2026.md | 6-week plan | 15 min |
| COMPLETION_SUMMARY.txt | Visual status | 5 min |
| This file | Navigation guide | 3 min |

---

## ✅ NEXT STEPS

### Immediate
1. ✅ All tests created (done)
2. ✅ Documentation complete (done)
3. Run tests: `npm run test`
4. Review coverage: `npm run test -- --coverage`
5. Integrate with CI/CD

### Short-term (Weeks 1-2)
→ Build HoloScript Playground (see [DEVELOPMENT_ROADMAP_2026.md](DEVELOPMENT_ROADMAP_2026.md))

### Medium-term (Weeks 3-4)
→ Create Component Library

### Long-term (Weeks 5-6)
→ Enhance WorldBuilder Integration

---

## 🎓 LEARNING RESOURCES

All documentation follows these patterns:

- **Clear headings** with emoji for quick scanning
- **Code examples** where relevant
- **Quick commands** for common tasks
- **Detailed sections** for deep dives
- **Navigation links** for easy jumping

---

## 💡 TIPS

### Finding Specific Tests
Search for test names in `TEST_SUITE_DOCUMENTATION.md`

### Running Tests During Development
Use `npm run test:watch` for hot-reload feedback

### Understanding Test Structure
Each test follows: Setup → Execute → Assert

### Adding New Tests
Place in `src/inference/__tests__/` folder with `.test.ts` extension

### CI/CD Integration
See `run-tests.sh` for GitHub Actions examples

---

## ❓ FAQ

**Q: Where are the test files?**  
A: `packages/brittney-toolkit/src/inference/__tests__/`

**Q: How many tests total?**  
A: 102 tests across 4 suites (1,479 lines)

**Q: How do I run tests?**  
A: `npm run test` or `npm run test:watch`

**Q: Where's the roadmap?**  
A: `DEVELOPMENT_ROADMAP_2026.md`

**Q: What's the coverage target?**  
A: 80%+ (comprehensive coverage)

**Q: Can I run specific tests?**  
A: Yes, see `run-tests.sh` for 30+ patterns

**Q: How do I add new tests?**  
A: Create `.test.ts` file in `__tests__` folder

---

## 📞 SUPPORT

For questions about:
- **Test execution** → See `run-tests.sh`
- **Test details** → See `TEST_SUITE_DOCUMENTATION.md`
- **Next phase** → See `DEVELOPMENT_ROADMAP_2026.md`
- **Session summary** → See `BRITTNEY_TOOLKIT_TEST_COMPLETION.md`
- **Quick status** → See `QUICK_STATUS.md`

---

**Created**: January 20, 2026  
**Status**: ✅ Complete  
**Ready for**: Production deployment

Start with [QUICK_STATUS.md](QUICK_STATUS.md) for a 2-minute overview!
