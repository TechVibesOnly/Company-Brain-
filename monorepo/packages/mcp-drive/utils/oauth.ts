import { google } from "googleapis";

export async function getAuthorizedDriveClient(userId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.DRIVE_CLIENT_ID,
    process.env.DRIVE_CLIENT_SECRET,
    process.env.DRIVE_REDIRECT_URI || "https://ais-pre-gpugpis4hbxsp4mmyfvn4y-346359161411.asia-southeast1.run.app/api/auth/callback"
  );

  const refreshToken = process.env.TEMP_MOCK_DRIVE_REFRESH_TOKEN;
  
  if (!refreshToken) {
    throw new Error(`OAuth token expired or not authorized for user ${userId}. Call drive_reauthorize to refresh.`);
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}
