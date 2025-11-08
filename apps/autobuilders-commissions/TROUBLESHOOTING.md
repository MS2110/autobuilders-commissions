# Troubleshooting: Commission Panel Not Loading

## Issues Fixed

### 1. JavaScript Formatting Issue

The commission-panel.hbs had all JavaScript code minified on single lines, which was causing parsing errors. This has been reformatted with proper line breaks.

### 2. CORS and Iframe Headers

Added proper headers to allow the app to be embedded in Pipedrive iframes:

- `X-Frame-Options: ALLOWALL`
- `Content-Security-Policy: frame-ancestors *`
- CORS headers for Pipedrive domains

### 3. SDK Loading

Improved SDK loading with timeout and proper error handling.

## Testing Steps

1. **Restart your server**:

   ```bash
   npm start
   ```

2. **Verify the extension URL**:

   - The panel should be accessible at: `https://autobuilders-commissions.onrender.com/extension/deal`
   - Test it directly in a browser first

3. **Check Pipedrive App Configuration**:

   - Go to Pipedrive Developer Hub
   - Navigate to your app's Extensions section
   - Make sure the Deal Panel extension is configured with:
     - **Type**: Deal Panel
     - **URL**: `https://autobuilders-commissions.onrender.com/extension/deal`
     - **Size**: Medium or Large (recommended)

4. **Create Required Custom Fields** (if not already done):
   In Pipedrive, create these custom fields for Deals:

   - `commission_config_json` (Type: Text - Long)
   - `deposit_percent` (Type: Numeric)

5. **Test in Pipedrive**:
   - Open a deal in Pipedrive
   - Look for your extension panel
   - Check browser console for errors (F12)

## Common Errors and Solutions

### Error: "ReferenceError: Can't find variable: exports"

**Solution**: This error should now be fixed. It was caused by minified JavaScript. Make sure to redeploy after the changes.

### Error: "Blocked a frame with origin..."

**Solution**: Headers have been added to allow iframe embedding. Ensure your Render deployment has restarted with the new code.

### Error: "Timeout waiting for Pipedrive SDK to load"

**Possible causes**:

- Network issues preventing CDN access
- The page is not being loaded in a Pipedrive iframe
- Check if the SDK URL is accessible: https://cdn.jsdelivr.net/npm/@pipedrive/app-extensions-sdk@0.4.0/dist/index.js

### Panel shows "No deal ID found in context"

**Possible causes**:

- The panel is not being loaded within a Pipedrive deal view
- The extension configuration in Pipedrive is incorrect
- Test by opening a deal in Pipedrive, not by accessing the URL directly

## Debug Mode

The panel now includes a debug section. If you see issues:

1. Enable debug view (already visible when layout: false)
2. Check the messages in the debug section
3. Compare with browser console logs

## Next Steps if Still Not Working

1. **Check Render Logs**:

   - Go to your Render dashboard
   - Check the deployment logs for any errors

2. **Verify Environment Variables**:

   ```
   CLIENT_ID=<your-pipedrive-app-client-id>
   CLIENT_SECRET=<your-pipedrive-app-client-secret>
   CALLBACK_URL=https://autobuilders-commissions.onrender.com/auth/pipedrive/callback
   ```

3. **Test the API Endpoint**:
   The panel calls `/api/calculate-commission` - you can test this with curl:

   ```bash
   curl -X POST https://autobuilders-commissions.onrender.com/api/calculate-commission \
     -H "Content-Type: application/json" \
     -d '{"dealId": "1", "selectedUserId": "123"}'
   ```

4. **Check if authenticated**:

   - Visit `https://autobuilders-commissions.onrender.com/`
   - It should redirect you to authenticate with Pipedrive
   - Complete the OAuth flow

5. **Pipedrive Extension Configuration**:
   Make sure in the Pipedrive Developer Hub under Extensions, you have:
   - Extension Type: Panel
   - Panel Context: Deal
   - Panel URL: `https://autobuilders-commissions.onrender.com/extension/deal`
   - Required: The app must be INSTALLED in your Pipedrive account
