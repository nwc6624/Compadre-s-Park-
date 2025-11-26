# Blue Slide Park – Inspired Endless Slide Game

A modern, mobile-first endless slide game inspired by Mac Miller's original "Blue Slide Park – The Game" browser game. Built with Three.js, TypeScript, and Vite, wrapped for Android using Capacitor.

## About

This project is a tribute to the original Blue Slide Park game, recreated with modern web technologies and optimized for mobile devices. The game features touch controls, responsive design, and a playful 2011-era Flash game aesthetic while using entirely original assets and code.

**Note:** This is an inspired recreation, not a port. All assets, code, and design elements are original creations that pay homage to the original game's style and vibe.

## Tech Stack

- **Frontend:** Vite + TypeScript + Vanilla JavaScript
- **3D Graphics:** Three.js
- **Mobile:** Capacitor (Android)
- **Styling:** CSS3 with responsive design

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- For Android development: Android Studio

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

### Running the Web Version

Start the Vite development server:

```bash
npm run dev
```

The game will be available at `http://localhost:5173` (or the port shown in the terminal).

### Building for Web

Build the production-ready web version:

```bash
npm run build
```

The built files will be in the `dist/` directory. You can preview the production build with:

```bash
npm run preview
```

### Building and Running the Android App

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Sync the build to Android:**
   ```bash
   npx cap sync
   ```
   
   Or use the combined command:
   ```bash
   npm run cap:build
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```
   
   Or use the npm script:
   ```bash
   npm run cap:open
   ```

4. **In Android Studio:**
   - Wait for Gradle sync to complete (may take a few minutes on first run)
   - Connect an Android device via USB (with USB debugging enabled) OR start an Android emulator
   - Click the green "Run" button (▶️) or press `Shift+F10`
   - Select your device/emulator when prompted

The app is configured to run fullscreen in portrait mode, loading the game from local files.

## Assets

### Placeholder Assets

The project includes placeholder filenames for custom assets that you should replace:

- `public/assets/logo_blue_slide_park.png` - Game title logo (thick white outlined letters with blue paint strokes)
- `public/assets/slide_texture.png` - Tileable blue paint/slide texture

**Important:** These are placeholder filenames only. The repository does not include any copyrighted assets from the original Blue Slide Park game. You should replace these with your own original artwork that matches the Blue Slide Park aesthetic.

The game will gracefully fall back to solid colors if these assets are not present, so you can develop and test without them.

## Features

- 🎮 Touch-based controls (swipe left/right to change lanes)
- 📱 Mobile-optimized with fullscreen immersive mode
- 🎨 Blue Slide Park-inspired visual style
- ⚡ Performance optimizations (delta time, material/geometry reuse)
- 💾 High score persistence (localStorage)
- 📐 Responsive HUD that adapts to different screen sizes
- 🚫 Mobile UX polish (no text selection, no zoom, no scrolling)

## Project Structure

```
.
├── src/
│   ├── main.ts          # Main game logic and Three.js setup
│   └── style.css        # Game styles and responsive HUD
├── public/
│   └── assets/          # Placeholder for game assets
├── android/             # Capacitor Android project
├── dist/                # Built web files (generated)
├── index.html           # Main HTML file
├── capacitor.config.ts  # Capacitor configuration
└── package.json         # Dependencies and scripts
```

## Roadmap

Future enhancements and features under consideration:

- 🎵 **Background Music** - Support for user-supplied background music tracks
- 🎯 **More Obstacle Types** - Additional obstacles and challenges to increase difficulty and variety
- ⚙️ **Menu and Settings Screen** - Simple menu system with settings for sound, difficulty, and other preferences
- 🏆 **Achievements System** - Unlockable achievements and milestones
- 🌈 **Visual Effects** - Particle effects, screen shake, and other polish
- 📊 **Leaderboards** - Local or online leaderboard integration

## Development Notes

- The game uses a delta time system to ensure consistent gameplay across different frame rates
- Materials and geometries are cached and reused for optimal performance
- Touch controls support both swipe gestures and drag interactions
- The game state system manages START, PLAYING, and GAME_OVER states

## License

This project is a personal recreation and tribute. All code and assets are original creations inspired by but not derived from the original Blue Slide Park game.

## Credits

Inspired by Mac Miller's "Blue Slide Park – The Game" (2011).

---

Built with ❤️ using Three.js, TypeScript, and Vite.

