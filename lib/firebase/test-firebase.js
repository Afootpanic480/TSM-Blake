// Firebase Test Script
// Add this to your page temporarily to test Firebase connection

(function() {
  console.log('🧪 Firebase Test: Starting tests...');

  // Wait for everything to load
  setTimeout(runTests, 2000);

  function runTests() {
    const tests = [];

    // Test 1: Firebase SDK loaded
    tests.push({
      name: 'Firebase SDK Loaded',
      test: () => typeof firebase !== 'undefined',
      pass: '✅ Firebase SDK is loaded',
      fail: '❌ Firebase SDK not found - check script tags in index.html'
    });

    // Test 2: Firebase initialized
    tests.push({
      name: 'Firebase Initialized',
      test: () => window.firebaseApp && window.firebaseAuth && window.firebaseDatabase,
      pass: '✅ Firebase initialized successfully',
      fail: '❌ Firebase not initialized - check firebase-config.js'
    });

    // Test 3: Services created
    tests.push({
      name: 'Firebase Services',
      test: () => window.FirebaseAuthService && window.FirebaseMessageService && window.FirebaseUserService,
      pass: '✅ All Firebase services loaded',
      fail: '❌ Services not loaded - check service files'
    });

    // Test 4: Bridge loaded
    tests.push({
      name: 'Firebase Bridge',
      test: () => window.firebaseBridge && window.firebaseBridge.isReady,
      pass: '✅ Firebase Bridge loaded',
      fail: '❌ Bridge not loaded - check firebase-bridge.js'
    });

    // Test 5: Bridge ready
    tests.push({
      name: 'Bridge Ready',
      test: () => window.firebaseBridge && window.firebaseBridge.isReady(),
      pass: '✅ Firebase Bridge is ready',
      fail: '⚠️ Bridge loaded but not ready yet (may need more time)'
    });

    // Test 6: Config valid
    tests.push({
      name: 'Firebase Config',
      test: () => {
        const config = window.firebaseApp?.options;
        return config && config.apiKey && !config.apiKey.includes('YOUR_');
      },
      pass: '✅ Firebase config looks valid',
      fail: '❌ Firebase config not updated - update firebase-config.js with your credentials'
    });

    // Run all tests
    console.log('\n📋 Firebase Test Results:\n');
    let passCount = 0;
    let failCount = 0;

    tests.forEach(test => {
      try {
        const result = test.test();
        if (result) {
          console.log(test.pass);
          passCount++;
        } else {
          console.warn(test.fail);
          failCount++;
        }
      } catch (error) {
        console.error(`❌ ${test.name}: Error -`, error.message);
        failCount++;
      }
    });

    console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

    if (failCount === 0) {
      console.log('🎉 All tests passed! Firebase is ready to use!');
      console.log('\n💡 Try logging in to test the authentication sync');
    } else {
      console.log('⚠️ Some tests failed. Check the errors above.');
    }

    // Additional info
    console.log('\n📚 Available Functions:');
    console.log('- window.firebaseBridge.initializeChat(username)');
    console.log('- window.firebaseBridge.sendMessage(text, username)');
    console.log('- window.firebaseServices.auth');
    console.log('- window.firebaseServices.message');
    console.log('- window.firebaseServices.user');
    
    // Test manual login
    console.log('\n🧪 Test Manual Firebase Login:');
    console.log('window.testFirebaseLogin("username", "password")');
  }

  // Manual test function
  window.testFirebaseLogin = async function(username, password) {
    console.log('\n🧪 Testing Firebase login manually...');
    
    if (!window.firebaseServices || !window.firebaseServices.auth) {
      console.error('❌ Firebase services not available');
      return;
    }
    
    const email = username.includes('@') ? username : `${username}@schoolmessenger.app`;
    console.log('📧 Using email:', email);
    
    try {
      // Try to sign up
      console.log('📝 Attempting to create account...');
      const result = await window.firebaseServices.auth.signUp(email, password, {
        username: username,
        displayName: username
      });
      
      console.log('✅ Result:', result);
      
      if (result.success) {
        console.log('🎉 Account created! Check Firebase Console → Realtime Database');
        console.log('👤 User ID:', result.user.uid);
      } else {
        console.log('⚠️ Failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  // Expose test function globally
  window.testFirebase = runTests;
  console.log('💡 Run window.testFirebase() anytime to re-run tests');

})();
