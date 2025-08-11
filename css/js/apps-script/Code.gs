// Code.gs
// This script expects POST requests with JSON body:
// { rfid: "...", isoDate: "...", date: "...", time: "..." }
// It appends rows to a sheet and toggles between Log In / Log Out for the same RFID on the same date.
// Optionally, a GET request with ?action=recent returns recent rows as JSON.

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById('YOUR_SHEET_ID'); // optional: use openById for clarity
    var sheet = ss.getSheetByName('Logs') || ss.getSheets()[0];

    var data = JSON.parse(e.postData.contents);
    var rfid = String(data.rfid || '').trim();
    var date = data.date || Utilities.formatDate(new Date(data.isoDate || new Date()), Session.getScriptTimeZone(), "MM/dd/yyyy");
    var time = data.time || Utilities.formatDate(new Date(data.isoDate || new Date()), Session.getScriptTimeZone(), "HH:mm:ss");

    if (!rfid) {
      return ContentService.createTextOutput('Missing RFID').setMimeType(ContentService.MimeType.TEXT);
    }

    // Ensure header exists
    var header = ['RFID','Date','Time','Status'];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(header);
    } else {
      var firstRow = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
      if (firstRow.join() !== header.join()) {
        sheet.insertRowBefore(1);
        sheet.getRange(1,1,1,header.length).setValues([header]);
      }
    }

    // Read rows for today (read last 500 rows to keep it efficient)
    var lastRow = sheet.getLastRow();
    var startRow = Math.max(2, lastRow - 499);
    var rows = sheet.getRange(startRow,1,lastRow-startRow+1,4).getValues();

    // determine if last action for this RFID today was a Log In
    var status = "Log In";
    for (var i = rows.length - 1; i >= 0; i--) {
      var row = rows[i];
      var rfidCell = String(row[0]);
      var dateCell = String(row[1]);
      var statusCell = String(row[3]);
      if (rfidCell === rfid && dateCell === date && statusCell === "Log In") {
        status = "Log Out";
        break;
      }
    }

    sheet.appendRow([rfid, date, time, status]);

    return ContentService.createTextOutput(status + " successful").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  // Optional: support ?action=recent to return recent logs as JSON for the UI table.
  if (e && e.parameter && e.parameter.action === 'recent') {
    var ss = SpreadsheetApp.openById('YOUR_SHEET_ID');
    var sheet = ss.getSheetByName('Logs') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var out = [];
    // skip header
    for (var i = Math.max(1, data.length - 30); i < data.length; i++) {
      var r = data[i];
      out.push({ rfid: r[0], date: r[1], time: r[2], status: r[3] });
    }
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput('RFID Web App').setMimeType(ContentService.MimeType.TEXT);
}
