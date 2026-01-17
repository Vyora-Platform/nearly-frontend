// Configuration Example
// Copy this file to config.local.ts and update the values for your environment

export const configExample = {
  // Application Environment
  environment: 'development' as 'development' | 'staging' | 'production',

  // API Configuration
  apiBaseUrl: 'http://localhost:5000',
  wsBaseUrl: 'ws://localhost:5000',

  // Database Configuration (for server)
  databaseUrl: 'your_database_url_here',

  // Authentication Secrets (for server)
  sessionSecret: 'your_session_secret_here',

  // Feature Flags
  features: {
    enableNotifications: true,
    enableChat: true,
    enableAnalytics: false,
  },

  // External Services (if any)
  externalServices: {
    // Add any external service configurations here
  },
};
