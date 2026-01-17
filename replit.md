# Nearly - Location-Based Social Network

## Overview

Nearly is a mobile-first social networking application designed for Indian users to connect with people and discover activities nearby. The app combines features from Instagram's visual interface and WhatsApp's messaging patterns to create a hyperlocal social experience. Users can share activities, discover events, join groups, and stay informed about local news - all centered around proximity and location-based discovery.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing (replacing React Router)
- Dark-mode-only UI with no light theme toggle to simplify the design system

**UI Component System**
- Radix UI primitives for accessible, unstyled base components (dialogs, dropdowns, popovers, etc.)
- Shadcn/ui component library with "new-york" style variant
- Tailwind CSS for utility-first styling with custom design tokens
- Design inspired by Instagram's visual language and card-based layouts
- Mobile-first approach targeting 375px-428px viewport (iPhone SE to iPhone Pro Max)

**State Management**
- TanStack Query (React Query) for server state management and caching
- Query client configured with infinite stale time and disabled refetching for optimal performance
- Local component state using React hooks for UI-only state

**Key Design Decisions**
- Instagram-inspired color palette with red (#ef4444 / HSL 0 84% 60%) for brand elements and primary actions
- Dark theme as the only theme (HSL color values: background at 0 0% 7%, cards at 0 0% 12%)
- Custom CSS variables for elevation states (hover/active) and button borders
- Comprehensive component library including ActivityCard, EventCard, GroupCard, NewsCard with consistent interaction patterns

### Backend Architecture

**API Gateway Microservices**
- All API requests are proxied through a lightweight Express.js server to a Spring Boot microservices gateway
- Node.js Express server serves the frontend and proxies `/api/*` requests to the gateway
- Gateway runs on port 9002 (configurable via GATEWAY_URL environment variable)
- No local database - all data persistence handled by microservices

**API Design**
- RESTful API architecture with resource-based endpoints
- ALL endpoints route through the microservices gateway
- Endpoints organized by domain: `/api/users`, `/api/activities`, `/api/events`, `/api/groups`, `/api/news`
- CRUD operations for all major entities with proper HTTP methods (GET, POST, PATCH, DELETE)
- Special endpoints for interactions: like/unlike, voting (true/fake for news), participant counts

**Microservices Gateway**
- Spring Boot-based API Gateway (port 9002)
- Services include: auth-service, user-service, activity-service, event-service, group-service, news-service, media-service
- JWT-based authentication with token refresh support
- Service discovery and configuration management

**Development Environment**
- Vite dev server running in middleware mode for seamless full-stack development
- Hot module replacement (HMR) for instant frontend updates
- Request logging with response capture and truncation
- Gateway proxy for CORS-free development

### Data Models

**Type Definitions**
- Shared TypeScript interfaces in `shared/schema.ts` define all data structures
- Types include: User, Activity, Event, Group, News, Message, Notification, Moment
- Zod schemas for client-side form validation
- No database ORM dependencies - pure TypeScript types

**Core Data Models**

*Users*
- UUID primary keys
- Profile fields: username (unique), name, bio, location, interests, avatarUrl
- Aggregate counts: followers, following, posts

*Activities*
- Flexible activity creation with date ranges, participant limits, visibility controls
- Location-based discovery support
- Cost field for paid/free activities
- Category system for filtering
- Engagement metrics: likes, comments, participants

*Events*
- Structured event management with start/end dates
- Entry type system (FREE/PAID) with optional pricing
- Venue location and capacity management
- Attendee tracking and organizer references

*Groups*
- Community organization with public/private/invite-only visibility
- Category-based classification
- Member count tracking
- Cover images and descriptions

*News*
- Hyperlocal news sharing with location tagging
- Truth verification system (true/fake vote counts)
- Category filtering (Local, National, Sport, etc.)
- Source attribution and user-generated content support

### External Dependencies

**UI Component Libraries**
- @radix-ui/* (v1.x) - 20+ primitive components for accessible UI building blocks
- shadcn/ui components configured with "new-york" style and dark theme
- lucide-react for consistent iconography (Instagram-style icons)
- class-variance-authority for type-safe component variants
- tailwind-merge and clsx for conditional class name composition

**Form Management**
- react-hook-form for performant form state management
- @hookform/resolvers for Zod schema integration
- Validation schemas using Zod for client-side validation

**Date & Time**
- date-fns (v3.x) for date formatting and manipulation
- Used for "time ago" displays, event date formatting, etc.

**Development Tools**
- @replit/vite-plugin-* suite for Replit-specific development features
- tsx for TypeScript execution in development
- esbuild for production server bundling

**Design Tokens & Styling**
- Custom Tailwind configuration with HSL-based color system
- CSS variables for dynamic theming and elevation states
- Border radius tokens: lg (9px), md (6px), sm (3px) matching Instagram's design
- Gradient utilities for brand-consistent red (#ef4444) accent color

**Key Integration Points**
- Shared type definitions between client and server prevent type mismatches
- API client wrapper provides centralized request handling with proper error boundaries
- Query client configuration ensures consistent caching behavior across all data fetching
- Toast notifications for user feedback on create/update/delete operations
- All API calls route through the microservices gateway - no local database queries
