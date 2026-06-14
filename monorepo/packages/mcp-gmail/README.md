# Company Brain: Gmail MCP Connector

This package provides a stateless, high-performance Gmail Model Context Protocol (MCP) server. It integrates Google OAuth refresh sequences and connects directly with server-side Gemini AI models to analyze communications and extract structural organization knowledge.

## Environment Variables

- `GEMINI_API_KEY`: Google Gemini API credentials.
- `GEMINI_PROXY_URL`: Optional server-side API proxy.
- `GMAIL_CLIENT_ID`: Google Developer Console client identification.
- `GMAIL_CLIENT_SECRET`: Google Developer Console secret.
- `TEMP_MOCK_GMAIL_REFRESH_TOKEN`: User refresh token stored securely on backend.

## Tools Provided

1. `gmail_list_threads(userId, maxResults, pageToken, labelIds)`
2. `gmail_get_thread(userId, threadId)`
3. `gmail_extract_signals(userId, threadId)`
4. `gmail_watch(userId, topicName)`
5. `gmail_process_new(userId, historyId)`
