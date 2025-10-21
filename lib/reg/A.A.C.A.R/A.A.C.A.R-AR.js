let registrationData = {
  username: '',
  email: '',
  password: '',
};

// Function to store registration data temporarily
function storeRegistrationData(username, email, password) {
  console.log('Storing registration data in global object:', { 
    username: username, 
    email: email, 
    passwordLength: password ? password.length : 0 
  });
  registrationData.username = username;
  registrationData.email = email;
  registrationData.password = password;
}

// Function to send registration data to Google Apps Script for storage in Google Sheet
async function waitForFirebaseServices(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.firebaseServices?.auth) {
      return window.firebaseServices;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

async function provisionFirebaseRegistrationProfile() {
  const services = await waitForFirebaseServices();
  if (!services?.auth) {
    return { success: false, message: 'Firebase services not available' };
  }

  const username = registrationData.username?.trim();
  const password = registrationData.password;
  const regEmail = registrationData.email?.trim();

  if (!username || !password) {
    return { success: false, message: 'Missing username or password for Firebase provisioning' };
  }

  const authEmail = username.includes('@') ? username : `${username}@schoolmessenger.app`;
  let firebaseUid = null;
  let firebaseResult = await services.auth.signUp(authEmail, password, {
    username,
    displayName: username,
    regemail: regEmail || '',
    isPlaceholder: false,
    accountSource: 'registration'
  });

  if (!firebaseResult.success && firebaseResult.message && firebaseResult.message.toLowerCase().includes('already')) {
    const existingUsers = await services.auth.searchUsers(username);
    const existing = existingUsers.find(user => user.username === username);
    if (existing) {
      firebaseUid = existing.uid;
    }
  } else if (firebaseResult.success && firebaseResult.user?.uid) {
    firebaseUid = firebaseResult.user.uid;
  }

  if (!firebaseUid) {
    return { success: false, message: firebaseResult.message || 'Unable to provision Firebase user' };
  }

  await services.auth.updateUserProfile(firebaseUid, {
    username,
    displayName: username,
    regemail: regEmail || '',
    email: regEmail || authEmail,
    isPlaceholder: false,
    lastLogin: Date.now(),
    lastUpdated: Date.now()
  });

  try {
    await services.auth.signOut();
  } catch (error) {
    console.warn('Firebase sign out after registration failed:', error);
  }

  return { success: true, uid: firebaseUid };
}

async function submitRegistration() {
  try {
    console.log('submitRegistration called with registrationData:', {
      username: registrationData.username,
      email: registrationData.email,
      hasPassword: !!registrationData.password,
      passwordType: typeof registrationData.password
    });
    
    const { username, email, password } = registrationData;
    
    if (!username || !email || !password) {
      const errorMsg = 'Registration data is incomplete. Missing fields: ' + 
                     JSON.stringify({
                       hasUsername: !!username,
                       hasEmail: !!email,
                       hasPassword: !!password
                     });
      console.error(errorMsg);
      return { success: false, message: errorMsg };
    }

    // Use password as-is, let GAS handle any necessary encoding
    const passwordToSend = String(password);

    // Prepare the request body
    const requestBody = new URLSearchParams({
      username: String(username),
      email: String(email),
      password: passwordToSend
    });

    console.log('Sending registration request with:', {
      username: username,
      email: email,
      passwordLength: passwordToSend.length
    });

    const response = await fetch(registrationGAS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server responded with error:', response.status, errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.text();
    console.log('Registration response:', result);
    
    if (result.toLowerCase().includes('error')) {
      throw new Error(result);
    }

    const firebaseProvision = await provisionFirebaseRegistrationProfile();
    if (!firebaseProvision.success) {
      console.warn('Firebase provisioning issue:', firebaseProvision.message);
    }
    
    return { 
      success: true, 
      message: 'Successfully registered.',
      data: result,
      firebaseProvision
    };
    
  } catch (error) {
    console.error('Error in submitRegistration:', error);
    return { 
      success: false, 
      message: 'Error during registration: ' + (error.message || 'Unknown error occurred')
    };
  }
}