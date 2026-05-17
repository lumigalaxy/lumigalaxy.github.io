#!/bin/bash
# Test OpenCode event mapping
# This script simulates OpenCode events to test the integration

echo "=========================================="
echo "Clawd OpenCode Integration Test"
echo "=========================================="
echo ""
echo "Make sure Clawd is running before executing this test."
echo ""

CLAWD_URL="http://127.0.0.1:23333/state"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_event() {
  local event_name=$1
  local state=$2
  local session_id=${3:-"test-opencode"}
  
  echo -n "Testing $event_name -> $state: "
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$CLAWD_URL" \
    -H "Content-Type: application/json" \
    -d "{\"state\":\"$state\",\"session_id\":\"$session_id\",\"event\":\"$event_name\"}" \
    --max-time 2)
  
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
    return 0
  else
    echo -e "${RED}FAILED (HTTP $http_code)${NC}"
    return 1
  fi
}

# Check if Clawd is running
echo -n "Checking Clawd server... "
if ! curl -s "$CLAWD_URL" --max-time 1 > /dev/null 2>&1; then
  echo -e "${RED}NOT RUNNING${NC}"
  echo ""
  echo "Please start Clawd first:"
  echo "  npm start"
  exit 1
fi
echo -e "${GREEN}RUNNING${NC}"
echo ""

echo "Testing OpenCode events:"
echo "----------------------------------------------"

# Test all OpenCode event mappings
test_event "session.created" "idle"
test_event "tui.prompt.append" "thinking"
test_event "tool.execute.before" "working"
test_event "tool.execute.after" "working"
test_event "session.idle" "attention"
test_event "tui.toast.show" "notification"
test_event "permission.asked" "notification"
test_event "message.part.updated" "notification"
test_event "file.watcher.updated" "carrying"
test_event "experimental.session.compacting" "sweeping"
test_event "session.compacted" "attention"
test_event "subagent.start" "juggling"
test_event "subagent.stop" "working"
test_event "session.deleted" "sleeping"

echo ""
echo "Testing error state:"
echo "----------------------------------------------"
test_event "tool.execute.failure" "error"

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "If you see all tests passing, the OpenCode"
echo "plugin integration is working correctly!"
echo ""
echo "Next steps:"
echo "  1. Install the plugin: node hooks/install-opencode.js"
echo "  2. Restart OpenCode"
echo "  3. Start using OpenCode and watch Clawd react!"
