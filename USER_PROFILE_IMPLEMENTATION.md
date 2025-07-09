# User Profile Feature Implementation

## Overview

The user profile feature has been enhanced to provide a more interactive and user-friendly experience. The implementation includes:

1. A clickable user profile in the sidebar
2. A dropdown menu with various options
3. A profile editing dialog with avatar upload capability

## Components

### 1. UserProfileMenu

- Located in `/src/components/profile/UserProfileMenu.tsx`
- Shows a clickable profile with user avatar/initial and display name
- When clicked, displays a dropdown menu with options:
  - Edit Profile (functional)
  - Account (placeholder)
  - Subscription (links to subscription page)
  - Notifications (placeholder)
  - Settings (placeholder)
  - About (placeholder with version)
  - Sign Out (functional)
- When sidebar is collapsed, shows a tooltip on hover
- Uses Radix UI Dropdown component for accessibility

### 2. UserProfileEditDialog

- Located in `/src/components/profile/UserProfileEditDialog.tsx`
- Allows editing of user profile information:
  - Profile Avatar (upload via Supabase Storage)
  - Display Name
  - Bio
  - Website
- Saves changes to Supabase database
- Provides feedback with toast notifications
- Uses Radix UI Dialog component for accessibility

### 3. Integration with AppSidebar

- The UserProfileMenu is integrated into AppSidebar.tsx
- Appears in the footer area of the sidebar
- Adapts to collapsed/expanded sidebar states

## Technical Implementation

### Avatar Upload Flow:

1. User clicks on the avatar in the edit dialog
2. Selects an image file
3. Image is uploaded to Supabase Storage
4. Public URL is retrieved and stored in component state
5. On form submission, the avatar_url is saved to the user's profile

### Profile Data Structure:

The user profile in the database contains:
- `id`: User ID
- `display_name`: User's display name
- `bio`: Short user biography
- `website`: User's website URL
- `avatar_url`: URL to user's profile picture
- `subscription_tier`: User's subscription level
- `updated_at`: Last update timestamp

## Future Enhancements

- Implement actual functionality for Account, Notifications, and Settings pages
- Add more profile customization options (themes, preferences)
- Implement social links for user profiles
- Add image cropping/editing before upload
- Implement profile privacy settings

## Usage

The user profile feature is automatically available in the sidebar for all logged-in users. No additional configuration is required.
