# Pixel Climber

A challenging vertical scrolling platformer built with Phaser 3 and Electron. Climb as high as you can while avoiding falling debris and managing your health!

> **🔧 Recently Refactored**: This codebase has been completely refactored for better maintainability and modularity. See [REFACTORING.md](REFACTORING.md) for details.

## 🎮 Game Features

### Core Gameplay

- **Vertical Climbing**: Navigate upward through procedurally generated platforms
- **Physics-Based Movement**: Realistic jumping with momentum and run-up mechanics
- **Health System**: Take damage from falls and debris hits
- **Scoring System**: Earn points for every meter climbed and coins collected
- **Coin Collection**: Collect strategically placed coins for bonus points

### Advanced Mechanics

- **Run-up Momentum**: Build speed for longer horizontal jumps (trade height for distance)
- **Fall Damage**: Large drops will hurt you - land carefully!
- **Debris Hazards**: Avoid falling rocks that spawn from above
- **Smart Platform Generation**: Mathematically guaranteed reachable platforms with proper spacing
- **Multiple Platform Sizes**: Small, medium, and large platforms with varied spawning

### Visual & Audio

- **Pixel Art Style**: Crisp 32x48 pixel character and detailed environments
- **Parallax Backgrounds**: Multi-layer mountain scenery that moves with your climb
- **Procedural Audio**: Dynamic sound effects and ambient music generated in real-time
- **Smooth Camera**: Follows your ascent with proper bounds
- **Animated Coins**: Floating coins with smooth collection animations

## 🏗️ Architecture

The game uses a modular architecture for better maintainability:

```
src/
├── GameConfig.js      # Game constants and configuration
├── AudioSystem.js     # Audio management and sound effects
├── PixelArt.js       # Procedural pixel art generation
├── ScoringSystem.js   # Health, scoring, and UI management
├── WorldSystem.js     # Platform generation and world streaming
├── Player.js         # Player character logic and physics
├── DebrisSystem.js   # Falling debris hazard system
└── CoinSystem.js     # Coin spawning and collection
```

**Entry Points**:

- `index.html` - Main HTML entry point
- `game.js` - Main game orchestration (ES6 modules)

## 🎯 Gameplay Tips

1. **Master the Run-up**: Hold left/right while jumping for maximum horizontal distance
2. **Watch Your Landing**: Falls from great heights cause damage
3. **Dodge Debris**: Falling rocks spawn regularly - stay alert!
4. **Plan Your Route**: Platforms are spaced to challenge your jumping skills
5. **Manage Health**: Your health bar shows current status - avoid taking unnecessary damage

## 🕹️ Controls

- **Arrow Keys** or **A/D**: Move left/right
- **Up Arrow** or **Spacebar**: Jump
- **🔊/🔇 Button**: Toggle audio on/off

## 🚀 Installation & Running

```bash
# Install dependencies
npm install

# Start the game
npm start
```

## 🛠️ Technical Features

### Game Engine

- **Phaser 3**: Modern HTML5 game framework
- **Electron**: Cross-platform desktop app
- **Physics**: Arcade physics with custom gravity and momentum
- **Rendering**: Pixel-perfect rendering with anti-aliasing disabled

### Procedural Systems

- **Platform Generation**: Physics-based reachability calculations
- **World Streaming**: Infinite vertical scrolling with smart cleanup
- **Debris System**: Dynamic hazard spawning with realistic physics
- **Audio Generation**: Real-time synthesized sound effects and music

### Performance Optimizations

- **Object Pooling**: Efficient debris and platform management
- **Viewport Culling**: Only active objects within camera bounds
- **Smart Cleanup**: Automatic removal of off-screen elements

## 🎨 Art & Design

- **Character**: 32x48 pixel human sprite with perfect collision detection
- **Platforms**: 120x18 pixel rocky platforms with procedural texture details
- **Environment**: Multi-layer parallax mountains with pixel-perfect scaling
- **Effects**: Screen shake, flashes, and visual feedback for all actions

## 🔧 Configuration

The game includes numerous tunable parameters in `game.js`:

- **Movement**: Speed, drag, and velocity limits
- **Jumping**: Base velocity, momentum trade-offs, and horizontal impulse
- **Platforms**: Gap sizes, spacing requirements, and generation rules
- **Debris**: Spawn rates, physics behavior, and damage values
- **Health**: Damage thresholds, fall damage scaling

## 📈 Scoring

- **10 points per meter** climbed
- **Score displayed** in real-time HUD
- **Best height tracking** for personal records
- **Reset on death** for fresh challenges

---

_Built for game jam - A simple but engaging climbing challenge!_
