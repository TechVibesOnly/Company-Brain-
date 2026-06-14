# Company Brain: Slack MCP Connector

This package provides a stateless Slack Model Context Protocol (MCP) server. It integrates Slack development API tokens and uses Gemini models to analyze communications to build structural organization schemas covering professional skills, strategic choices, blockers, mentioned personnel, and actionable tasks.

## Tools Provided

1. `slack_list_channels(types, excludeArchived)`
2. `slack_get_channel_history(channelId, oldest, latest, limit)`
3. `slack_get_thread_replies(channelId, threadTs)`
4. `slack_extract_signals(channelId, messageTs)`
5. `slack_subscribe_events(eventTypes)`
