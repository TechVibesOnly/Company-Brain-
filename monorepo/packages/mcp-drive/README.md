# Company Brain: Google Drive MCP Connector

This package provides a stateless Google Drive Model Context Protocol (MCP) server. It exposes endpoints to fetch, export, list, and run server-side Gemini prompts over drive files to extract topics, expertise, architectural choices, and related strategic initiatives.

## Tools Provided

1. `drive_list_files(userId, query, fields, pageToken, orderBy)`
2. `drive_get_file_content(userId, fileId, mimeType)`
3. `drive_extract_signals(userId, fileId, mimeType)`
4. `drive_watch_folder(userId, folderId, channelId)`
5. `drive_process_change(userId, changeId)`
