// Configuration file for API endpoints and deployment settings
interface Config {
  API_BASE_URL: string;
  WSS_BASE_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FEATURES: {
    ENABLE_NOTIFICATIONS: boolean;
    ENABLE_CHAT: boolean;
    ENABLE_ANALYTICS: boolean;
    ENABLE_RANDOM_CHAT: boolean;
    ENABLE_VIDEO_CHAT: boolean;
  };
  // Microservices API Gateway
  GATEWAY_URL: 'https://api.nearlyapp.in';
  GATEWAY_WSS_URL: 'wss://api.nearlyapp.in';
}

// Environment-specific configurations
const configs: Record<string, Partial<Config>> = {
  development: {
    // Use Vite proxy - requests to same origin are proxied to Java gateway at 9002
    API_BASE_URL: 'https://api.nearlyapp.in',
    WSS_BASE_URL: 'wss://api.nearlyapp.in',

    // Microservices Gateway - proxied via Vite dev server
    GATEWAY_URL: 'https://api.nearlyapp.in',
    GATEWAY_WSS_URL: 'wss://api.nearlyapp.in',

    ENVIRONMENT: 'development',
    FEATURES: {
      ENABLE_NOTIFICATIONS: true,
      ENABLE_CHAT: true,
      ENABLE_ANALYTICS: false,
      ENABLE_RANDOM_CHAT: true,
      ENABLE_VIDEO_CHAT: true,
    },
  },

  staging: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.nearlyapp.in',
    WSS_BASE_URL: import.meta.env.VITE_WSS_BASE_URL || 'wss://api.nearlyapp.in',
    GATEWAY_URL: import.meta.env.VITE_GATEWAY_URL || 'https://api.nearlyapp.in',
    GATEWAY_WSS_URL: import.meta.env.VITE_GATEWAY_WSS_URL || 'wss://api.nearlyapp.in',
    ENVIRONMENT: 'staging',
    FEATURES: {
      ENABLE_NOTIFICATIONS: true,
      ENABLE_CHAT: true,
      ENABLE_ANALYTICS: true,
      ENABLE_RANDOM_CHAT: true,
      ENABLE_VIDEO_CHAT: true,
    },
  },
  production: {
    API_BASE_URL: 'https://api.nearlyapp.in',
    WSS_BASE_URL: 'wss://api.nearlyapp.in',
    GATEWAY_URL: 'https://api.nearlyapp.in',
    GATEWAY_WSS_URL: 'wss://api.nearlyapp.in',
    ENVIRONMENT: 'production',
    FEATURES: {
      ENABLE_NOTIFICATIONS: true,
      ENABLE_CHAT: true,
      ENABLE_ANALYTICS: true,
      ENABLE_RANDOM_CHAT: true,
      ENABLE_VIDEO_CHAT: true,
    },
  },
};

// Default configuration
const defaultConfig: Config = {
  API_BASE_URL: 'https://api.nearlyapp.in',  // Same origin - uses Vite proxy in dev
  WSS_BASE_URL: 'wss://api.nearlyapp.in',
  GATEWAY_URL: 'https://api.nearlyapp.in',  // Same origin - uses Vite proxy in dev
  GATEWAY_WSS_URL: 'wss://api.nearlyapp.in',
  APP_NAME: 'Nearly',
  APP_VERSION: '1.0.0',
  ENVIRONMENT: 'development',
  FEATURES: {
    ENABLE_NOTIFICATIONS: true,
    ENABLE_CHAT: true,
    ENABLE_ANALYTICS: false,
    ENABLE_RANDOM_CHAT: true,
    ENABLE_VIDEO_CHAT: true,
  },
};

// Get current environment
const getEnvironment = (): string => {
  // Check for explicit environment variable
  if (import.meta.env.PROD) return 'production';
  if (import.meta.env.VITE_ENV) return import.meta.env.VITE_ENV;

  // Robustly detect production by hostname
  if (typeof window !== 'undefined' && window.location.hostname === 'nearlyapp.in') {
    return 'production';
  }

  // Check for Replit environment
  if (import.meta.env.REPL_ID) return 'production';

  // Default to development
  return 'development';
};

// Merge environment-specific config with defaults
const createConfig = (): Config => {
  const env = getEnvironment();
  const envConfig = configs[env] || {};

  return {
    ...defaultConfig,
    ...envConfig,
  };
};

export const config = createConfig();

// API endpoint builder - now redirects to gateway
// (legacy - was for existing Node.js backend, now routes through API Gateway)
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present for non-empty base URLs
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // If GATEWAY_URL is empty (same-origin proxy), just return the endpoint with leading slash
  if (!config.GATEWAY_URL) {
    return `/${cleanEndpoint}`;
  }
  return `${config.GATEWAY_URL}/${cleanEndpoint}`;
};

// Gateway API endpoint builder (for Spring Boot microservices)
// In development, this routes through the Express server proxy to avoid CORS
export const buildGatewayUrl = (endpoint: string): string => {
  // Keep leading slash for same-origin requests
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // If GATEWAY_URL is empty (same-origin proxy), just return the endpoint with leading slash
  if (!config.GATEWAY_URL) {
    //return `/${cleanEndpoint}`;
    return `${config.GATEWAY_URL}/${cleanEndpoint}`;
  }

  return `${config.GATEWAY_URL}/${cleanEndpoint}`;
};

// WebSocket endpoint builder
export const buildWsUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${config.WSS_BASE_URL}/${cleanEndpoint}`;
};

// Gateway WebSocket endpoint builder
export const buildGatewayWsUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${config.GATEWAY_WSS_URL}/${cleanEndpoint}`;
};

// Export individual config values for convenience
export const {
  API_BASE_URL,
  WSS_BASE_URL,
  GATEWAY_URL,
  GATEWAY_WSS_URL,
  APP_NAME,
  APP_VERSION,
  ENVIRONMENT,
  FEATURES,
} = config;
