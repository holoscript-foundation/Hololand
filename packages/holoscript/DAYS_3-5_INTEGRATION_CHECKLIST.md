# HoloScript Integration Checklist - Days 3-5

**Status**: Ready for Days 3-5 Execution
**Current**: CLI + Watch mode complete (Days 1-3 ✅)
**Next**: Test expansion, Frontend integration, Performance optimization

---

## Days 3-4: Comprehensive Test Expansion

### Unit Tests Enhancement

**CLI Test Expansion**:
- [ ] Test with real file system (not just mocks)
- [ ] Test error messages are actionable
- [ ] Test with large files (>1MB .hs)
- [ ] Test with deeply nested zones (10+ levels)
- [ ] Test Unicode in identifiers
- [ ] Test Windows path handling
- [ ] Test symlink handling
- [ ] Test permission errors (read-only files)
- [ ] Test concurrent builds
- [ ] Test process signals (SIGTERM, SIGHUP)

**Watch Mode Test Expansion**:
- [ ] Test file deletion during watch
- [ ] Test file permissions change during watch
- [ ] Test symlink changes
- [ ] Test rapid successive changes (10+ in 500ms)
- [ ] Test memory usage over time (1000+ rebuilds)
- [ ] Test with network drives (if applicable)
- [ ] Test interruption recovery
- [ ] Test debounce reset logic
- [ ] Test error message consistency
- [ ] Test with very long file paths

**Performance Tests**:
- [ ] Measure lexer performance (tokens/ms)
- [ ] Measure parser performance (nodes/ms)
- [ ] Measure compiler performance (bytes/ms)
- [ ] Profile memory usage (peak, sustained)
- [ ] Test build time vs file size
- [ ] Test watch mode memory leaks
- [ ] Test compilation optimization impact
- [ ] Test source map generation cost

**Integration Tests**:
- [ ] Test CLI with Next.js build
- [ ] Test watch mode with next dev
- [ ] Test with webpack dev server
- [ ] Test with Vite dev server
- [ ] Test generated code imports correctly
- [ ] Test compiled components render
- [ ] Test event handlers bind correctly
- [ ] Test material compilation
- [ ] Test model loading
- [ ] Test position accuracy

### Coverage Goals

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| CLI | 30 tests | 50+ tests | +20 |
| Watch | 20 tests | 40+ tests | +20 |
| Performance | 5 benches | 15+ benches | +10 |
| Integration | 0 tests | 20+ tests | +20 |
| **Total** | **50 tests** | **125+ tests** | **+75** |

**Coverage Target**: >80% code coverage

---

## Days 4-5: Frontend Integration

### Next.js Integration

**Setup**:
- [ ] Create `next.config.js` hook
- [ ] Add build-time HoloScript compilation
- [ ] Auto-discover `.hs` files
- [ ] Generate `.tsx` to `src/generated/`
- [ ] Add to build pipeline (before `next build`)
- [ ] Test build doesn't break on errors

**Code**:
```javascript
// next.config.js enhancement
const holoscriptPlugin = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Watch mode integration
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};
```

**WorldBuilder Integration**:
- [ ] Wire CLI into WorldBuilder save action
- [ ] Generate component on world save
- [ ] Refresh component in preview
- [ ] Handle compilation errors gracefully
- [ ] Display error messages to user
- [ ] Show compilation time to user

**Component Generation**:
- [ ] Auto-create import statements
- [ ] Update component registry
- [ ] Create barrel exports (`index.ts`)
- [ ] Link to routing system
- [ ] Test with existing worlds (Casino, BuilderShop)

### API Integration

**Express Server** (if not Next.js):
```javascript
// POST /api/compile
// body: { hsCode: string, outputPath?: string }
// response: { success: boolean, tsx: string, error?: string }
```

**REST API**:
- [ ] Create `POST /api/worlds/compile` endpoint
- [ ] Accept `.hs` source code
- [ ] Return compiled `.tsx`
- [ ] Validate input
- [ ] Return error details
- [ ] Log compilation metrics

**WebSocket** (for watch mode integration):
```javascript
// ws://localhost:3000/api/ws/holoscript
// message: { type: 'compile', hs: string }
// response: { type: 'compiled', tsx: string, duration: ms }
```

---

## Day 5: Performance & Polish

### Performance Profiling

**Measurement**:
- [ ] Profile lexer (tokens/ms)
- [ ] Profile parser (nodes/ms)
- [ ] Profile compiler (bytes/ms)
- [ ] Measure memory peak
- [ ] Measure memory baseline
- [ ] Identify hot paths
- [ ] Create flame graphs
- [ ] Document results

**Optimization**:
- [ ] Optimize lexer (regex or FSM?)
- [ ] Cache parser results (if multi-pass)
- [ ] Pre-compile helper functions
- [ ] Reduce string allocations
- [ ] Use streaming for large files
- [ ] Implement AST caching

**Targets**:
- [ ] Lexer: >1000 tokens/ms
- [ ] Parser: >500 nodes/ms
- [ ] Compiler: >100KB/ms output
- [ ] Memory: <50MB for typical world
- [ ] Watch rebuild: <300ms

### Source Maps

**Implementation**:
- [ ] Generate source maps
- [ ] Link `.tsx` to `.hs` source
- [ ] Support browser DevTools
- [ ] Support VS Code debugging
- [ ] Include variable names
- [ ] Preserve column accuracy

**Testing**:
- [ ] Verify source map accuracy
- [ ] Test in browser DevTools
- [ ] Test in VS Code
- [ ] Test with minified code

### Code Minification

**Implementation**:
- [ ] Add terser for JS minification
- [ ] Add swc for faster minification
- [ ] Reduce output size 30-40%
- [ ] Maintain readability when `--no-minify`

**Testing**:
- [ ] Verify minified code works
- [ ] Measure size reduction
- [ ] Test with all features
- [ ] Verify no logic breaks

### Documentation Updates

**Final Documentation**:
- [ ] Update README with new features
- [ ] Add CLI tutorial
- [ ] Add watch mode guide
- [ ] Add performance tips
- [ ] Add troubleshooting section
- [ ] Add API reference
- [ ] Add example workflows
- [ ] Add CI/CD integration guide

**Code Documentation**:
- [ ] Add JSDoc to CLI functions
- [ ] Document all exports
- [ ] Add inline comments for complex logic
- [ ] Update type definitions
- [ ] Add error code reference

---

## Integration Checklist - Ready Now

### ✅ Immediate (No blockers)

- [x] CLI tool complete
- [x] Build command working
- [x] Watch mode infrastructure done
- [x] 50+ tests created
- [x] Documentation written
- [x] Code committed and pushed

### 🔄 In Progress (Days 3-4)

- [ ] Additional tests (expand 50 → 125+)
- [ ] Performance profiling
- [ ] Error handling edge cases
- [ ] Integration tests with actual frameworks

### 📅 Next Phase (Days 4-5)

- [ ] Next.js integration
- [ ] WorldBuilder integration
- [ ] REST API for compilation
- [ ] WebSocket for watch mode
- [ ] Performance optimization
- [ ] Source maps
- [ ] Minification

---

## Testing Strategy

### Unit Tests (Existing)
- CLI: 30+ tests
- Watch: 20+ tests
- Compiler: 20+ tests (from Week 1)
- Parser: 20+ tests (from Week 1)
- Lexer: 20+ tests (from Week 1)

**Current Total**: 110 tests

### Integration Tests (To Add)
- CLI + File system: 10+ tests
- Watch + File system: 10+ tests
- CLI + Compiler pipeline: 10+ tests
- Generated code + React: 10+ tests

**To Add**: 40+ tests

### End-to-End Tests (To Add)
- CLI with Next.js: 5+ tests
- Watch with dev server: 5+ tests
- WorldBuilder compilation: 5+ tests
- Full workflow (write .hs → render): 5+ tests

**To Add**: 20+ tests

### Performance Tests (To Add)
- Lexer benchmarks: 5+ tests
- Parser benchmarks: 5+ tests
- Compiler benchmarks: 5+ tests
- CLI benchmarks: 5+ tests
- Watch mode benchmarks: 5+ tests

**To Add**: 25+ tests

**Final Target**: 195+ tests with >80% coverage

---

## Risk Mitigation

### Identified Risks

1. **Performance degradation with large files**
   - Mitigation: Add performance benchmarks Days 3-4
   - Target: <500ms for world with 50+ entities

2. **Watch mode memory leaks**
   - Mitigation: Memory profiling Day 5
   - Target: <100MB sustained memory

3. **Integration with dev servers**
   - Mitigation: Test with actual Next.js, Webpack, Vite Days 4-5
   - Fallback: Polling if event-based fails

4. **Path handling across platforms**
   - Mitigation: Test on Windows, macOS, Linux
   - Fallback: Use path.join() everywhere

5. **Concurrent compilation requests**
   - Mitigation: Add queue/lock Days 4-5
   - Fallback: Reject concurrent requests

### Contingency Plans

- If performance target missed: Use worker threads
- If watch integration fails: Use polling + HTTP
- If memory issues: Implement streaming compilation
- If path issues: Use cross-platform library

---

## Success Metrics - End of Week 2

### Code Quality
- [ ] >80% test coverage
- [ ] 0 compilation errors
- [ ] 0 runtime errors in tests
- [ ] <10 TODO comments (known future work)

### Performance
- [ ] Build <100ms for small files
- [ ] Build <500ms for large files
- [ ] Watch rebuild <300ms
- [ ] Memory <100MB sustained

### Integration
- [ ] Works with Next.js
- [ ] Works with Webpack
- [ ] Works with Vite
- [ ] Works standalone

### Documentation
- [ ] CLI fully documented
- [ ] Integration guide complete
- [ ] Examples working
- [ ] Troubleshooting comprehensive

### Testing
- [ ] 195+ test cases
- [ ] >80% coverage
- [ ] All tests passing
- [ ] Performance targets met

---

## Timeline

**Days 3-4**: Test expansion + Performance profiling
```
Day 3:
- Morning: Write additional unit tests (20+)
- Afternoon: Integration tests (10+)
- Evening: Performance benchmarks (10+)

Day 4:
- Morning: Performance optimization
- Afternoon: Error handling edge cases (10+)
- Evening: Coverage analysis
```

**Days 4-5**: Frontend integration + Polish
```
Day 4:
- Morning: Next.js integration setup
- Afternoon: WorldBuilder integration
- Evening: REST API for compilation

Day 5:
- Morning: Source maps + minification
- Afternoon: Final performance tuning
- Evening: Documentation + polish
```

---

## Deliverables Checklist

### Week 2 Final (Jan 22)

- [ ] CLI tool production-ready
- [ ] Watch mode production-ready
- [ ] 195+ comprehensive tests
- [ ] >80% code coverage
- [ ] Full documentation
- [ ] Performance targets met
- [ ] Integration examples working
- [ ] All code pushed to main
- [ ] Ready for production deployment

---

## Owner & Stakeholders

**Owner**: HoloScript Team

**Stakeholders**:
- Frontend Team: Needs CLI by Jan 23
- DevOps Team: Needs CI/CD integration by Jan 20
- QA Team: Needs test suite by Jan 19
- Product Team: Needs docs by Jan 22

---

**Created**: January 15, 2026
**Ready For**: Days 3-5 Execution
**Status**: ✅ All prerequisites complete
