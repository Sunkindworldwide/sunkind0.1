# Sunkind Scroll-Up System

Source: https://sunkind1-0-ar6ssy590-sunkindworldwides-projects.vercel.app/
Access code used: `DaXjT6pg9`
Deployment inspected: May 7, 2026
Page title: `Sunkind - Find the Sun`

## What The Scroll-Up Does

Sunkind is built as a fixed, mobile-first app. The browser page itself does not scroll normally. Instead, an upward scroll gesture or upward touch drag is used to expand the main bottom panel.

The gesture is detected on the map and list views:

- Mouse wheel upward movement
- Touch drag upward movement
- Intersection-based visibility checks that enable the gesture only when the main content is on screen

The panel opens as a slide-up sheet from the bottom. This is the main interaction path for seeing nearby results, spot details, and related actions.

## Features Involved

### Map View

The map view is the primary place where the scroll-up system is used. It shows nearby places, current location context, and the live sun-exposure environment.

Included features:

- Search by city or street
- GPS location capture
- Default location fallback
- Leaflet map display
- Nearby spot discovery
- Time-based solar simulation

### Login

The app includes the full login/logout code path tied to Supabase auth. The feature is implemented in the main app shell, with auth client support in the Supabase helper.

Included features:

- Google sign-in
- Logout button
- Auth fallback when Supabase is not configured
- Login button in the top bar
- Session lookup through Supabase auth
- Sign-out handling through Supabase auth

Implementation files:

- `src/App.tsx`
- `src/lib/supabase.ts`

### Search Logic

The search flow combines multiple sources and then scores the results. The code is spread across the app shell and service layer, not isolated to a single snippet.

- Free geocoding from Nominatim
- Autocomplete suggestions from Photon
- AI-assisted place enrichment
- Nearby OpenStreetMap / Overpass place loading
- Weather and solar scoring
- Backend `/sun/search` scoring call

Implementation files:

- `src/App.tsx`
- `src/services/mapDataService.ts`
- `src/services/geminiService.ts`
- `src/services/overpassService.ts`

This is the same search logic used by the linked Sunkind deployment.

### Nearby Results

When the sheet is expanded, it can show nearby spots with:

- Place name
- Place type
- Distance
- Direct sun percentage
- Weather and cloud context
- Solar elevation
- Solar intensity
- Confidence when available
- Website link when available

Actions shown in the results flow:

- Open in Maps
- Mark as `Too Shade`
- Mark as `Perfect Sun`
- Add seating spot
- Save for later

### Bottom Navigation

The scroll-up panel works alongside the fixed bottom navigation:

- `Discover` / `Explorer`
- `Spots`
- `Ranking` / `Top 10`
- `Favorites` / `Favoris`

### Ranking View

The upward sheet can also surface ranking-related content.

Included features:

- Solar Top 10 list
- Rank number
- Distance
- Sun score percentage
- Empty state when no ranking is available

### Favorites View

The favorites area is part of the same scroll-up-driven interface flow.

Included features:

- Saved points list
- Empty state when no saved spots exist

### Add Place Flow

The scroll-up experience also connects to the add-place modal for missing locations.

Included features:

- Place type
- Place name
- Place position
- Exact outdoor seat point
- Seating type
- Shade source
- Optional note

## Scroll-Up States

The gesture opens a bottom sheet that can contain different states depending on what the user is doing:

- Nearby spot list
- Selected spot detail panel
- Ranking list
- Favorites list
- Location permission prompt
- Add-place modal
- Plus paywall

## Important Copy

The main guidance shown in the interface includes:

- `Search city or street...`
- `Search or use location to show nearby spots.`
- `No spots found in this area`
- `No saved spots yet`
- `No ranking available for this area`
- `Allow Sunkind to use your location?`
- `Add your places`
- `Go Pro for Unlimited Sun`

## Short Version

The scroll-up system is the core interaction in Sunkind. A swipe or wheel-up gesture expands the bottom panel and reveals nearby sun spots, map results, rankings, favorites, login, search logic, place submission, location permission, and the Plus paywall.
