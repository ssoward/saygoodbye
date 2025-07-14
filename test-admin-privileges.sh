#!/bin/bash

# Admin Privilege Verification Test
# Tests that admin users have unlimited access to document validation

echo "🔍 Admin Privilege Test - Say Goodbye POA App"
echo "============================================="

BASE_URL="http://34.235.117.235"

echo "1. Testing admin login..."
ADMIN_LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demopass123"}' \
  "$BASE_URL/api/auth/login")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.token')
if [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Admin login failed"
  exit 1
fi
echo "✅ Admin login successful"

echo "2. Fetching admin user profile..."
ADMIN_PROFILE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/api/auth/me")

echo "3. Checking admin user properties..."

# Extract key fields
ROLE=$(echo "$ADMIN_PROFILE" | jq -r '.role')
TIER=$(echo "$ADMIN_PROFILE" | jq -r '.tier')
VALIDATIONS_PER_MONTH=$(echo "$ADMIN_PROFILE" | jq -r '.tierLimits.validationsPerMonth')
ADMIN_PRIVILEGES=$(echo "$ADMIN_PROFILE" | jq -r '.tierLimits.adminPrivileges')
VALIDATIONS_THIS_MONTH=$(echo "$ADMIN_PROFILE" | jq -r '.validationsThisMonth')

echo "   Role: $ROLE"
echo "   Tier: $TIER"
echo "   Validations per month: $VALIDATIONS_PER_MONTH"
echo "   Admin privileges: $ADMIN_PRIVILEGES"
echo "   Current validations: $VALIDATIONS_THIS_MONTH"

echo "4. Validating admin privileges..."

# Check if user is admin
if [ "$ROLE" = "admin" ]; then
  echo "✅ User has admin role"
else
  echo "❌ User does not have admin role (got: $ROLE)"
fi

# Check if user has unlimited validations
if [ "$VALIDATIONS_PER_MONTH" = "-1" ]; then
  echo "✅ User has unlimited validations (-1)"
else
  echo "❌ User does not have unlimited validations (got: $VALIDATIONS_PER_MONTH)"
fi

# Check if user has admin privileges flag
if [ "$ADMIN_PRIVILEGES" = "true" ]; then
  echo "✅ User has admin privileges flag"
else
  echo "❌ User does not have admin privileges flag (got: $ADMIN_PRIVILEGES)"
fi

# Check if user is enterprise tier
if [ "$TIER" = "enterprise" ]; then
  echo "✅ User has enterprise tier"
else
  echo "❌ User does not have enterprise tier (got: $TIER)"
fi

echo "5. Testing document endpoint access..."
DOCS_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/api/documents")

if echo "$DOCS_RESPONSE" | jq -e '.documents' > /dev/null; then
  echo "✅ Admin can access documents endpoint"
else
  echo "❌ Admin cannot access documents endpoint"
  echo "Response: $DOCS_RESPONSE"
fi

echo ""
echo "============================================="
echo "📊 ADMIN PRIVILEGE TEST SUMMARY"
echo "============================================="

# Count passed tests
TESTS_PASSED=0
TOTAL_TESTS=5

[ "$ROLE" = "admin" ] && ((TESTS_PASSED++))
[ "$VALIDATIONS_PER_MONTH" = "-1" ] && ((TESTS_PASSED++))
[ "$ADMIN_PRIVILEGES" = "true" ] && ((TESTS_PASSED++))
[ "$TIER" = "enterprise" ] && ((TESTS_PASSED++))
[[ "$DOCS_RESPONSE" == *"documents"* ]] && ((TESTS_PASSED++))

echo "Tests Passed: $TESTS_PASSED/$TOTAL_TESTS"

if [ $TESTS_PASSED -eq $TOTAL_TESTS ]; then
  echo "🎉 ALL TESTS PASSED - Admin privileges are working correctly!"
  echo ""
  echo "✅ Admin users should now have:"
  echo "   - Unlimited document validations"
  echo "   - Access to all admin features" 
  echo "   - No monthly validation limits"
  exit 0
else
  echo "❌ SOME TESTS FAILED - Admin privileges may not be working correctly"
  echo ""
  echo "Debug information:"
  echo "Full admin profile:"
  echo "$ADMIN_PROFILE" | jq .
  exit 1
fi
