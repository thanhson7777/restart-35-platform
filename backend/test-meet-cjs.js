const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-credentials.json'),
  scopes: SCOPES
});

const calendar = google.calendar({ version: 'v3', auth });

async function test() {
  try {
    const startTime = Date.now() + 24 * 60 * 60 * 1000;
    const endTime = startTime + 60 * 60 * 1000;
    
    const event = {
      summary: 'Test Phỏng vấn',
      description: 'Test Description',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh'
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'Asia/Ho_Chi_Minh'
      },
      conferenceData: {
        createRequest: {
          requestId: `interview-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    console.log("Creating event...");
    const res = await calendar.events.insert({
      calendarId: 'thanhson11052003@gmail.com',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });
    
    console.log("Result:", res.data.hangoutLink);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
