const MAX_DAILY_REPORTS = 10;

// Note: Apps Script ContentService does not support arbitrary response headers.
// For browser fetch, prefer mode: 'no-cors' or serve through a proxy with CORS.

function doGet(e) {
  try {
    const username = (e && e.parameter && (e.parameter.username || e.parameter.user || e.parameter.createdBy)) || 'Unknown User';

    if (e.parameter && e.parameter.checkLimit) {
      const canSubmit = checkDailyLimit(username);
      const remaining = getRemainingReports(username);
      return json({ canSubmit, remaining });
    }

    if (e.parameter && e.parameter.checkRemaining) {
      const remaining = getRemainingReports(username);
      const resetNotification = scriptProperties.getProperty(`resetNotification_${username}`) === 'true';
      if (resetNotification) {
        scriptProperties.deleteProperty(`resetNotification_${username}`); // Clear after notifying
      }
      return json({ remaining, resetNotification });
    }

    if (e.parameter && e.parameter.resetReports) {
      resetUserReports(username);
      scriptProperties.setProperty(`resetNotification_${username}`, 'true');
      return json({ success: true, message: 'Reports reset and user notified.' });
    }

    return json({ success: false, message: 'Invalid GET request' }, 400);
  } catch (err) {
    Logger.log('doGet error: ' + err);
    return json({ success: false, message: String(err) }, 500);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ success: false, message: 'No data received' }, 400);
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return json({ success: false, message: 'Invalid JSON format' }, 400);
    }

    const username = (data.createdBy || data.username || 'Unknown User');
    const title = (data.title || '').toString().trim();
    const type = (data.type || 'other').toString();
    const details = (data.details || '').toString().trim();
    const url = (data.url || 'Unknown URL').toString();
    const userAgent = (data.userAgent || 'Unknown').toString();
    const timestamp = new Date().toLocaleString();

    // Basic validation
    if (!checkDailyLimit(username)) {
      return json({ success: false, message: `Maximum ${MAX_DAILY_REPORTS} reports per day reached.` }, 429);
    }
    if (isTemplate(details)) {
      return json({ success: false, message: 'Please replace the template with real details before submitting.' }, 422);
    }
    if (title.length < 5 || details.length < 10) {
      return json({ success: false, message: 'Please provide a descriptive title and detailed description.' }, 422);
    }

    // Logging
    Logger.log('[BugReport] From: %s', username);
    Logger.log('[BugReport] Title: %s', title);
    Logger.log('[BugReport] Type: %s', type);
    Logger.log('[BugReport] URL: %s', url);
    Logger.log('[BugReport] UA: %s', userAgent);

    notifyBugReport(username, timestamp, title, type, details, url, userAgent);
    incrementDailyCount(username);

    return json({ success: true, message: 'Bug report received successfully' });
  } catch (error) {
    Logger.log('doPost error: ' + error);
    return json({ success: false, message: String(error) }, 500);
  }
}

let scriptProperties = PropertiesService.getScriptProperties();

function checkDailyLimit(username) {
  const today = new Date().toDateString();
  const key = `reports_${username}_${today}`;

  let count = parseInt(scriptProperties.getProperty(key) || '0', 10);

  return count < MAX_DAILY_REPORTS;
}

function getRemainingReports(username) {
  const today = new Date().toDateString();
  const key = `reports_${username}_${today}`;

  let count = parseInt(scriptProperties.getProperty(key) || '0', 10);
  return Math.max(0, MAX_DAILY_REPORTS - count);
}

function incrementDailyCount(username) {
  const today = new Date().toDateString();
  const key = `reports_${username}_${today}`;

  let count = parseInt(scriptProperties.getProperty(key) || '0', 10);
  scriptProperties.setProperty(key, (count + 1).toString());
}

function resetUserReports(username) {
  const today = new Date().toDateString();
  const key = `reports_${username}_${today}`;

  scriptProperties.deleteProperty(key); // Reset to 0
  return `Daily report count for ${username} has been reset.`;
}

function notifyBugReport(username, timestamp, title, type, details, url, userAgent) {
  const recipient = 'mcgahaj2@students.hcboe.net';
  const resetUrl = `https://script.google.com/macros/s/AKfycbxvK507OPwpEStBirusVQWhsshM1urfDheys1QvvrG_cs4ufpqLnSGo2W2ewt8Lyp1m/exec?resetReports=true&username=${encodeURIComponent(username)}`;
  const subject = `Bug Report from ${username}`;
  
  const body = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #d9534f; text-align: center;">New Bug Report</h2>
          
          <!-- Report Info Section -->
          <div style="border-bottom: 2px solid #d9534f; padding-bottom: 20px; margin-bottom: 20px;">
            <p style="font-size: 18px; color: #333;"><strong style="color: #333;">Submitted by:</strong> ${username}</p>
            <p style="font-size: 16px; color: #555;"><strong style="color: #555;">Timestamp:</strong> ${timestamp}</p>
            <p style="font-size: 16px; color: #555;"><strong style="color: #555;">Issue Type:</strong> ${type}</p>
            <p style="font-size: 16px; color: #555;"><strong style="color: #555;">Issue Title:</strong> ${title}</p>
          </div>

          <!-- Issue Details Section -->
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #d9534f;">Issue Details:</h3>
            <p style="font-size: 16px; color: #333; line-height: 1.5;">${details}</p>
          </div>

          <!-- Page URL Section -->
          <div style="margin-bottom: 20px;">
            <p style="font-size: 16px; color: #333;"><strong style="color: #333;">Page URL:</strong> <a href="${url}" style="color: #337ab7; text-decoration: none;">${url}</a></p>
          </div>

          <!-- Device Info Section -->
          <div style="margin-bottom: 20px;">
            <p style="font-size: 16px; color: #333;"><strong style="color: #333;">Device Info:</strong> ${userAgent}</p>
          </div>

          <!-- Reset Button Section -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset User's Daily Reports</a>
          </div>

          <!-- Footer Section -->
          <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            This is an automated bug report notification. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: body
  });
}

function json(obj, status) {
  // status is ignored by ContentService; this is for consistent structure
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isTemplate(text) {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  // Heuristic: looks like untouched template with ellipses and section headers
  const hasSections = t.includes('steps to reproduce:') && t.includes('expected result:') && t.includes('actual result:');
  const manyEllipses = (t.match(/\.\.\./g) || []).length >= 3;
  return hasSections && manyEllipses;
}