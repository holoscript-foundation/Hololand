#!/bin/sh
# Health check script for SNN Perception Demo container

set -e

# Check if nginx is running
if ! pgrep -x nginx > /dev/null; then
    echo "ERROR: nginx process not found"
    exit 1
fi

# Check HTTP endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "ERROR: HTTP health check failed with code $HTTP_CODE"
    exit 1
fi

# Check if SNN model files are accessible
if [ ! -f /usr/share/nginx/html/models/warehouse-snn-v1.json ]; then
    echo "ERROR: SNN model file not found"
    exit 1
fi

# Check nginx access logs for errors (last 10 lines)
ERROR_COUNT=$(tail -n 10 /var/log/nginx/error.log 2>/dev/null | grep -c "error" || echo "0")
if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "WARNING: High error count in nginx logs: $ERROR_COUNT"
    # Don't fail health check, just warn
fi

echo "Health check passed"
exit 0
