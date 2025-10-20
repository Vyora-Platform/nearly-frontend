# Nearly - Design Guidelines

## Design Approach
**Reference-Based Approach**: Instagram + WhatsApp hybrid
- Primary inspiration: Instagram's visual language, card layouts, and interaction patterns
- Secondary inspiration: WhatsApp's chat interface and group messaging UX
- Target: Mobile-only social app for Indian users (no desktop/responsive variations needed)

## Core Design Principles
1. **Exact Replication**: Follow provided mockups precisely for layouts, spacing, and component sizing
2. **Instagram Parity**: Match Instagram's icon sizes, text hierarchy, and interaction patterns
3. **Dark-First**: Entire app operates in dark theme with no light mode toggle
4. **Hyperlocal Context**: Design should emphasize location-based discovery and nearby connections

## Color Palette

### Dark Mode Colors (Primary)
- Background Primary: 0 0% 7% (very dark gray, almost black)
- Background Secondary: 0 0% 12% (card/container backgrounds)
- Background Tertiary: 0 0% 18% (hover states, subtle elevation)
- Text Primary: 0 0% 95% (main text)
- Text Secondary: 0 0% 60% (timestamps, metadata)
- Border: 0 0% 20% (dividers, card borders)

### Brand & Accent Colors
- Primary Brand Color: Red #ef4444 (HSL: 0 84% 60%)
  - Used for primary action buttons, CTAs, and brand accents
  - Gradient Start: 0 84% 60% (red)
  - Gradient End: 0 84% 60% (red - solid color, not gradient)
- Action Blue: 220 85% 55% (links, interactive elements)
- Success Green: 140 65% 50% (verified badges, positive actions)
- Warning Red: 0 75% 60% (fake news voting, delete actions)

## Typography

### Font Stack
- Primary: System UI fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
- Emoji Support: Include "Apple Color Emoji", "Segoe UI Emoji"

### Type Scale (Match Instagram Sizing)
- Header Large: text-2xl font-bold (24px, profile name, event titles)
- Header Medium: text-xl font-semibold (20px, section headers)
- Body Regular: text-sm (14px, post content, descriptions)
- Body Small: text-xs (12px, timestamps, metadata, follower counts)
- Caption: text-xs text-gray-400 (11px, helper text, form labels)
- Button Text: text-sm font-semibold (14px, all CTAs)

## Layout System

### Mobile Viewport
- Target Width: 375px - 428px (iPhone SE to iPhone Pro Max)
- Safe Areas: Account for bottom navigation (64px) and top status bar
- Container: No side padding for edge-to-edge cards; px-4 for content within cards

### Spacing Primitives
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Component Padding: p-4 (cards, containers)
- Vertical Spacing: space-y-4 (between feed items), space-y-2 (within components)
- Icon-Text Gap: gap-2 or gap-3
- Section Separation: mb-6 or mb-8

### Grid & Cards
- Feed Cards: Full-width with rounded-xl corners, subtle border
- Event/Group Cards: Single column stacking, 16:9 image ratio
- Profile Grid: 3-column photo grid (Instagram-style)

## Component Library

### Bottom Navigation (Fixed)
- Height: 64px with border-t
- 5 tabs: Home, Events, Groups, News, Profile
- Active state: Text color matches gradient, icon filled
- Inactive state: text-gray-400, icon outline
- Icon size: w-6 h-6 (24px, Instagram standard)

### Top Navigation Bar
- Height: 56px with px-4 padding
- Logo/Title: text-xl font-bold on left
- Action Icons: Right-aligned, w-6 h-6 size
- Background: Slightly elevated from main background

### Cards & Feed Items
- Border Radius: rounded-xl (12px)
- Background: bg-gray-900 (slightly lighter than page background)
- Border: border border-gray-800
- Padding: p-4 internally
- Shadow: No shadows (flat design)

### Buttons & CTAs
- Primary: Red solid color (`bg-gradient-primary` which uses #ef4444)
- Height: h-11 or h-12 (44-48px for mobile touch targets)
- Border Radius: rounded-full for primary CTAs, rounded-lg for secondary
- Text: text-sm font-semibold text-white
- Secondary: border border-gray-700 with text-white

### Input Fields
- Background: bg-gray-900
- Border: border border-gray-700, focus:border-gray-600
- Height: h-11 minimum (44px touch target)
- Padding: px-4 py-3
- Border Radius: rounded-lg
- Placeholder: text-gray-500

### Icons
- Library: Heroicons (outline for inactive, solid for active states)
- Standard Size: w-6 h-6 (24px)
- Small Size: w-5 h-5 (20px for inline icons)
- Color: Inherit from parent text color

### Avatar & Profile Images
- Small: w-8 h-8 (user mentions, comments)
- Medium: w-10 h-10 (feed posts, group members)
- Large: w-20 h-20 (profile page header)
- Border Radius: rounded-full
- Border: 2px solid gradient for stories/active status (optional)

### Interaction Patterns
- Like/Comment/Share: Icon + count, text-xs text-gray-400
- Follow Button: Red background when not following, outlined when following
- Join/RSVP: Red primary button (bg-gradient-primary)
- Vote (News): Dual buttons - green (True) / red (FAKE) with vote counts

## Feature-Specific Components

### Activity Feed (Home)
- Post Header: Avatar + Name + Timestamp + Menu (horizontal layout)
- Content Area: Text + optional image/poll
- Action Bar: Like, Comment, Join buttons with counts
- Comments: Nested replies with smaller avatars and text-xs

### Events
- Event Card: Featured image (16:9), title, date/time, location, price badge
- Filter Pills: Horizontal scroll, rounded-full chips with border
- Category Icons: Small icons next to category names

### Groups
- Group Card: Square thumbnail, name, member count, privacy indicator
- Chat Interface: WhatsApp-style bubbles (sender on right with red bg)
- Message Input: Fixed bottom with rounded-full input field

### News
- News Card: Thumbnail + headline + source + timestamp
- Vote Buttons: Side-by-side True/FAKE with percentage bars
- Category Badges: Small colored pills (Local, National, Sport, Crime)

### Profile
- Header: Large avatar, bio, follower/following counts
- Tab Bar: Posts, Events, Saved (underline indicator for active)
- Photo Grid: 3 columns, square aspect ratio, minimal gap

## Images & Media
- Profile Photos: User-uploaded, circular crop
- Event/Activity Images: 16:9 landscape, rounded corners
- News Thumbnails: Square or 4:3 aspect ratio
- Group Icons: Square, can be auto-generated with red background + initials

## Accessibility & Interactions
- Touch Targets: Minimum 44x44px for all interactive elements
- Loading States: Skeleton screens with shimmer effect in gray-800/gray-700
- Empty States: Icon + text-center with text-gray-400
- Error States: Red accent with descriptive text
- No hover states: Mobile-first, focus on tap/press interactions

## Animation & Transitions
- Minimize animations: Use only for critical feedback (like button press, page transitions)
- Tab Switches: Instant, no fade/slide
- Modal Entry: Slide up from bottom (iOS-style)
- Pull to Refresh: Native-feeling elastic scroll