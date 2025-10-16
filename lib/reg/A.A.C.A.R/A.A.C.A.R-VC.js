// Automatic Account Creation And Registration (A.A.C.A.R)
// Verification Code (VC)
async function generateVerificationCode(email) {
  try {
    // Send requests to both verificationGAS and verificationGAS1 simultaneously
    const [response1, response2] = await Promise.all([
      fetch(verificationGAS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=generate&email=${encodeURIComponent(email)}`,
      }),
      fetch(verificationGAS1, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=generate&email=${encodeURIComponent(email)}`,
      }),
    ]);

    // Check if both responses are OK
    if (!response1.ok) {
      throw new Error(`HTTP error from verificationGAS! Status: ${response1.status}`);
    }
    if (!response2.ok) {
      throw new Error(`HTTP error from verificationGAS1! Status: ${response2.status}`);
    }

    // Parse both responses
    const [result1, result2] = await Promise.all([response1.json(), response2.json()]);

    // Check if both requests were successful
    if (result1.status === 'success' && result2.status === 'success') {
      // Return both hashes
      return {
        success: true,
        message: 'Verification code sent to your email.',
        hashes: {
          verificationGAS: result1.hash,
          verificationGAS1: result2.hash
        }
      };
    } else {
      throw new Error(result1.message || result2.message || 'Failed to generate verification code');
    }
  } catch (error) {
    console.error('Error requesting verification code:', error);
    return { success: false, message: 'Error sending verification code: ' + (error.message || 'Please ensure the server is accessible and try again.') };
  }
}

async function verifyCode(email, code, hashes) {
  try {
    // Send requests to both verificationGAS and verificationGAS1 simultaneously
    const [response1, response2] = await Promise.all([
      fetch(verificationGAS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=verify&email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
      }),
      fetch(verificationGAS1, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=verify&email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
      }),
    ]);

    // Check if responses are OK
    const errors = [];
    if (!response1.ok) {
      errors.push(`HTTP error from verificationGAS! Status: ${response1.status}`);
    }
    if (!response2.ok) {
      errors.push(`HTTP error from verificationGAS1! Status: ${response2.status}`);
    }
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    // Parse both responses
    const [result1, result2] = await Promise.all([response1.json(), response2.json()]);

    // Check verification results
    const verificationResults = {
      verificationGAS: result1.status === 'success',
      verificationGAS1: result2.status === 'success'
    };

    // If either verification succeeds, consider it successful
    if (verificationResults.verificationGAS || verificationResults.verificationGAS1) {
      return {
        success: true,
        message: 'Verification successful!',
        verifiedEndpoints: verificationResults
      };
    } else {
      throw new Error(
        (result1.message || result2.message || 'Failed to verify code')
      );
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    return { success: false, message: 'Error verifying code: ' + (error.message || 'Please try again.') };
  }
}