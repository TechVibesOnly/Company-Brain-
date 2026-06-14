import { google } from "googleapis";

/**
 * Enterprise OAuth 2.0 gateway client.
 * Strictly reads from process.env.GMAIL_REFRESH_TOKEN ONLY — never from request parameters.
 */
export async function getAuthorizedGmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("GMAIL_REFRESH_TOKEN environment variable is not set. Please supply this secret in Secrets.");
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GMAIL_REDIRECT_URI || "https://ais-pre-gpugpis4hbxsp4mmyfvn4y-346359161411.asia-southeast1.run.app/api/auth/callback"
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  // Automatically manages access token refreshes with googleapis
  return google.gmail({ version: "v1", auth: oauth2Client });
}
