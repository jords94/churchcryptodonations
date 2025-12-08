/**
 * Signup API Test Script
 *
 * Tests the signup API endpoint directly
 * Run with: npx tsx scripts/test-signup-api.ts
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface SignupRequest {
  name: string;
  churchName: string;
  email: string;
  password: string;
}

interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  error?: string;
}

async function testSignup(data: SignupRequest): Promise<void> {
  console.log('🧪 Testing Signup API');
  console.log('=====================');
  console.log('');
  console.log('📋 Test Data:');
  console.log(`  Name: ${data.name}`);
  console.log(`  Church: ${data.churchName}`);
  console.log(`  Email: ${data.email}`);
  console.log('');

  try {
    console.log('📡 Sending POST request to /api/auth/signup...');

    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('');

    const result: SignupResponse = await response.json();

    console.log('📦 Response Body:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (response.ok && result.success) {
      console.log('✅ SIGNUP SUCCESSFUL!');
      console.log('');
      console.log('User Details:');
      console.log(`  ID: ${result.user?.id}`);
      console.log(`  Email: ${result.user?.email}`);
      console.log(`  Email Verified: ${result.user?.emailVerified}`);
      console.log('');
      console.log('📝 Next Steps:');
      console.log('  1. Check database for User, Church, and ChurchUser records');
      console.log('  2. Verify email was sent (if configured)');
      console.log('  3. Test login with these credentials');
      console.log('');
    } else {
      console.log('❌ SIGNUP FAILED');
      console.log('');
      console.log('Error Details:');
      console.log(`  Error: ${result.error}`);
      console.log(`  Message: ${result.message}`);
      console.log('');
    }

    // Test validation
    console.log('🧪 Testing Validation Errors...');
    console.log('================================');
    console.log('');

    // Test missing church name
    console.log('1. Testing missing church name...');
    const validationTest1 = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!',
      }),
    });
    const validationResult1 = await validationTest1.json();
    if (validationResult1.error) {
      console.log(`   ✅ Validation error caught: ${validationResult1.message}`);
    } else {
      console.log('   ⚠️  Should have failed validation');
    }
    console.log('');

    // Test weak password
    console.log('2. Testing weak password...');
    const validationTest2 = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        churchName: 'Test Church',
        email: 'test2@example.com',
        password: 'weak',
      }),
    });
    const validationResult2 = await validationTest2.json();
    if (validationResult2.error) {
      console.log(`   ✅ Validation error caught: ${validationResult2.message}`);
    } else {
      console.log('   ⚠️  Should have failed validation');
    }
    console.log('');

    // Test duplicate email
    console.log('3. Testing duplicate email...');
    const validationTest3 = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), // Same email as original test
    });
    const validationResult3 = await validationTest3.json();
    if (validationResult3.error && validationResult3.message.includes('already')) {
      console.log(`   ✅ Duplicate email caught: ${validationResult3.message}`);
    } else {
      console.log('   ⚠️  Should have failed with duplicate email error');
    }
    console.log('');

    console.log('🎉 Test Suite Complete!');

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Generate unique test data
const timestamp = Date.now();
const testData: SignupRequest = {
  name: 'Test User',
  churchName: `Test Church ${timestamp}`,
  email: `test-${timestamp}@example.com`,
  password: 'TestPassword123!',
};

// Run the test
testSignup(testData);
