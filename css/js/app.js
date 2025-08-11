/* js/app.js
   Replace WEB_APP_URL below with your Google Apps Script Web App URL
*/
const WEB_APP_URL = 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL'; // <-- REPLACE

const rfidInput = document.getElementById('rfidInput');
const statusEl = document.getElementById('status');
const clockEl = document.getElementById('clock');
const logsTbody = document.querySelector('#logsTable tbody');

// keep focus on input so scanner keystrokes go there
function ensureFocus(){
  if (document.activeElement !== rfidInput) rfidInput.focus();
}
setInterval(ensureFocus, 800);
ensureFocus();

// real-time clock
function updateClock(){
  const now = new Date();
  // show absolute date & time (browser locale)
  clockEl.textContent = now.toLocaleString();
}
setInterval(updateClock, 1000);
updateClock();

// handle input — many scanners send a trailing Enter which triggers 'change' or 'keydown'.
// using 'keydown' to detect Enter lets us support faster scans.
let buffer = '';
rfidInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const rfid = rfidInput.value.trim() || buffer.trim();
    buffer = '';
    rfidInput.value = '';
    if (rfid) sendLog(rfid);
    e.preventDefault();
    return;
  }
  // Some scanners simply type digits; build buffer
  if (e.key.length === 1) {
    buffer += e.key;
  }
  // Allow backspace to edit buffer
  if (e.key === 'Backspace') buffer = buffer.slice(0, -1);
});

// fallback: also support change event
rfidInput.addEventListener('change', () => {
  const rfid = rfidInput.value.trim();
  rfidInput.value = '';
  buffer = '';
  if (rfid) sendLog(rfid);
});

async function sendLog(rfid) {
  const now = new Date();
  const payload = {
    rfid,
    isoDate: now.toISOString(),
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString()
  };

  statusEl.textContent = 'Sending…';
  try {
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    statusEl.textContent = text || 'Logged';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error: could not send — check network or Web App URL';
  }

  // after logging, fetch recent entries for today (optional)
  fetchRecentLogs();
}

// simple function to fetch last 10 logs from your spreadsheet web app (OPTIONAL)
// Note: for this to work you must implement a GET handler in Apps Script that returns JSON.
// If you don't want that, you can remove this and the UI table will just remain static.
async function fetchRecentLogs(){
  try {
    const res = await fetch(WEB_APP_URL + '?action=recent'); // Apps Script should support this
    if (!res.ok) return;
    const json = await res.json();
    // json expected as array of rows: [{rfid,date,time,status}, ...]
    logsTbody.innerHTML = '';
    json.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.rfid}</td><td>${row.date}</td><td>${row.time}</td><td>${row.status}</td>`;
      logsTbody.appendChild(tr);
    });
  } catch (e) {
    // silently ignore; table is optional
  }
}

// try initial fetch
fetchRecentLogs();
