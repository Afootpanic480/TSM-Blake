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
    
    return { 
      success: true, 
      message: 'Successfully registered.',
      data: result
    };
    
  } catch (error) {
    console.error('Error in submitRegistration:', error);
    return { 
      success: false, 
      message: 'Error during registration: ' + (error.message || 'Unknown error occurred')
    };
  }
}