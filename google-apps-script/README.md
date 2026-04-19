1. Create a Google Sheet for leads.
2. Open `Extensions -> Apps Script`.
3. Paste in the contents of `Code.gs`.
4. Replace `REPLACE_WITH_GOOGLE_SHEET_ID` with your Sheet ID.
5. Deploy the script as a web app with access set to `Anyone`.
6. Copy the deployed web app URL.
7. Replace `REPLACE_WITH_DEPLOYED_WEB_APP_ID` in:
   - `/Users/vikramjeetsingh/Documents/vikramBetterversion/index.html`
   - `/Users/vikramjeetsingh/Documents/vikramBetterversion/contact/index.html`
   - `/Users/vikramjeetsingh/Documents/vikramBetterversion/admin/admin.js`

The sheet will store:
`Lead ID | Timestamp | Service | Subtype | Details | Timeline | Name | Email | Phone | Call Time Preference | Status | Page Source`

Each submission also sends an email notification to `info@vikramgill.com`.
The admin dashboard can also:
- load all leads
- update lead status
- delete leads
- export leads to CSV
