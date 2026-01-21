#!/bin/bash
# Brittney Toolkit Test Runner Script
# Quick reference for running tests in various configurations

## ==============================================================================
## SINGLE TEST SUITES
## ==============================================================================

# Run LocalInference tests only
echo "Running LocalInference tests..."
npm run test -- LocalInference.test.ts

# Run CloudInference tests only
echo "Running CloudInference tests..."
npm run test -- CloudInference.test.ts

# Run BrittneyEngine tests only
echo "Running BrittneyEngine tests..."
npm run test -- BrittneyEngine.test.ts

# Run Integration tests only
echo "Running Integration tests..."
npm run test -- integration.test.ts

## ==============================================================================
## COMBINED SUITES
## ==============================================================================

# Run all inference tests (Local + Cloud + Engine)
echo "Running all inference tests..."
npm run test -- "inference/__tests__/**/*.test.ts"

# Run all toolkit tests
echo "Running all toolkit tests..."
npm run test

## ==============================================================================
## FILTERED TESTS
## ==============================================================================

# Run only HoloScript-related tests
echo "Running HoloScript feature tests..."
npm run test -- --grep "HoloScript"

# Run only error handling tests
echo "Running error handling tests..."
npm run test -- --grep "error|Error|throw|Throw"

# Run only performance tests
echo "Running performance tests..."
npm run test -- --grep "performance|Performance|latency|Latency"

## ==============================================================================
## WATCH MODE
## ==============================================================================

# Watch all tests
echo "Watching all tests..."
npm run test:watch

# Watch specific test file
echo "Watching LocalInference..."
npm run test:watch -- LocalInference.test.ts

## ==============================================================================
## COVERAGE REPORTING
## ==============================================================================

# Generate full coverage report
echo "Generating coverage report..."
npm run test -- --coverage

# Coverage for specific file
echo "Coverage for LocalInference..."
npm run test -- --coverage LocalInference.test.ts

# HTML coverage report
echo "Generating HTML coverage..."
npm run test -- --coverage --reporter=html

## ==============================================================================
## CI/CD INTEGRATION
## ==============================================================================

# Run tests with CI settings (no watch, exit on first failure)
echo "Running tests in CI mode..."
npm run test -- --run --reporter=verbose

# Run with JUnit XML output (for CI systems)
echo "Running with XML output..."
npm run test -- --run --reporter=junit --outputFile=test-results.xml

## ==============================================================================
## DEBUGGING
## ==============================================================================

# Run with verbose output
echo "Running with verbose output..."
npm run test -- --reporter=verbose

# Run single test with debugging
echo "Running single test with debug..."
npm run test -- --reporter=verbose LocalInference.test.ts

# Run with environment logging
echo "Running with debug logging..."
DEBUG=* npm run test

## ==============================================================================
## PERFORMANCE ANALYSIS
## ==============================================================================

# Run and measure test duration
echo "Running with duration metrics..."
npm run test -- --reporter=verbose --reporter=junit

# Slowest tests
echo "Finding slowest tests..."
npm run test -- --reporter=verbose 2>&1 | grep -E "^\s+.*ms"

## ==============================================================================
## QUICK SANITY CHECKS
## ==============================================================================

# Quick sanity check - run all tests, fast fail
npm run test -- --run --bail

# Sanity check - only basic inference tests
npm run test -- --run LocalInference.test.ts CloudInference.test.ts

# Sanity check - integration only
npm run test -- --run integration.test.ts

## ==============================================================================
## DEVELOPMENT WORKFLOW
## ==============================================================================

# 1. Start watch mode while developing
npm run test:watch

# 2. When ready, check coverage
npm run test -- --coverage

# 3. Before commit, run full suite
npm run test -- --run

# 4. Verify no regressions
npm run test -- --run --bail

## ==============================================================================
## ENVIRONMENT SETUP
## ==============================================================================

# Install dependencies
npm install

# TypeScript type checking
npm run typecheck

# Full validation before commit
npm run typecheck && npm run test -- --run && npm run build

## ==============================================================================
## TROUBLESHOOTING
## ==============================================================================

# Clear cache and rerun
rm -rf node_modules/.vitest
npm run test -- --run

# Verbose error output
npm run test -- --reporter=verbose --reporter=default

# Run with Node debugging
node --inspect-brk ./node_modules/.bin/vitest run LocalInference.test.ts
