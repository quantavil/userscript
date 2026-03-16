# ♟️ Super Chess Bot for chess.com

A  high-performance Tampermonkey userscript designed for **Chess.com**. It provides tournament-level analysis and execution, optimized for hyper-bullet and blitz games.

## 🚀 Key Features

### 🧠 Dual-Engine Intelligence
- **Hybrid Analysis:** Seamlessly switches between a high-speed cloud-based Stockfish API and a **High-Performance Local Engine**.
- **Tactical Powerhouse:** The local engine now solves **141/300** tactical puzzles in 2 seconds (Win At Chess suite), achieving **100,000+ NPS**.
- **Advanced Pruning:** Features Null Move Pruning, Reverse Futility Pruning, and Razoring for deep, efficient search.
- **Local Fallback:** Never lose a move—if the API is slow or throttled, the local engine kicks in instantly to ensure continuity.

### ⚡ Professional-Grade Automation
- **Hyper-Bullet AutoMove:** Configurable move speeds with ultra-low latency. Make moves near-instantly with fine-grained control.
- **Smart Jitter:** Add natural human-like variation to move timings to mimic realistic play.
- **Auto-Promotion:** Intelligent queen promotion logic handles endgame transitions smoothly.

### 🛡️ Advanced Premove System
- **Context-Aware Premoves:** Smarter than standard premoves—select filters for specific pieces or capture-only modes.
- **Safety Checks:** Automatically prioritizes king safety and avoids hanging pieces during rapid play.

### 📊 Tactical UI & Oversight
- **Live Evaluation Bar:** Real-time visual representation of the board state (CP/Mate).
- **Dynamic Highlights:** Visualizes best moves and engine lines directly on the board.
- **Tournament Mode:** Optimized for fast-paced tournament environments with auto-rematch and instant board initialization.

### 🛠️ Customization & Persistence
- **Draggable Control Panel:** A sleek, glassmorphism-inspired UI that stays out of your way.
- **Persistent Settings:** Your configurations for bot power, speed, and filters are saved automatically.

## 📥 Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension.
2. Load the `dist/bundle.user.js` file into Tampermonkey.
3. Open any game on **Chess.com** and look for the GabiBot panel.

---
*Disclaimer: Use responsibly. This tool is for educational and analysis purposes.*
