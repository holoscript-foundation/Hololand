#!/bin/bash
# Load Testing Script for SNN Perception Demo
# Runs Artillery load tests and generates HTML reports

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
TARGET_URL="${TARGET_URL:-https://snn-perception.hololand.io}"
CONFIG_FILE="artillery-config.yml"
RESULTS_DIR="results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${RESULTS_DIR}/report_${TIMESTAMP}.json"
HTML_REPORT="${RESULTS_DIR}/report_${TIMESTAMP}.html"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}SNN Perception Demo - Load Test${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Target URL: $TARGET_URL"
echo "Config: $CONFIG_FILE"
echo "Results: $REPORT_FILE"
echo ""

# Check if Artillery is installed
if ! command -v artillery &> /dev/null; then
    echo -e "${RED}Error: Artillery is not installed${NC}"
    echo "Install with: npm install -g artillery"
    exit 1
fi

# Update target URL in config
sed -i.bak "s|target:.*|target: \"$TARGET_URL\"|" "$CONFIG_FILE"

echo -e "${YELLOW}Starting load test...${NC}"
echo ""

# Run Artillery with JSON output
artillery run "$CONFIG_FILE" --output "$REPORT_FILE"

# Check if test passed
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Load test completed successfully${NC}"
else
    echo ""
    echo -e "${RED}✗ Load test failed - check results${NC}"
    exit 1
fi

# Generate HTML report
echo ""
echo -e "${YELLOW}Generating HTML report...${NC}"
artillery report "$REPORT_FILE" --output "$HTML_REPORT"

echo -e "${GREEN}✓ HTML report generated: $HTML_REPORT${NC}"

# Restore original config
mv "${CONFIG_FILE}.bak" "$CONFIG_FILE"

# Parse key metrics from JSON report
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Key Performance Metrics${NC}"
echo -e "${GREEN}======================================${NC}"

# Extract metrics using jq (if available)
if command -v jq &> /dev/null; then
    TOTAL_REQUESTS=$(jq -r '.aggregate.counters["http.requests"]' "$REPORT_FILE")
    SUCCESS_RATE=$(jq -r '.aggregate.counters["http.responses"]' "$REPORT_FILE")
    P95_LATENCY=$(jq -r '.aggregate.summaries["http.response_time"].p95' "$REPORT_FILE")
    P99_LATENCY=$(jq -r '.aggregate.summaries["http.response_time"].p99' "$REPORT_FILE")
    MAX_LATENCY=$(jq -r '.aggregate.summaries["http.response_time"].max' "$REPORT_FILE")
    ERROR_RATE=$(jq -r '.aggregate.rates["http.request_rate"] // 0' "$REPORT_FILE")

    echo "Total Requests: $TOTAL_REQUESTS"
    echo "Success Rate: $SUCCESS_RATE"
    echo "P95 Latency: ${P95_LATENCY}ms"
    echo "P99 Latency: ${P99_LATENCY}ms"
    echo "Max Latency: ${MAX_LATENCY}ms"

    # Check if latency thresholds are met
    if (( $(echo "$P95_LATENCY > 200" | bc -l) )); then
        echo -e "${RED}⚠ WARNING: P95 latency exceeds 200ms threshold${NC}"
    else
        echo -e "${GREEN}✓ P95 latency within target (<200ms)${NC}"
    fi

    if (( $(echo "$P99_LATENCY > 500" | bc -l) )); then
        echo -e "${RED}⚠ WARNING: P99 latency exceeds 500ms threshold${NC}"
    else
        echo -e "${GREEN}✓ P99 latency within target (<500ms)${NC}"
    fi
else
    echo "Install jq to see detailed metrics: apt-get install jq"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Load Test Complete${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "View full report: $HTML_REPORT"
echo "Raw data: $REPORT_FILE"
echo ""

# Optional: Upload report to S3 (if AWS CLI configured)
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    echo -e "${YELLOW}Uploading report to S3...${NC}"
    aws s3 cp "$HTML_REPORT" "s3://$S3_BUCKET/load-tests/report_${TIMESTAMP}.html"
    echo -e "${GREEN}✓ Report uploaded to S3${NC}"
fi

exit 0
