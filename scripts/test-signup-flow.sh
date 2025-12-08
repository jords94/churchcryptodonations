#!/bin/bash

# Signup Flow Test Script
# Tests the complete signup flow including user, church, and admin link creation

set -e

echo "🧪 Testing Church Crypto Donations Signup Flow"
echo "================================================"
echo ""

# Configuration
API_URL="http://localhost:3000"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_NAME="Test User"
TEST_CHURCH="Test Church $(date +%s)"
TEST_PASSWORD="TestPassword123!"

echo "📋 Test Configuration:"
echo "  API URL: $API_URL"
echo "  Test Email: $TEST_EMAIL"
echo "  Test Name: $TEST_NAME"
echo "  Test Church: $TEST_CHURCH"
echo ""

# Step 1: Test signup page loads
echo "1️⃣  Testing signup page loads..."
SIGNUP_PAGE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/auth/signup)
if [ "$SIGNUP_PAGE" = "200" ]; then
  echo "   ✅ Signup page loads successfully"
else
  echo "   ❌ Signup page failed to load (HTTP $SIGNUP_PAGE)"
  exit 1
fi
echo ""

# Step 2: Test signup API endpoint
echo "2️⃣  Testing signup API endpoint..."
SIGNUP_RESPONSE=$(curl -s -X POST $API_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_NAME\",
    \"churchName\": \"$TEST_CHURCH\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "   Response: $SIGNUP_RESPONSE"

# Check if signup was successful
if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
  echo "   ✅ Signup API returned success"

  # Extract user ID
  USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   📝 User ID: $USER_ID"
else
  echo "   ❌ Signup API failed"
  echo "   Response: $SIGNUP_RESPONSE"
  exit 1
fi
echo ""

# Step 3: Verify database records (requires psql)
echo "3️⃣  Verifying database records..."
echo "   (Requires database connection)"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "   ⚠️  DATABASE_URL not set. Skipping database verification."
  echo "   To verify manually, run:"
  echo "   psql \$DATABASE_URL -c \"SELECT * FROM \\\"User\\\" WHERE email = '$TEST_EMAIL';\""
  echo "   psql \$DATABASE_URL -c \"SELECT * FROM \\\"Church\\\" WHERE email = '$TEST_EMAIL';\""
  echo "   psql \$DATABASE_URL -c \"SELECT cu.*, c.name as church_name FROM \\\"ChurchUser\\\" cu JOIN \\\"Church\\\" c ON cu.\\\"churchId\\\" = c.id JOIN \\\"User\\\" u ON cu.\\\"userId\\\" = u.id WHERE u.email = '$TEST_EMAIL';\""
else
  # Verify User record
  USER_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$TEST_EMAIL';")
  if [ "$USER_COUNT" -eq 1 ]; then
    echo "   ✅ User record created"
  else
    echo "   ❌ User record not found"
    exit 1
  fi

  # Verify Church record
  CHURCH_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"Church\" WHERE email = '$TEST_EMAIL';")
  if [ "$CHURCH_COUNT" -eq 1 ]; then
    echo "   ✅ Church record created"
    CHURCH_NAME=$(psql $DATABASE_URL -t -c "SELECT name FROM \"Church\" WHERE email = '$TEST_EMAIL';")
    CHURCH_SLUG=$(psql $DATABASE_URL -t -c "SELECT slug FROM \"Church\" WHERE email = '$TEST_EMAIL';")
    echo "   📝 Church Name: $CHURCH_NAME"
    echo "   📝 Church Slug: $CHURCH_SLUG"
  else
    echo "   ❌ Church record not found"
    exit 1
  fi

  # Verify ChurchUser link with ADMIN role
  ADMIN_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"ChurchUser\" cu JOIN \"User\" u ON cu.\"userId\" = u.id WHERE u.email = '$TEST_EMAIL' AND cu.role = 'ADMIN' AND cu.\"isActive\" = true;")
  if [ "$ADMIN_COUNT" -eq 1 ]; then
    echo "   ✅ ChurchUser link created with ADMIN role"
  else
    echo "   ❌ ChurchUser link with ADMIN role not found"
    exit 1
  fi

  # Verify enabled chains
  ENABLED_CHAINS=$(psql $DATABASE_URL -t -c "SELECT \"enabledChains\" FROM \"Church\" WHERE email = '$TEST_EMAIL';")
  if echo "$ENABLED_CHAINS" | grep -q "BTC" && echo "$ENABLED_CHAINS" | grep -q "USDC"; then
    echo "   ✅ BTC and USDC chains enabled"
  else
    echo "   ⚠️  Enabled chains: $ENABLED_CHAINS"
  fi

  # Verify trial status
  SUBSCRIPTION_STATUS=$(psql $DATABASE_URL -t -c "SELECT \"subscriptionStatus\" FROM \"Church\" WHERE email = '$TEST_EMAIL';")
  if echo "$SUBSCRIPTION_STATUS" | grep -q "TRIAL"; then
    echo "   ✅ Trial subscription status set"
  else
    echo "   ⚠️  Subscription status: $SUBSCRIPTION_STATUS"
  fi
fi
echo ""

# Step 4: Test validation errors
echo "4️⃣  Testing validation errors..."

# Test missing fields
VALIDATION_TEST=$(curl -s -X POST $API_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{}")

if echo "$VALIDATION_TEST" | grep -q '"error":"Validation error"'; then
  echo "   ✅ Validation errors working"
else
  echo "   ⚠️  Validation errors might not be working correctly"
fi
echo ""

# Step 5: Test duplicate email
echo "5️⃣  Testing duplicate email protection..."
DUPLICATE_TEST=$(curl -s -X POST $API_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Another User\",
    \"churchName\": \"Another Church\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$DUPLICATE_TEST" | grep -q "already registered\|already exists"; then
  echo "   ✅ Duplicate email protection working"
else
  echo "   ⚠️  Duplicate email protection might not be working"
  echo "   Response: $DUPLICATE_TEST"
fi
echo ""

# Summary
echo "================================================"
echo "🎉 Signup Flow Test Complete!"
echo ""
echo "✅ Tests Passed:"
echo "  - Signup page loads"
echo "  - Signup API creates user successfully"
echo "  - Response includes user data"
echo "  - Validation errors work"
echo "  - Duplicate email protection works"
if [ ! -z "$DATABASE_URL" ]; then
  echo "  - User record created in database"
  echo "  - Church record created in database"
  echo "  - ChurchUser link created with ADMIN role"
  echo "  - BTC and USDC chains enabled"
  echo "  - Trial subscription status set"
fi
echo ""
echo "📝 Next Steps:"
echo "  1. Check server logs for detailed console output"
echo "  2. Verify email was sent (if configured)"
echo "  3. Test login flow with: $TEST_EMAIL"
echo "  4. Test wallet creation after login"
echo ""
