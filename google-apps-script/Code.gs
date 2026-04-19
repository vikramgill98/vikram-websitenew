const SHEET_ID = "REPLACE_WITH_GOOGLE_SHEET_ID";
const SHEET_NAME = "Leads";
const RECIPIENT_EMAIL = "info@vikramgill.com";

const HEADERS = [
  "Lead ID",
  "Timestamp",
  "Service",
  "Subtype",
  "Details",
  "Timeline",
  "Name",
  "Email",
  "Phone",
  "Call Time Preference",
  "Status",
  "Page Source",
];

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : "list";

  if (action === "list") {
    return jsonResponse_({ ok: true, leads: getLeads_() });
  }

  return jsonResponse_({ ok: false, error: "Unsupported action" });
}

function doPost(e) {
  const payload = e && e.parameter ? e.parameter : {};
  const action = payload.action || "create";

  if (action === "update_status") {
    return jsonResponse_(updateLeadStatus_(payload.leadId, payload.status));
  }

  if (action === "delete") {
    return jsonResponse_(deleteLead_(payload.leadId));
  }

  return jsonResponse_(createLead_(payload));
}

function createLead_(payload) {
  const sheet = getLeadSheet_();
  const timestamp = new Date();
  const leadId = Utilities.getUuid();
  const subtype = payload.detail_one_value || "";
  const details =
    payload.lead_summary ||
    [payload.detail_one_value, payload.detail_two_value, payload.detail_three_value]
      .filter(Boolean)
      .join(" | ");

  const row = [
    leadId,
    timestamp,
    payload.service || "",
    subtype,
    details,
    payload.timeline || "",
    payload.name || "",
    payload.email || "",
    payload.phone || "",
    payload.call_time_preference || "",
    "New",
    payload.page_source || "",
  ];

  sheet.appendRow(row);

  const message = [
    "New lead from VikramGill.ca",
    "",
    `Lead ID: ${leadId}`,
    `Timestamp: ${timestamp}`,
    `Page source: ${payload.page_source || ""}`,
    `Service: ${payload.service || ""}`,
    `Subtype: ${subtype}`,
    `${payload.detail_one_label || "Detail 1"}: ${payload.detail_one_value || ""}`,
    `${payload.detail_two_label || "Detail 2"}: ${payload.detail_two_value || ""}`,
    `${payload.detail_three_label || "Detail 3"}: ${payload.detail_three_value || ""}`,
    `Timeline: ${payload.timeline || ""}`,
    "",
    `Name: ${payload.name || ""}`,
    `Email: ${payload.email || ""}`,
    `Phone: ${payload.phone || ""}`,
    `Best time to call: ${payload.call_time_preference || ""}`,
    "",
    `Summary: ${details}`,
  ].join("\n");

  MailApp.sendEmail({
    to: RECIPIENT_EMAIL,
    subject: `New ${payload.service || "Lead"} from VikramGill.ca`,
    body: message,
  });

  return {
    ok: true,
    lead: {
      leadId: leadId,
      timestamp: timestamp,
      service: payload.service || "",
      subtype: subtype,
      details: details,
      timeline: payload.timeline || "",
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      callTimePreference: payload.call_time_preference || "",
      status: "New",
      pageSource: payload.page_source || "",
    },
  };
}

function updateLeadStatus_(leadId, status) {
  const sheet = getLeadSheet_();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][0]) === String(leadId)) {
      sheet.getRange(i + 1, 11).setValue(status || "New");
      return { ok: true };
    }
  }

  return { ok: false, error: "Lead not found" };
}

function deleteLead_(leadId) {
  const sheet = getLeadSheet_();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][0]) === String(leadId)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }

  return { ok: false, error: "Lead not found" };
}

function getLeads_() {
  const sheet = getLeadSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  return values.slice(1).map((row) => ({
    leadId: row[0],
    timestamp: row[1],
    service: row[2],
    subtype: row[3],
    details: row[4],
    timeline: row[5],
    name: row[6],
    email: row[7],
    phone: row[8],
    callTimePreference: row[9],
    status: row[10] || "New",
    pageSource: row[11] || "",
  }));
}

function getLeadSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];

  if (currentHeaders.join("||") !== HEADERS.join("||")) {
    headerRange.setValues([HEADERS]);
  }

  return sheet;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
