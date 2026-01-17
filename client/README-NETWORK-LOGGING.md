# Client Network Logging

This document describes the network logging and debugging features implemented in the Nearly client application.

## Features

### 🚀 API Request/Response Logging

All API calls made through `gatewayRequest()` are automatically logged to the browser console with detailed information:

- **Request Logging**: Method, URL, headers (auth tokens hidden), request body
- **Response Logging**: Status code, response time, headers, response body
- **Error Logging**: Failed requests with error details and timing

**Console Output Examples:**
```
🚀 Network REQUEST: { method: "GET", url: "http://localhost:9002/api/users", endpoint: "/api/users", ... }
📥 Network RESPONSE: { method: "GET", url: "http://localhost:9002/api/users", status: 200, duration: "245ms", ... }
💥 Network ERROR: { method: "POST", url: "http://localhost:9002/api/auth/login", error: "Invalid credentials", ... }
```

### 🔌 WebSocket Connection Logging

WebSocket connections (especially for chat features) are logged with connection details:

- **Connection Attempts**: URL, protocol, connection parameters
- **Connection Success**: Ready state, protocol version, extensions
- **Message Sending**: Outgoing messages with timestamps
- **Message Receiving**: Incoming messages with full payload
- **Disconnection**: Close codes, reasons, clean disconnect status
- **Errors**: Connection errors with detailed error information

**Console Output Examples:**
```
🔌 WebSocket Connecting: ws://localhost:9002/ws/video
✅ WebSocket Connected: ws://localhost:9002/ws/video
📤 WebSocket Sent: { type: "JOIN", message: {...}, timestamp: "2024-01-16T..." }
📥 WebSocket Received: { type: "MATCHED", message: {...}, timestamp: "2024-01-16T..." }
🔌 WebSocket Disconnected: { code: 1000, reason: "Normal closure", wasClean: true }
```

### 🌐 Network Status Monitoring

Real-time network connectivity monitoring:

- **Automatic Status Checks**: Every 30 seconds
- **Status Notifications**: Console logs when network goes online/offline
- **UI Indicator**: Network status badge in top-right corner of the app
- **Subscriber API**: Components can subscribe to network status changes

## Usage

### Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate through the app - all network calls will be logged automatically

### Network Status UI

A small status indicator appears in the top-right corner:
- 🟢 Green: Online (API Gateway reachable)
- 🔴 Red: Offline (API Gateway unreachable)
- ⚪ Gray: Checking status

Click the indicator for detailed status information.

### Programmatic Access

```typescript
import { onNetworkStatusChange, getNetworkStatus } from '@/lib/gateway-api';

// Subscribe to network status changes
const unsubscribe = onNetworkStatusChange((online) => {
  console.log('Network status changed:', online ? 'online' : 'offline');
});

// Get current status
const currentStatus = getNetworkStatus(); // true, false, or null
```

## Configuration

Network logging can be controlled via the `NETWORK_LOGGING_ENABLED` constant in `client/src/lib/gateway-api.ts`:

```typescript
const NETWORK_LOGGING_ENABLED = true; // Set to false to disable all network logging
```

## Debugging Tips

1. **Filter Console Logs**: Use browser console filters:
   - `🚀` for requests
   - `📥` for responses
   - `💥` for errors
   - `🔌` for WebSocket events
   - `🌐` for network status

2. **Check Network Tab**: Use browser's Network tab for additional request details

3. **API Gateway Health**: Visit `http://localhost:9002/actuator/health` to check service health

4. **WebSocket Testing**: Check WebSocket connections in browser DevTools → Network → WS tab

## Troubleshooting

### No Network Logs Appearing
- Ensure `NETWORK_LOGGING_ENABLED` is set to `true`
- Check browser console for any JavaScript errors that might prevent logging
- Verify API calls are going through the `gatewayRequest` function

### WebSocket Not Connecting
- Check WebSocket URL construction in console logs
- Verify the video-chat-service is running on port 9016
- Check browser's WebSocket connections in DevTools

### Network Status Always Offline
- Ensure the API Gateway is running on port 9002
- Check CORS settings if running in different domains
- Verify `/api/health` endpoint is accessible

## Performance Impact

Network logging has minimal performance impact:
- Logs are only written when console is open
- Request/response cloning only occurs for logging
- Network status checks run every 30 seconds (configurable)
- All logging can be completely disabled by setting `NETWORK_LOGGING_ENABLED = false`