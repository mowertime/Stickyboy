# Sticky Boy

A fast-paced browser-based platformer game where you control a stickman running through an endless world of platforms, obstacles, and enemies.

## Play Now

🎮 **[Play Sticky Boy](https://mowertime.github.io/Stickyboy/)**

## Features

- **Endless Runner Gameplay**: Navigate through procedurally generated platforms
- **Advanced Enemy AI**: Intelligent hunters with grid-based pathfinding and behavior trees
- **Multiple Enemy Types**: Face off against various enemies including hunters and archers
- **Character Classes**: Choose from different character classes with unique abilities
  - **Runner**: Triple jump for ultimate mobility
  - **Archer**: Ranged attacks with charge-up mechanic
  - **Tank**: Extra health for survival
- **Upgrade System**: Improve your character's health, attack power, and speed permanently
- **Power-ups**: Collect health boosts, speed boosts, and shields during your run
- **Coins & Score**: Collect coins to buy upgrades and beat your high score
- **Smooth Controls**: Responsive keyboard controls for movement and attacks
- **Fullscreen Mode**: Cross-platform fullscreen support (press F or click button)
- **Smart Touch Controls**: Automatically hides on-screen controls when keyboard is detected
- **Mobile-Friendly**: Works great on phones, tablets, and desktops
- **Debug Mode**: Enable pathfinding visualization to see AI in action

## How to Play

### Keyboard Controls

- **Arrow Keys** or **A/D**: Move left/right
- **Space** or **W/Up Arrow**: Jump
- **Shift** or **E/K**: Attack/Shoot
- **F**: Toggle fullscreen
- **ESC**: Pause game

### Touch Controls (Mobile/Tablet)

- On-screen buttons appear automatically on touch devices
- Automatically hide when physical keyboard is detected
- Works great with Bluetooth/external keyboards

### Tips

- Avoid obstacles and spike platforms
- Defeat enemies to collect coins and power-ups
- Use the Archer's charge attack for maximum damage
- Press F or click ⛶ button for fullscreen mode
- Enable debug mode in settings to see hunter AI pathfinding

Collect coins, defeat enemies, and survive as long as possible!

## Technologies Used

- **HTML5 Canvas**: For rendering graphics
- **Vanilla JavaScript**: No frameworks, pure JS
- **CSS3**: Modern styling and animations
- **Advanced AI**:
  - Grid-based A* pathfinding
  - Behavior Trees for decision-making
  - Dynamic navigation mesh generation

## AI System

Hunter enemies use a sophisticated AI system combining:

- **40x40 pixel navigation grid** overlaying the game world
- **A* pathfinding algorithm** for optimal route planning
- **Behavior Tree architecture** for intelligent decision-making
- **Multi-jump planning** for complex navigation sequences

See [AI_SYSTEM.md](AI_SYSTEM.md) for detailed technical documentation.

## Development

The game is built entirely with vanilla JavaScript and runs in any modern web browser. No build process or dependencies required!

## License

MIT License - Feel free to use and modify as you wish.
