# Company Brain: local Filesystem MCP Connector

This package provides a Local Filesystem Model Context Protocol (MCP) server. It exposes sandboxed operations to list directories, read/write files, watch for active document events via `chokidar`, and analyze content server-side via Gemini models to extract structured operational entities (specialists, components, concepts, and choices).

## Tools Provided

1. `fs_read_file(path)`
2. `fs_write_file(path, content)`
3. `fs_list_directory(path)`
4. `fs_watch_directory(path)`
5. `fs_extract_signals(path)`
