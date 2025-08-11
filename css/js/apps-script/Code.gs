function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById('YOUR_SHEET_ID'); // Replace with your sheet ID
    var sheet = ss.getSheets()[0]; // first sheet

    var data = JSON.parse(e.postData.contents);
    var rfid = String(data.rfid || '').trim();
    if (!rfid) {
      return ContentService.createTextOutput('Missing RFID').setMimeType(ContentService.MimeType.TEXT);
    }

    var now = new Date();
    var timeNow = Utilities.formatDate(now, "Asia/Manila", "HH:mm:ss");
    var dateNow = Utilities.formatDate(now, "Asia/Manila", "MM/dd/yyyy");

    // Get all data in Column A (RFID)
    var lastRow = sheet.getLastRow();
    var rfidValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // skip header

    var foundRow = -1;
    for (var i = 0; i < rfidValues.length; i++) {
      if (String(rfidValues[i][0]) === rfid) {
        foundRow = i + 2; // +2 to account for header
        break;
      }
    }

    if (foundRow === -1) {
      return ContentService.createTextOutput('RFID not found in records').setMimeType(ContentService.MimeType.TEXT);
    }

    // Columns: H = Time In (8), I = Time Out (9), J = Status (10)
    var timeIn = sheet.getRange(foundRow, 8).getValue();
    var timeOut = sheet.getRange(foundRow, 9).getValue();

    var status = '';
    if (!timeIn) {
      sheet.getRange(foundRow, 8).setValue(timeNow); // Time In
      status = 'ON DUTY';
    } else if (!timeOut) {
      sheet.getRange(foundRow, 9).setValue(timeNow); // Time Out
      status = 'OFF DUTY';
    } else {
      // Already logged in and out today
      return ContentService.createTextOutput('Already completed shift').setMimeType(ContentService.MimeType.TEXT);
    }

    sheet.getRange(foundRow, 10).setValue(status); // Status column

    // Return full name + action
    var rank = sheet.getRange(foundRow, 2).getValue();
    var lastName = sheet.getRange(foundRow, 3).getValue();
    var firstName = sheet.getRange(foundRow, 4).getValue();
    var middleName = sheet.getRange(foundRow, 5).getValue();
    var suffix = sheet.getRange(foundRow, 6).getValue();

    var fullName = rank + ' ' + firstName + ' ' + middleName + ' ' + lastName + ' ' + suffix;
    return ContentService.createTextOutput(fullName + ' → ' + status + ' at ' + timeNow)
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
