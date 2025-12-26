// ==UserScript==
// @name          ♟-super-chess-bot
// @namespace     http://tampermonkey.net/
// @version       8.1
// @description   superchessbot is a tournament level hyperbullet bot 
// @author        quantavil
// @match         https://www.chess.com/play/computer*
// @match         https://www.chess.com/game/*
// @match         https://www.chess.com/play/online*
// @license       MIT
// @icon          https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant         none
// ==/UserScript==

(async function () {
    'use strict';

    // Single-instance guard to prevent duplicate UI/intervals on SPA navigations
    if (window.__GABIBOT_RUNNING__) {
        console.log('GabiBot: Already running, skipping init.');
        return;
    }
    window.__GABIBOT_RUNNING__ = true;

    // Engine + logic constants
    const API_URL = 'https://stockfish.online/api/s/v2.php';
    const MULTIPV = 1;
    const ANALYZE_TIMEOUT_MS = 3000;      // ⚡ 8000 → 3000ms for bullet
    const AUTO_MOVE_BASE = 800;            // ⚡ 5000 → 800ms for bullet
    const AUTO_MOVE_STEP = 300;            // ⚡ 500 → 300ms for bullet
    const RANDOM_JITTER_MIN = 50;          // ⚡ 120 → 50ms for bullet

    // ═══════════════════════════════════════════════════════════
    // OPENING BOOK - Aggressive Openings
    // ═══════════════════════════════════════════════════════════
    const OPENING_BOOK = [
        { name: "Evans Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4"] },
        { name: "Scotch Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f1c4"] },
        { name: "Danish Gambit", moves: ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4"] },
        { name: "Blackmar-Diemer Gambit", moves: ["d2d4", "d7d5", "e2e4", "d5e4", "b1c3", "g8f6", "f2f3"] },
        { name: "Latvian Gambit", moves: ["e2e4", "e7e5", "g1f3", "f7f5"] },
        { name: "Albin Countergambit", moves: ["d2d4", "d7d5", "c2c4", "e7e5"] },
        { name: "Budapest Gambit", moves: ["d2d4", "g8f6", "c2c4", "e7e5"] },
        { name: "Smith-Morra Gambit", moves: ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3"] },
        { name: "Göring Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "c2c3"] },
        { name: "Halloween Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "c3e5"] },
        { name: "Max Lange Attack", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "d2d4", "e5d4", "e1g1", "d7d6", "f3g5"] },
        { name: "Vienna Game", moves: ["e2e4", "e7e5", "b1c3"] },
        { name: "Four Knights Scotch", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "d2d4"] },
        { name: "Trompowsky Attack", moves: ["d2d4", "g8f6", "c1g5"] },
        { name: "Jobava London", moves: ["d2d4", "d7d5", "c1f4", "g8f6", "b1c3", "c7c5", "e2e3", "b8c6", "h2h4"] },
        { name: "Grand Prix Attack", moves: ["e2e4", "c7c5", "b1c3", "b8c6", "f2f4"] },
        { name: "St. George Aggressive", moves: ["e2e4", "a7a6", "d2d4", "b7b5", "b1c3", "c8b7"] },
        { name: "Italian Game", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
        { name: "Fried Liver Attack", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "f3g5", "d7d5", "e4d5", "f6d5", "g5f7"] },
        { name: "King's Gambit", moves: ["e2e4", "e7e5", "f2f4"] },
        { name: "Wing Gambit", moves: ["e2e4", "c7c5", "b2b4"] },
        { name: "Muzio Gambit", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "f1c4", "g5g4", "e1g1"] },
        { name: "Double Muzio (wild)", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "f1c4", "g5g4", "e1g1", "g4f3", "d1f3"] },
        { name: "Allgaier Gambit", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "h2h4", "g5g4", "f3e5"] },
        { name: "Kieseritzky Gambit", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "h2h4", "g5g4", "f3g5"] },
        { name: "Bishop's Gambit", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "f1c4"] },
        { name: "Vienna Gambit", moves: ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4"] },
        { name: "Vienna, Frankenstein-Dracula", moves: ["e2e4", "e7e5", "b1c3", "g8f6", "f1c4", "f6e4", "d1h5"] },
        { name: "Hamppe-Allgaier Gambit (Vienna)", moves: ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4", "d7d5", "f4e5", "f6e4", "g1f3", "g7g5"] },
        { name: "Jerome Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c4f7", "e8f7", "f3e5"] },
        { name: "Traxler Counterattack (Wilkes-Barre)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "f3g5", "f8c5"] },
        { name: "Cochrane Gambit (Petrov)", moves: ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "d7d6", "e5f7"] },
        { name: "Stafford Gambit", moves: ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6"] },
        { name: "Elephant Gambit", moves: ["e2e4", "e7e5", "g1f3", "d7d5"] },
        { name: "Englund Gambit", moves: ["d2d4", "e7e5"] },
        { name: "Englund Gambit, Charlick", moves: ["d2d4", "e7e5", "d4e5", "b8c6"] },
        { name: "Portuguese Gambit (Scandinavian)", moves: ["e2e4", "d7d5", "e4d5", "g8f6", "d2d4", "c8g4"] },
        { name: "Icelandic Gambit (Scandinavian)", moves: ["e2e4", "d7d5", "e4d5", "g8f6", "c2c4", "e7e6"] },
        { name: "Ponziani Countergambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "c2c3", "d7d5"] },
        { name: "Philidor Countergambit", moves: ["e2e4", "e7e5", "g1f3", "d7d6", "d2d4", "f7f5"] },
        { name: "French: Albin-Chatard Attack", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6", "c1g5", "f8e7", "e4e5", "f6d7", "h2h4"] },
        { name: "French Wing Gambit", moves: ["e2e4", "e7e6", "g1f3", "d7d5", "e4e5", "c7c5", "b2b4"] },
        { name: "Milner-Barry Gambit (French Advance)", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "e4e5", "c7c5", "c2c3", "b8c6", "g1f3", "d8b6", "f1d3"] },
        { name: "Caro-Kann: Fantasy Variation", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "f2f3"] },
        { name: "Caro-Kann: Pseudo-Blackmar Gambit", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "f2f3"] },
        { name: "Alekhine: Four Pawns Attack", moves: ["e2e4", "g8f6", "e4e5", "f6d5", "d2d4", "d7d6", "c2c4", "d5b6", "f2f4"] },
        { name: "Pirc: Austrian Attack", moves: ["e2e4", "d7d6", "d2d4", "g8f6", "b1c3", "g7g6", "f2f4"] },
        { name: "Modern: Three Pawns Attack", moves: ["e2e4", "g7g6", "d2d4", "f8g7", "c2c4", "d7d6", "f2f4"] },
        { name: "King's Indian: Four Pawns Attack", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "e2e4", "d7d6", "f2f4"] },
        { name: "Modern Benoni: Flick-Knife Attack", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "e7e6", "b1c3", "e6d5", "c4d5", "d7d6", "e2e4", "g7g6", "f2f4"] },
        { name: "Benko Gambit", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5"] },
        { name: "Blumenfeld Gambit", moves: ["d2d4", "g8f6", "c2c4", "e7e6", "g1f3", "c7c5", "d4d5", "b7b5"] },
        { name: "Old Benoni: Mokele Mbembe", moves: ["d2d4", "c7c5", "d4d5", "e7e5"] },
        { name: "Chigorin Defense (QGD)", moves: ["d2d4", "d7d5", "c2c4", "b8c6"] },
        { name: "Staunton Gambit (Dutch)", moves: ["d2d4", "f7f5", "e2e4"] },
        { name: "Dutch: Krejcik Gambit", moves: ["d2d4", "f7f5", "g2g4"] },
        { name: "From Gambit (vs Bird)", moves: ["f2f4", "e7e5"] },
        { name: "Grob Attack", moves: ["g2g4", "d7d5", "f1g2"] },
        { name: "Kadas Gambit", moves: ["d2d4", "g8f6", "g2g4"] },
        { name: "Tennison Gambit", moves: ["g1f3", "d7d5", "e2e4", "d5e4", "f3g5"] },
        { name: "Reti Gambit", moves: ["g1f3", "d7d5", "c2c4", "d5c4"] },
        { name: "Sokolsky Gambit (Orangutan)", moves: ["b2b4", "e7e5", "c1b2", "f8b4"] },
        { name: "No-Name: Sicilian g-pawn Storm", moves: ["e2e4", "c7c5", "g2g4"] },
        { name: "Sicilian: Keres Attack idea", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "e7e6", "g2g4"] },
        { name: "Sicilian: Wing Gambit (Deferred)", moves: ["e2e4", "c7c5", "g1f3", "e7e6", "b2b4"] },
        { name: "Nakhmanson Gambit (Italian/Two Knights)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "d2d4", "e5d4", "e1g1", "f6e4", "f1e1"] },
        { name: "Belgrade Gambit (Four Knights)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "d2d4", "e5d4", "c3d5"] },
        { name: "Ruy Lopez: Marshall Attack", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7", "f1e1", "b7b5", "a4b3", "e8g8", "c2c3", "d7d5"] },
        { name: "Italian Game: Rousseau Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f7f5"] },
        { name: "Budapest Gambit Accepted: Alekhine (4...Ng4)", moves: ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4"] },
        { name: "Benko Accepted: Vitolins Gambit (g4)", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5", "c4b5", "a7a6", "b5a6", "g7g6", "g2g4"] },
        { name: "Grob: Toilet Variation", moves: ["g2g4", "d7d5", "f1g2", "c8g4", "c2c4"] },
        { name: "Budapest: Kieninger Trap", moves: ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4", "c1f4", "b8c6", "g1f3", "f8b4", "b1d2", "d8e7", "a2a3", "g4e5", "a3b4", "e5d3"] },
        { name: "Center Game", moves: ["e2e4", "e7e5", "d2d4", "e5d4", "d1d4"] },
        { name: "Center Game: Halasz Gambit", moves: ["e2e4", "e7e5", "d2d4", "e5d4", "d1d4", "b8c6", "d4e3", "g8f6", "b1c3", "f8b4", "c1d2", "e8g8", "e1c1"] },
        { name: "Falkbeer Counter Gambit", moves: ["e2e4", "e7e5", "f2f4", "d7d5"] },
        { name: "Falkbeer: Charousek Gambit", moves: ["e2e4", "e7e5", "f2f4", "d7d5", "e4d5", "e5e4"] },
        { name: "Sicilian: Dragon Yugoslav Attack", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "g7g6", "c1e3", "f8g7", "f2f3", "e8g8", "d1d2", "b8c6", "e1c1"] },
        { name: "Sicilian: Najdorf English Attack", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1e3", "e7e5", "d4b3", "c8e6", "f2f3", "h7h5"] },
        { name: "Sicilian: Velimirovic Attack", moves: ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "d7d6", "f1c4", "e7e6", "c1e3", "f8e7", "d1e2", "e8g8", "e1c1"] },
        { name: "Sicilian: Sozin Attack", moves: ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "d7d6", "f1c4"] },
        { name: "Sicilian: Rossolimo h4-h5 Attack", moves: ["e2e4", "c7c5", "g1f3", "b8c6", "f1b5", "g7g6", "e1g1", "f8g7", "f1e1", "e7e5", "b2b4", "c6b4", "h2h4"] },
        { name: "Sicilian: Closed Kingside Storm", moves: ["e2e4", "c7c5", "b1c3", "b8c6", "g2g3", "g7g6", "f1g2", "f8g7", "d2d3", "d7d6", "f2f4", "e7e6", "g1f3", "g8e7", "e1g1", "e8g8", "f4f5"] },
        { name: "Sicilian: Moscow Variation", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "f1b5"] },
        { name: "Sicilian: Accelerated Dragon g4 Attack", moves: ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g7g6", "c2c4", "f8g7", "c1e3", "g8f6", "b1c3", "e8g8", "f1e2", "d7d6", "e1g1", "c8d7", "d4c2", "d8a5", "g2g4"] },
        { name: "French: Winawer Poisoned Pawn", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "f8b4", "e4e5", "c7c5", "a2a3", "b4c3", "b2c3", "g8e7", "d1g4"] },
        { name: "French: Tarrasch Aggressive", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1d2", "g8f6", "e4e5", "f6d7", "f1d3", "c7c5", "c2c3", "b8c6", "g1e2", "c5d4", "c3d4", "f7f6", "e5f6"] },
        { name: "Caro-Kann: Panov Attack", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "e4d5", "c6d5", "c2c4"] },
        { name: "Caro-Kann: Bronstein-Larsen", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "g8f6", "e4f6", "g7f6", "c1c4"] },
        { name: "Caro-Kann: Rasa-Studier Gambit", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "f2f3", "e4f3", "g1f3"] },
        { name: "Pirc: 150 Attack", moves: ["e2e4", "d7d6", "d2d4", "g8f6", "b1c3", "g7g6", "c1e3", "c7c5", "d1d2", "f8g7", "g1f3", "e8g8", "f1h6"] },
        { name: "Pirc: Bayonet Attack", moves: ["e2e4", "d7d6", "d2d4", "g8f6", "b1c3", "g7g6", "c1e3", "f8g7", "d1d2", "c7c6", "f2f3", "b7b5", "g1e2", "b8d7", "h2h4"] },
        { name: "QGA: Showalter Variation", moves: ["d2d4", "d7d5", "c2c4", "d5c4", "g1f3", "g8f6", "b1c3", "a7a6", "e2e4"] },
        { name: "QGA: Mannheim Variation", moves: ["d2d4", "d7d5", "c2c4", "d5c4", "g1f3", "g8f6", "d1a4", "b8c6", "b1c3", "e7e5"] },
        { name: "QGD: Marshall Gambit", moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "c7c6", "e2e4"] },
        { name: "King's Indian: Sämisch Attack", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "f2f3", "e8g8", "c1e3"] },
        { name: "King's Indian: Petrosian h4 Attack", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3", "e8g8", "f1e2", "e7e5", "d4d5", "a7a5", "c1g5", "h7h6", "g5h4", "b8a6", "h2h4"] },
        { name: "King's Indian: Mar del Plata with h4", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3", "e8g8", "f1e2", "e7e5", "e1g1", "b8c6", "d4d5", "c6e7", "b2b4", "f6h5", "g2g3", "f7f5", "c3d5", "e7d5", "c4d5", "f5e4", "f3g5", "h5f6", "h2h4"] },
        { name: "Benoni: Taimanov Attack", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "e7e6", "b1c3", "e6d5", "c4d5", "d7d6", "e2e4", "g7g6", "f2f4", "f8g7", "f1b5"] },
        { name: "Benoni: Four Pawns Attack", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "e7e6", "b1c3", "e6d5", "c4d5", "d7d6", "e2e4", "g7g6", "f2f4", "f8g7", "g1f3"] },
        { name: "Slav: Geller Gambit", moves: ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "d5c4", "e2e4"] },
        { name: "Slav: Winawer Countergambit", moves: ["d2d4", "d7d5", "c2c4", "c7c6", "b1c3", "e7e5"] },
        { name: "Nimzo-Indian: Sämisch f3-e4", moves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4", "a2a3", "b4c3", "b2c3", "e8g8", "f2f3", "d7d5", "c4d5", "e6d5", "e2e4"] },
        { name: "Nimzo-Indian: Leningrad h4", moves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4", "c1g5", "h7h6", "g5h4", "c7c5", "d4d5", "b7b5", "h2h4"] },
        { name: "Dutch: Leningrad g4 Storm", moves: ["d2d4", "f7f5", "g2g3", "g8f6", "f1g2", "g7g6", "g1f3", "f8g7", "e1g1", "e8g8", "c2c4", "d7d6", "b1c3", "d8e8", "h2h3", "e8h5", "g2g4"] },
        { name: "Dutch: Hopton Attack", moves: ["d2d4", "f7f5", "c1g5"] },
        { name: "Grünfeld: Russian h4 Attack", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5", "g1f3", "f8g7", "d1b3", "d5c4", "b3c4", "e8g8", "e2e4", "c8g4", "c1e3", "g4f3", "g2f3", "c7c6", "h2h4"] },
        { name: "Two Knights: Lolli Attack", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "f3g5", "d7d5", "e4d5", "f6d5", "d2d4"] },
        { name: "Evans Gambit Accepted: McDonnell", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4", "c5b4", "c2c3", "b4c5", "d2d4", "e5d4", "e1g1", "d7d6", "c3d4", "c5b6"] },
        { name: "Veresov Attack", moves: ["d2d4", "d7d5", "b1c3", "g8f6", "c1g5"] },
        { name: "Veresov: Aggressive f3", moves: ["d2d4", "d7d5", "b1c3", "g8f6", "c1g5", "b8d7", "f2f3"] },
        { name: "Scotch Game: Steinitz Variation", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f3d4", "d8h4", "d4c6", "h4e4", "c1e3"] },
        { name: "Alekhine: Chase Variation", moves: ["e2e4", "g8f6", "e4e5", "f6d5", "c2c4", "d5b6", "c4c5"] },
        { name: "Philidor: Lion Variation", moves: ["e2e4", "d7d6", "d2d4", "g8f6", "b1c3", "e7e5", "g1f3", "b8d7", "f1c4", "f8e7", "e1g1", "e8g8", "d1e2", "c7c6", "a2a4", "d8c7", "f1d1", "h7h6", "c1e3", "e5d4", "e3d4"] },
        { name: "London: f4-f5 Attack", moves: ["d2d4", "g8f6", "g1f3", "e7e6", "c1f4", "c7c5", "e2e3", "b8c6", "c2c3", "d8b6", "d1c2", "d7d5", "b1d2", "f8e7", "h2h3", "e8g8", "f1e2", "c8d7", "e1g1", "a8c8", "f4e5", "f6d7", "e5g3", "f7f5", "f2f4"] },
        { name: "Torre Attack: g4 Storm", moves: ["d2d4", "g8f6", "g1f3", "e7e6", "c1g5", "h7h6", "g5h4", "c7c5", "e2e3", "c5d4", "e3d4", "d8a5", "c2c3", "f8e7", "b1d2", "e8g8", "f1d3", "d7d6", "e1g1", "b8c6", "h2h3", "e6e5", "d3c2", "f8e8", "g2g4"] },
        { name: "Nimzowitsch Defense: Williams Gambit", moves: ["e2e4", "b8c6", "g1f3", "e7e5", "d2d4", "e5d4", "f3d4", "d8h4"] },
        { name: "Owen Defense: Matovinsky Gambit", moves: ["e2e4", "b7b6", "d2d4", "c8b7", "f1d3", "f7f5", "e4f5", "b7g2", "d1h5", "g7g6", "f5g6"] },
        { name: "Scandinavian: Gubinsky-Melts Attack", moves: ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3", "d5d6", "d2d4", "g8f6", "f1c4", "a7a6", "g1f3", "b7b5", "c4b3", "c8b7", "e1g1", "e7e6", "f1e1"] },
        { name: "King's Gambit: Fischer Defense", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "d7d6"] },
        { name: "King's Gambit: Becker Defense", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "h7h6"] },
        { name: "Benko: Fianchetto g4 Storm", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5", "c4b5", "a7a6", "b5a6", "c8a6", "b1c3", "d7d6", "g1f3", "g7g6", "g2g3", "f8g7", "f1g2", "e8g8", "e1g1", "b8d7", "f1e1", "d8a5", "c1f4", "d7b6", "g2g4"] },
        { name: "Ruy Lopez: Schliemann Gambit", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "f7f5"] },
        { name: "Two Knights: Ulvestad Variation", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "f3g5", "d7d5", "e4d5", "b7b5"] },
        { name: "Ponziani Opening with d4 Break", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "c2c3", "g8f6", "d2d4"] },
        { name: "Belgrade Gambit Accepted", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "d2d4", "e5d4", "c3d5", "f6e4", "d1e2", "f7f5"] },
    ];
    console.log('GabiBot: Script loaded, waiting for board...');

    // Debounce helper
    function debounce(fn, wait = 150) {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    // Position cache system 
    const PositionCache = {};

    function getRandomDepth() {
        const minDepth = 5;
        const maxDepth = Math.max(BotState.botPower || 10, minDepth);
        return Math.floor(Math.random() * (maxDepth - minDepth + 1)) + minDepth;
    }
    function getHumanDelay(baseDelay, randomDelay) {
        return baseDelay + Math.floor(Math.random() * randomDelay);
    }

    // Helpers
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    async function waitForElement(selector, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const existing = qs(selector);
            if (existing) return resolve(existing);

            let timeoutId;
            const obs = new MutationObserver(() => {
                const el = qs(selector);
                if (el) {
                    clearTimeout(timeoutId);
                    obs.disconnect();
                    resolve(el);
                }
            });

            obs.observe(document.body, { childList: true, subtree: true });
            timeoutId = setTimeout(() => {
                obs.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Encapsulated state (avoid global pollution)
    const BotState = {
        hackEnabled: 0,
        botPower: 8,
        updateSpeed: 10,
        autoMove: 1,
        autoMoveSpeed: 8,
        randomDelay: 300,
        currentEvaluation: '-',
        bestMove: '-',
        principalVariation: '-',
        statusInfo: 'Ready',
        premoveEnabled: 0,
        premoveMode: 'every',
        premovePieces: { q: 1, r: 1, b: 1, n: 1, k: 1, p: 1 },
        premoveChance: 85,
        autoRematch: 0
    };

    // Global state
    let ui = null;
    let boardCtx = null; // { boardEl, drawingBoard, ctx, evalBarWrap, resizeObserver, cancelPendingOnUserAction, touchOpts, detachListeners }
    let domObserver = null;
    let tickTimer = null;
    let gameStartInterval = null;
    let gameEndInterval = null;

    // Analysis queue
    let analysisQueue = Promise.resolve();
    let currentAnalysisId = 0;

    // Tick state
    let lastFenProcessedMain = '';
    let lastFenProcessedPremove = '';
    let lastFenSeen = '';
    let pendingMoveTimeoutId = null;

    // Premove state
    let lastPremoveFen = '';
    let lastPremoveUci = '';

    // Cached DOM queries (reduce overhead)
    let cachedGame = null;
    let cachedGameTimestamp = 0;
    const GAME_CACHE_TTL = 500; // Cache game object for 500ms

    // Cache board flip state (changes infrequently)
    let cachedBoardFlipped = false;
    let cachedFlipTimestamp = 0;

    // Main init
    async function init() {
        try {
            const board = await waitForElement('.board, chess-board, .board-layout-vertical, .board-layout-horizontal').catch(() => null);
            await buildUI();
            // Initialize opening book
            try { initOpeningBook(); } catch (e) { console.warn('GabiBot: Opening book init failed:', e); }
            attachToBoard(board || qs('chess-board') || qs('.board') || qs('[class*="board"]')); startDomBoardWatcher(); // observe board replacements (SPA safe)
            startAutoWatchers();    // game start/end watchers
            console.log('GabiBot: Initialized.');
        } catch (error) {
            console.error('GabiBot Error:', error);
            alert('GabiBot: Could not find chess board. Please refresh or check console.');
        }
    }

    // Build UI and bind settings
    async function buildUI() {
        // Create menu
        const menuWrap = document.createElement('div');
        menuWrap.id = 'menuWrap';
        const menuWrapStyle = document.createElement('style');

        menuWrap.innerHTML = `
      <div id="topText">
        <a id="modTitle">♟ GabiBot</a>
        <button id="minimizeBtn" title="Minimize (Ctrl+B)">─</button>
      </div>
      <div id="itemsList">
        <div name="enableHack" class="listItem">
          <input class="checkboxMod" type="checkbox">
          <a class="itemDescription">Enable Bot</a>
          <a class="itemState">Off</a>
        </div>
        <div name="autoMove" class="listItem">
          <input class="checkboxMod" type="checkbox">
          <a class="itemDescription">Auto Move</a>
          <a class="itemState">Off</a>
        </div>

        <div class="divider"></div>

        <div name="premoveEnabled" class="listItem">
          <input class="checkboxMod" type="checkbox">
          <a class="itemDescription">Premove System</a>
          <a class="itemState">Off</a>
        </div>
        <div name="premoveMode" class="listItem select-row">
          <a class="itemDescription">Premove Mode</a>
          <select class="selectMod">
            <option value="every">Every next move</option>
            <option value="capture">Only if capture</option>
            <option value="filter">By piece filters</option>
          </select>
        </div>
        <div name="premoveChance" class="listItem info-item">
          <a class="itemDescription">Premove Chance:</a>
          <a class="itemState">0%</a>
        </div>
        <div name="premovePieces" class="listItem">
          <div class="pieceFilters">
            <label class="chip"><input type="checkbox" data-piece="q" checked><span>Q</span></label>
            <label class="chip"><input type="checkbox" data-piece="r" checked><span>R</span></label>
            <label class="chip"><input type="checkbox" data-piece="b" checked><span>B</span></label>
            <label class="chip"><input type="checkbox" data-piece="n" checked><span>N</span></label>
            <label class="chip"><input type="checkbox" data-piece="k" checked><span>K</span></label>
            <label class="chip"><input type="checkbox" data-piece="p" checked><span>P</span></label>
          </div>
          <a class="itemDescription">Pieces</a>
          <a class="itemState">-</a>
        </div>

        <div class="divider"></div>

        <div name="autoRematch" class="listItem">
          <input class="checkboxMod" type="checkbox">
          <a class="itemDescription">Auto Rematch</a>
          <a class="itemState">Off</a>
        </div>

        <div class="divider"></div>

        <div name="botPower" class="listItem">
          <input min="1" max="15" value="10" class="rangeSlider" type="range">
          <a class="itemDescription">Depth</a>
          <a class="itemState">12</a>
        </div>
        <div name="autoMoveSpeed" class="listItem">
          <input min="1" max="10" value="8" class="rangeSlider" type="range">
          <a class="itemDescription">Move Speed</a>
          <a class="itemState">4</a>
        </div>
        <div name="randomDelay" class="listItem">
          <input min="120" max="2000" value="300" class="rangeSlider" type="range">
          <a class="itemDescription">Random Delay (ms)</a>
          <a class="itemState">1000</a>
        </div>
        <div name="updateSpeed" class="listItem">
          <input min="1" max="10" value="8" class="rangeSlider" type="range">
          <a class="itemDescription">Update Rate</a>
          <a class="itemState">8</a>
        </div>

        <div class="divider"></div>

        <div name="currentEvaluation" class="listItem info-item">
          <a class="itemDescription">Eval:</a>
          <a class="itemState eval-value">-</a>
        </div>
        <div name="bestMove" class="listItem info-item">
          <a class="itemDescription">Best:</a>
          <a class="itemState">-</a>
        </div>
        <div name="pvDisplay" class="listItem info-item">
          <a class="itemDescription">PV:</a>
          <a class="itemState pv-text-state" title="Principal Variation">-</a>
        </div>
        <div name="statusInfo" class="listItem info-item">
          <a class="itemDescription">Status:</a>
          <a class="itemState status-text">Ready</a>
        </div>
      </div>
    `;

        menuWrapStyle.innerHTML = `
      #menuWrap {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        border-radius: 8px;
        z-index: 9999999;
        display: grid;
        grid-template-rows: auto 1fr;
        width: 300px; max-height: 550px;
        position: fixed;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        user-select: none;
        top: 20px; right: 20px;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      #menuWrap.minimized { grid-template-rows: auto 0fr; max-height: 50px; }
      #menuWrap.minimized #itemsList { overflow: hidden; opacity: 0; }
      #menuWrap.grabbing { cursor: grabbing !important; opacity: 0.9; }
      .divider { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 10px 0; }
      .pv-text-state { color: #aaa !important; font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eval-value { font-weight: bold; font-size: 14px; }
      .status-text { color: #4CAF50 !important; font-size: 11px; }
      .info-item { opacity: 0.8; margin-bottom: 8px !important; }
      #evaluationBarWrap {
        position: absolute;
        height: 100%;
        width: 20px;
        left: -28px;
        top: 0;
        background: #000;
        z-index: 50;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      #evaluationBarWhite { position: absolute; top: 0; left: 0; right: 0; background: #f0d9b5; transition: height 0.3s ease; }
      #evaluationBarBlack { position: absolute; bottom: 0; left: 0; right: 0; background: #000; transition: height 0.3s ease; }
      #topText { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); cursor: move; }
      #modTitle { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; }
      #minimizeBtn { background: rgba(255, 255, 255, 0.1); border: none; color: #fff; width: 24px; height: 24px;
        border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
      #minimizeBtn:hover { background: rgba(255, 255, 255, 0.2); }
      #itemsList { overflow-y: auto; overflow-x: hidden; padding: 12px 16px; transition: opacity 0.3s ease; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      .listItem { display: flex; align-items: center; margin-bottom: 12px; gap: 8px; }
      .listItem.select-row { display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px; align-items: center; }
      .listItem.select-row .itemDescription { color: rgba(255, 255, 255, 0.85); font-weight: 500; }
      .checkboxMod { appearance: none; width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 4px;
        background: rgba(255, 255, 255, 0.05); cursor: pointer; position: relative; transition: all 0.2s; flex-shrink: 0; }
      .checkboxMod:checked { background: #4CAF50; border-color: #4CAF50; }
      .checkboxMod:checked::after { content: "✓"; position: absolute; color: white; font-size: 12px; top: 50%; left: 50%; transform: translate(-50%, -50%); }
      .rangeSlider { -webkit-appearance: none; flex: 1; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); outline: none; }
      .rangeSlider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #4CAF50; cursor: pointer; transition: transform 0.2s; }
      .rangeSlider::-webkit-slider-thumb:hover { transform: scale(1.2); }
      .itemDescription { color: rgba(255, 255, 255, 0.7); font-size: 12px; flex: 1; }
      .itemState { color: #fff; font-size: 12px; min-width: 35px; text-align: right; font-weight: 500; }
      #arrowCanvas { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; pointer-events: none !important; z-index: 100 !important; }
      .selectMod {
        appearance: none;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        border-radius: 6px;
        padding: 6px 28px 6px 10px;
        flex: 1;
        outline: none;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23fff' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        transition: all 0.2s ease;
      }
      .selectMod:hover { background-color: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); }
      .selectMod:focus { background-color: rgba(255,255,255,0.1); border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2); }
      .selectMod option { background: #1a1a1a; color: #fff; padding: 8px; }
      .pieceFilters { display: flex; flex-wrap: wrap; gap: 6px; }
      .pieceFilters .chip {
        user-select: none; display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 10px; background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; cursor: pointer;
        color: rgba(255,255,255,0.7); transition: all 0.2s ease;
        font-size: 11px; font-weight: 500;
      }
      .pieceFilters .chip:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); }
      .pieceFilters .chip input { appearance: none; width: 14px; height: 14px; border-radius: 3px; border: 2px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); transition: all 0.2s ease; }
      .pieceFilters .chip input:checked { background: #4CAF50; border-color: #4CAF50; }
      .pieceFilters .chip input:checked::after { content: "✓"; color: white; font-size: 9px; display: flex; align-items: center; justify-content: center; height: 100%; }
      .pieceFilters .chip input:checked + span { color: #fff; font-weight: 600; }
    `;

        document.body.appendChild(menuWrap);
        document.body.appendChild(menuWrapStyle);

        // Settings persistence
        const Settings = {
            save: debounce(() => {
                try {
                    const settings = {
                        hackEnabled: BotState.hackEnabled,
                        botPower: BotState.botPower,
                        updateSpeed: BotState.updateSpeed,
                        autoMove: BotState.autoMove,
                        autoMoveSpeed: BotState.autoMoveSpeed,
                        randomDelay: Math.max(RANDOM_JITTER_MIN, BotState.randomDelay),
                        premoveEnabled: BotState.premoveEnabled,
                        premoveMode: BotState.premoveMode,
                        premovePieces: BotState.premovePieces,
                        autoRematch: BotState.autoRematch,
                        menuPosition: { top: menuWrap.style.top, left: menuWrap.style.left }
                    };
                    localStorage.setItem('gabibot_settings', JSON.stringify(settings));
                } catch (e) { console.warn('Failed to save settings:', e); }
            }, 200),
            load() {
                try {
                    const saved = localStorage.getItem('gabibot_settings');
                    if (!saved) return null;
                    const s = JSON.parse(saved);
                    BotState.hackEnabled = s.hackEnabled ?? 0;
                    BotState.botPower = s.botPower ?? 8;
                    BotState.updateSpeed = s.updateSpeed ?? 10;
                    BotState.autoMove = s.autoMove ?? 1;
                    BotState.autoMoveSpeed = s.autoMoveSpeed ?? 8;
                    BotState.randomDelay = Math.max(RANDOM_JITTER_MIN, s.randomDelay ?? 300);
                    BotState.premoveEnabled = s.premoveEnabled ?? 0;
                    BotState.premoveMode = s.premoveMode ?? 'every';
                    BotState.premovePieces = s.premovePieces ?? { q: 1, r: 1, b: 1, n: 1, k: 1, p: 1 };
                    BotState.autoRematch = s.autoRematch ?? 0;
                    return s;
                } catch (e) { console.error('Failed to load settings:', e); return null; }
            }
        };
        const saved = Settings.load();
        if (saved?.menuPosition) {
            menuWrap.style.top = saved.menuPosition.top || '20px';
            menuWrap.style.left = saved.menuPosition.left || '';
            menuWrap.style.right = saved.menuPosition.left ? 'auto' : '20px';
        }

        // Control binding helpers
        const getElementByName = (name, el) => el.querySelector(`[name="${name}"]`);
        const getInputElement = (el) => el.children[0];
        const getStateElement = (el) => el.children[el.children.length - 1];

        function bindControl(name, type, variable) {
            const modElement = getElementByName(name, menuWrap);
            if (!modElement) return;
            const modState = getStateElement(modElement);
            const modInput = getInputElement(modElement);
            const key = variable.replace('BotState.', '');
            if (type === 'checkbox') {
                modInput.checked = !!BotState[key];
                modState.textContent = BotState[key] ? 'On' : 'Off';
                modInput.addEventListener('input', () => {
                    BotState[key] = modInput.checked ? 1 : 0;
                    modState.textContent = BotState[key] ? 'On' : 'Off';
                    Settings.save();
                });
            } else if (type === 'range') {
                modInput.value = BotState[key];
                modState.textContent = BotState[key];
                modInput.addEventListener('input', () => {
                    let value = parseInt(modInput.value, 10);
                    const min = parseInt(modInput.min, 10);
                    const max = parseInt(modInput.max, 10);
                    value = Math.max(min, Math.min(max, value));
                    BotState[key] = value;
                    modInput.value = value;
                    modState.textContent = value;
                    Settings.save();
                });
            }
        }
        function bindSelect(name, variable) {
            const el = getElementByName(name, menuWrap);
            if (!el) return;
            const select = el.querySelector('select');
            const key = variable.replace('BotState.', '');
            select.value = BotState[key];
            select.addEventListener('change', () => {
                BotState[key] = select.value;
                refreshPremoveUIVisibility();
                Settings.save();
            });
        }
        function bindPieceFilters() {
            const el = getElementByName('premovePieces', menuWrap);
            if (!el) return;
            const checks = qsa('.pieceFilters input[type="checkbox"]', el);
            checks.forEach(chk => {
                const p = String(chk.dataset.piece || '').toLowerCase();
                chk.checked = !!BotState.premovePieces[p];
            });
            checks.forEach(chk => {
                chk.addEventListener('input', () => {
                    const p = String(chk.dataset.piece || '').toLowerCase();
                    BotState.premovePieces[p] = chk.checked ? 1 : 0;
                    Settings.save();
                });
            });
        }
        function refreshPremoveUIVisibility() {
            const row = getElementByName('premovePieces', menuWrap);
            if (row) row.style.display = (BotState.premoveMode === 'filter') ? 'flex' : 'none';
        }

        bindControl('enableHack', 'checkbox', 'BotState.hackEnabled');
        bindControl('autoMove', 'checkbox', 'BotState.autoMove');
        bindControl('botPower', 'range', 'BotState.botPower');
        bindControl('autoMoveSpeed', 'range', 'BotState.autoMoveSpeed');
        bindControl('updateSpeed', 'range', 'BotState.updateSpeed');
        bindControl('randomDelay', 'range', 'BotState.randomDelay');

        bindControl('premoveEnabled', 'checkbox', 'BotState.premoveEnabled');
        bindSelect('premoveMode', 'BotState.premoveMode');
        bindPieceFilters();
        refreshPremoveUIVisibility();

        bindControl('autoRematch', 'checkbox', 'BotState.autoRematch');

        // Drag/move panel
        makePanelDraggable(menuWrap);

        // Minimize
        document.getElementById('minimizeBtn').addEventListener('click', () => menuWrap.classList.toggle('minimized'));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'b' && e.ctrlKey) {
                e.preventDefault();
                menuWrap.classList.toggle('minimized');
            }
        });

        ui = {
            menuWrap,
            setText(name, value, title) {
                const el = getElementByName(name, menuWrap);
                if (!el) return;
                const state = getStateElement(el);
                state.textContent = value ?? '-';
                if (title) state.title = title;
            },
            updateDisplay(playingAs) {
                this.setText('currentEvaluation', BotState.currentEvaluation);
                this.setText('bestMove', BotState.bestMove);
                this.setText('pvDisplay', BotState.principalVariation, BotState.principalVariation);
                this.setText('statusInfo', BotState.statusInfo);
                updateEvaluationBar(BotState.currentEvaluation, playingAs);
            },
            Settings
        };

        // React to enable/disable or speed changes
        let lastHackEnabled = BotState.hackEnabled;
        let lastUpdateSpeed = BotState.updateSpeed;
        let lastPremoveEnabled = BotState.premoveEnabled;

        setInterval(() => {
            if (BotState.hackEnabled !== lastHackEnabled) {
                lastHackEnabled = BotState.hackEnabled;
                if (BotState.hackEnabled) {
                    BotState.statusInfo = 'Ready';
                    ui.updateDisplay(pa());
                    startTickLoop();
                } else {
                    stopTickLoop();
                    Object.keys(PositionCache).forEach(key => delete PositionCache[key]);
                    clearArrows();
                    cancelPendingMove();
                    BotState.statusInfo = 'Bot disabled';
                    BotState.currentEvaluation = '-';
                    BotState.bestMove = '-';
                    ui.updateDisplay(pa());
                }
                ui.Settings.save();
            }
            if (BotState.updateSpeed !== lastUpdateSpeed) {
                lastUpdateSpeed = BotState.updateSpeed;
                if (BotState.hackEnabled) startTickLoop();
            }
            if (BotState.premoveEnabled !== lastPremoveEnabled) {
                lastPremoveEnabled = BotState.premoveEnabled;
                if (BotState.hackEnabled) startTickLoop();
            }
        }, 200);
    }

    // Board attach/detach
    function attachToBoard(boardEl) {
        // Invalidate cached game when board changes
        cachedGame = null;
        cachedGameTimestamp = 0;

        detachFromBoard(); // cleanup any previous

        if (!boardEl) {
            console.warn('GabiBot: No board element to attach.');
            return;
        }
        // Ensure relative for overlay
        if (getComputedStyle(boardEl).position === 'static') boardEl.style.position = 'relative';

        const drawingBoard = document.createElement('canvas');
        drawingBoard.id = 'arrowCanvas';
        drawingBoard.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
        const ctx = drawingBoard.getContext('2d');

        const evalBarWrap = document.createElement('div');
        evalBarWrap.id = 'evaluationBarWrap';
        const whiteBar = document.createElement('div');
        whiteBar.id = 'evaluationBarWhite';
        const blackBar = document.createElement('div');
        blackBar.id = 'evaluationBarBlack';
        evalBarWrap.appendChild(whiteBar);
        evalBarWrap.appendChild(blackBar);

        boardEl.appendChild(evalBarWrap);
        boardEl.appendChild(drawingBoard);

        const resizeCanvas = () => {
            const rect = boardEl.getBoundingClientRect();
            drawingBoard.width = rect.width;
            drawingBoard.height = rect.height;
        };
        resizeCanvas();
        const ro = new ResizeObserver(resizeCanvas);
        ro.observe(boardEl);

        const cancelPendingOnUserAction = () => {
            if (pendingMoveTimeoutId) {
                clearTimeout(pendingMoveTimeoutId);
                pendingMoveTimeoutId = null;
                BotState.statusInfo = 'Manual move in progress...';
                ui.updateDisplay(pa());
            }
        };
        const touchOpts = { passive: true, capture: true };
        boardEl.addEventListener('mousedown', cancelPendingOnUserAction, true);
        boardEl.addEventListener('touchstart', cancelPendingOnUserAction, touchOpts);

        boardCtx = {
            boardEl,
            drawingBoard,
            ctx,
            evalBarWrap,
            resizeObserver: ro,
            cancelPendingOnUserAction,
            touchOpts,
            detachListeners() {
                try { boardEl.removeEventListener('mousedown', cancelPendingOnUserAction, true); } catch { }
                try { boardEl.removeEventListener('touchstart', cancelPendingOnUserAction, touchOpts); } catch { }
                try { ro.disconnect(); } catch { }
                try { drawingBoard.remove(); } catch { }
                try { evalBarWrap.remove(); } catch { }
            }
        };

        // Show ready
        ui.updateDisplay(pa());
        if (BotState.hackEnabled) startTickLoop();
    }

    function detachFromBoard() {
        if (!boardCtx) return;
        try { boardCtx.detachListeners(); } catch { }
        boardCtx = null;
    }

    function startDomBoardWatcher() {
        if (domObserver) try { domObserver.disconnect(); } catch { }
        domObserver = new MutationObserver(debounce(() => {
            // Look for a current board element
            const newBoard = qs('chess-board') || qs('.board') || qs('[class*="board"]');
            if (!newBoard) return;
            if (!boardCtx || boardCtx.boardEl !== newBoard) {
                console.log('GabiBot: Board element changed, re-attaching.');
                attachToBoard(newBoard);
            }
        }, 200));
        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Game helpers
    const getBoard = () => boardCtx?.boardEl || qs('chess-board') || qs('.board');
    const getGame = () => {
        const now = Date.now();
        if (cachedGame && (now - cachedGameTimestamp) < GAME_CACHE_TTL) {
            return cachedGame;
        }
        cachedGame = getBoard()?.game || null;
        cachedGameTimestamp = now;
        return cachedGame;
    };
    const getFen = (g) => { try { return g?.getFEN ? g.getFEN() : null; } catch { return null; } };
    const getPlayerColor = (g) => { try { const v = g?.getPlayingAs?.(); return v === 2 ? 'b' : 'w'; } catch { return 'w'; } };
    const getSideToMove = (g) => { const fen = getFen(g); return fen ? (fen.split(' ')[1] || null) : null; };
    const isPlayersTurn = (g) => { const me = getPlayerColor(g), stm = getSideToMove(g); return !!me && !!stm && me === stm; };
    const pa = () => (getGame()?.getPlayingAs ? getGame().getPlayingAs() : 1);

    function isBoardFlipped() {
        const now = Date.now();
        if ((now - cachedFlipTimestamp) < 1000) return cachedBoardFlipped;

        const el = getBoard();
        let flipped = false;

        try {
            const attr = el?.getAttribute?.('orientation');
            if (attr === 'black') flipped = true;
            else if (attr === 'white') flipped = false;
            else if (el?.classList?.contains('flipped')) flipped = true;
            else if (getGame()?.getPlayingAs?.() === 2) flipped = true;
        } catch { }

        cachedBoardFlipped = flipped;
        cachedFlipTimestamp = now;
        return flipped;
    }

    // Arrow drawing
    function clearArrows() {
        if (!boardCtx) return;
        const { drawingBoard, ctx } = boardCtx;
        ctx.clearRect(0, 0, drawingBoard.width, drawingBoard.height);
    }
    function drawArrow(uciFrom, uciTo, color, thickness) {
        if (!boardCtx || !uciFrom || !uciTo || uciFrom.length < 2 || uciTo.length < 2) return;
        const { drawingBoard, ctx } = boardCtx;

        const a = getSquareCenterCanvasXY(uciFrom);
        const b = getSquareCenterCanvasXY(uciTo);
        if (!a || !b) return;

        const size = Math.min(drawingBoard.width, drawingBoard.height);
        const tile = size / 8;

        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineWidth = thickness; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();

        ctx.beginPath(); ctx.arc(a.x, a.y, tile / 7, 0, 2 * Math.PI);
        ctx.fillStyle = color.replace('0.7', '0.3'); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

        ctx.beginPath(); ctx.arc(b.x, b.y, tile / 5, 0, 2 * Math.PI);
        ctx.fillStyle = color.replace('0.7', '0.5'); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    }

    // Square to client XY
    function getSquareCenterClientXY(square) {
        if (!boardCtx || !square || square.length < 2) return null;
        const file = 'abcdefgh'.indexOf(square[0]);
        const rank = parseInt(square[1], 10);
        if (file < 0 || isNaN(rank)) return null;
        const el = getBoard();
        const rect = el.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        const tile = size / 8;
        const offsetX = rect.left + (rect.width - size) / 2;
        const offsetY = rect.top + (rect.height - size) / 2;
        let x = file, y = 8 - rank;
        if (isBoardFlipped()) { x = 7 - x; y = 7 - y; }
        return { x: offsetX + (x + 0.5) * tile, y: offsetY + (y + 0.5) * tile };
    }

    function getSquareCenterCanvasXY(square) {
        if (!boardCtx || !square || square.length < 2) return null;
        const p = getSquareCenterClientXY(square);
        if (!p) return null;
        const rect = boardCtx.boardEl.getBoundingClientRect();
        return { x: p.x - rect.left, y: p.y - rect.top };
    }

    // Minimal event sequences (fix: reduce excessive event firing)
    function dispatchPointerOrMouse(el, type, opts, usePointer) {
        if (!el) return;
        if (usePointer) {
            try { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, ...opts })); return; } catch { /* fallthrough */ }
        }
        el.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), { bubbles: true, cancelable: true, composed: true, ...opts }));
    }

    function getTargetAt(x, y) {
        return document.elementFromPoint(x, y) || getBoard() || document.body;
    }

    async function simulateClickMove(from, to) {
        const a = getSquareCenterClientXY(from), b = getSquareCenterClientXY(to);
        if (!a || !b) return false;
        const usePointer = !!window.PointerEvent;
        const startEl = getTargetAt(a.x, a.y);
        const endEl = getTargetAt(b.x, b.y);

        const downStart = { clientX: a.x, clientY: a.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 };
        const upStart = { clientX: a.x, clientY: a.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 };
        const downEnd = { clientX: b.x, clientY: b.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 };
        const upEnd = { clientX: b.x, clientY: b.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 };

        // ⚡ Reduced delays for bullet
        dispatchPointerOrMouse(startEl, usePointer ? 'pointerdown' : 'mousedown', downStart, usePointer);
        await sleep(10); // ⚡ 20 → 10ms
        dispatchPointerOrMouse(startEl, usePointer ? 'pointerup' : 'mouseup', upStart, usePointer);
        startEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: a.x, clientY: a.y }));

        await sleep(20); // ⚡ 40 → 20ms

        dispatchPointerOrMouse(endEl, usePointer ? 'pointerdown' : 'mousedown', downEnd, usePointer);
        await sleep(10); // ⚡ 20 → 10ms
        dispatchPointerOrMouse(endEl, usePointer ? 'pointerup' : 'mouseup', upEnd, usePointer);
        endEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: b.x, clientY: b.y }));

        return true;
    }
    async function simulateDragMove(from, to) {
        const a = getSquareCenterClientXY(from), b = getSquareCenterClientXY(to);
        if (!a || !b) return false;
        const usePointer = !!window.PointerEvent;
        const startEl = getTargetAt(a.x, a.y);
        const endEl = getTargetAt(b.x, b.y);
        const down = { clientX: a.x, clientY: a.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 };
        const up = { clientX: b.x, clientY: b.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 };

        dispatchPointerOrMouse(startEl, usePointer ? 'pointerdown' : 'mousedown', down, usePointer);
        // Fewer move steps to avoid excessive firing
        const steps = 3;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const mx = a.x + (b.x - a.x) * t;
            const my = a.y + (b.y - a.y) * t;
            dispatchPointerOrMouse(endEl, usePointer ? 'pointermove' : 'mousemove', { clientX: mx, clientY: my, buttons: 1 }, usePointer);
            await sleep(12);
        }
        dispatchPointerOrMouse(endEl, usePointer ? 'pointerup' : 'mouseup', up, usePointer);
        return true;
    }

    async function waitForFenChange(prevFen, timeout = 1000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const g = getGame();
            const fen = g?.getFEN ? g.getFEN() : null;
            if (fen && fen !== prevFen) return true;
            await sleep(40);
        }
        return false;
    }

    // Promotion handling
    async function maybeSelectPromotion(prefer = 'q') {
        const preferList = (prefer ? [prefer] : ['q', 'r', 'b', 'n']).map(c => c.toLowerCase());
        const getCandidates = () => qsa('[data-test-element*="promotion"], [class*="promotion"] [class*="piece"], [class*="promotion"] button, .promotion-piece, .promotion-card');
        const tryClick = (el) => {
            try {
                el.click?.();
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            } catch { return false; }
        };
        const start = Date.now();
        while (Date.now() - start < 1000) {
            const nodes = getCandidates();
            if (nodes.length) {
                for (const pref of preferList) {
                    const match = nodes.find(n =>
                        (n.dataset?.piece?.toLowerCase?.() || '') === pref ||
                        (n.getAttribute?.('data-piece') || '').toLowerCase() === pref ||
                        (n.getAttribute?.('aria-label') || '').toLowerCase().includes(pref) ||
                        (n.className || '').toLowerCase().includes(pref) ||
                        (n.textContent || '').toLowerCase().includes(pref)
                    );
                    if (match && tryClick(match)) return true;
                }
                if (tryClick(nodes[0])) return true;
            }
            await sleep(60);
        }
        return false;
    }

    function cancelPendingMove() {
        if (pendingMoveTimeoutId) {
            clearTimeout(pendingMoveTimeoutId);
            pendingMoveTimeoutId = null;
        }
    }

    async function makeMove(from, to, expectedFen, promotionChar) {
        const game = getGame();
        if (!game || !BotState.autoMove) return false;

        const beforeFen = getFen(game);
        if (!beforeFen || beforeFen !== expectedFen || !isPlayersTurn(game)) return false;

        await simulateClickMove(from, to);
        if (promotionChar) await maybeSelectPromotion(String(promotionChar).toLowerCase());

        // Only treat as success if the real board FEN changed
        const changed = await waitForFenChange(beforeFen, 1000);
        return !!changed;
    }

    // Engine integration
    function scoreFrom(obj) {
        if (!obj) return {};
        if (typeof obj === 'object') {
            if ('mate' in obj && obj.mate !== 0) return { mate: parseInt(obj.mate, 10) };
            if ('cp' in obj) return { cp: parseInt(obj.cp, 10) };
        }
        if (typeof obj === 'string') {
            if (obj.toUpperCase().includes('M')) {
                const m = parseInt(obj.replace(/[^-0-9]/g, ''), 10);
                if (!isNaN(m)) return { mate: m };
            }
            const cpFloat = parseFloat(obj);
            if (!isNaN(cpFloat)) return { cp: Math.round(cpFloat * 100) };
        }
        if (typeof obj === 'number') return { cp: Math.round(obj * 100) };
        return {};
    }
    function scoreToDisplay(score) {
        if (score && typeof score.mate === 'number' && score.mate !== 0) return `M${score.mate}`;
        if (score && typeof score.cp === 'number') return (score.cp / 100).toFixed(2);
        return '-';
    }
    function scoreNumeric(s) {
        if (!s) return -Infinity;
        if (typeof s.mate === 'number') return s.mate > 0 ? 100000 - s.mate : -100000 - s.mate;
        if (typeof s.cp === 'number') return s.cp;
        return -Infinity;
    }

    async function fetchEngineData(fen, depth, signal) {
        const startTime = performance.now();
        console.log(`GabiBot: 📡 API request STARTED for FEN: ${fen.substring(0, 20)}... | Depth: ${depth}`);

        const call = async (params) => {
            const url = `${API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}&${params}`;
            const ctrl = new AbortController();
            const onAbort = () => ctrl.abort('external-abort');
            if (signal?.aborted) {
                ctrl.abort('already-aborted');
                throw new DOMException('Aborted', 'AbortError');
            }
            signal?.addEventListener('abort', onAbort, { once: true });
            const to = setTimeout(() => ctrl.abort('timeout'), ANALYZE_TIMEOUT_MS);
            try {
                const res = await fetch(url, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    signal: ctrl.signal
                });
                const endTime = performance.now();
                const duration = endTime - startTime;
                if (!res.ok) {
                    console.warn(`GabiBot: ❌ API failed (${res.status}) after ${duration.toFixed(0)}ms`);
                    throw new Error(`API error ${res.status}`);
                }
                const response = await res.json();
                if (response.success === false) {
                    const errorMsg = typeof response.data === 'string' ? response.data : 'API success=false';
                    console.warn(`GabiBot: ❌ API error after ${duration.toFixed(0)}ms: ${errorMsg}`);
                    throw new Error(errorMsg);
                }
                console.log(`GabiBot: ✅ API success in ${duration.toFixed(0)}ms | FEN: ${fen.substring(0, 20)}...`);
                // Extract the actual engine data for simpler consumption
                return response.data || {};
            } finally {
                clearTimeout(to);
                signal?.removeEventListener('abort', onAbort);
            }
        };
        try { return await call(`multipv=${MULTIPV}&mode=analysis`); }
        catch {
            try { return await call(`multipv=${MULTIPV}&mode=bestmove`); }
            catch { return await call('mode=bestmove'); }
        }
    }

    async function fetchEngineDataWithRetry(fen, depth, signal, maxRetries = 1) {
        // Simple cache check
        if (PositionCache[fen]) {
            console.log('GabiBot: 🗃️ Using cached analysis');
            return PositionCache[fen];
        }

        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (signal?.aborted || !BotState.hackEnabled) {
                console.log('GabiBot: ⏹️ Analysis aborted before attempt', attempt + 1);
                throw new DOMException('Aborted', 'AbortError');
            }

            if (attempt > 0) {
                const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`GabiBot: 🔁 Retry attempt #${attempt} for FEN: ${fen.substring(0, 20)}... (backoff: ${backoff}ms)`);
                await sleep(backoff);
            }

            try {
                const data = await fetchEngineData(fen, depth, signal);
                PositionCache[fen] = data;
                if (attempt > 0) {
                    console.log(`GabiBot: 🎯 Retry succeeded on attempt #${attempt + 1}`);
                }
                return data;
            } catch (error) {
                lastError = error;
                console.warn(`GabiBot: ⚠️ Attempt #${attempt + 1} failed:`, error.message || error);
                if (attempt >= maxRetries) break;
            }
        }
        console.error(`GabiBot: 💥 All ${maxRetries + 1} attempts failed for FEN: ${fen.substring(0, 20)}...`);
        throw lastError;
    }

    function parseBestLine(data) {
        const lines = [];
        const pushLine = (uci, pv, score) => {
            if (!uci || uci.length < 4) return;
            lines.push({ uci: uci.trim(), pv: (pv || '').trim(), score: score || {} });
        };
        const addFromArray = (arr) => arr.forEach(item => {
            const pv = item.pv || item.line || item.moves || '';
            const uci = item.uci || (pv ? pv.split(' ')[0] : '');
            const score = scoreFrom(item.score || item.evaluation || item.eval);
            pushLine(uci, pv, score);
        });

        if (Array.isArray(data.analysis)) addFromArray(data.analysis);
        else if (Array.isArray(data.lines)) addFromArray(data.lines);
        else if (Array.isArray(data.pvs)) addFromArray(data.pvs);

        if (!lines.length && (data.bestmove || data.best_move)) {
            const bestmoveText = data.bestmove || data.best_move;
            if (typeof bestmoveText === 'string') {
                const parts = bestmoveText.split(' ');
                let uci = parts.length > 1 ? parts[1] : parts[0];
                if (uci === 'bestmove' && parts[1]) uci = parts[1];
                const pv = data.continuation || data.pv || data.line || uci;

                // Handle API v2 fields: eval (float) and mate (integer or null)
                let scoreObj = {};
                if (data.mate !== undefined && data.mate !== null) {
                    scoreObj = { mate: parseInt(data.mate, 10) };
                } else if (data.eval !== undefined && data.eval !== null) {
                    scoreObj = { cp: Math.round(parseFloat(data.eval) * 100) };
                } else {
                    scoreObj = data.evaluation || data.score || {};
                }
                const score = scoreFrom(scoreObj);
                pushLine(uci, pv, score);
            }
        }
        lines.sort((a, b) => scoreNumeric(b.score) - scoreNumeric(a.score));
        return lines[0] || null;
    }

    function updateEvaluationBar(evaluation, playingAs) {
        if (!boardCtx) return;
        const whiteBar = boardCtx.evalBarWrap.querySelector('#evaluationBarWhite');
        const blackBar = boardCtx.evalBarWrap.querySelector('#evaluationBarBlack');
        if (!whiteBar || !blackBar) return;

        let score = 0;
        if (typeof evaluation === 'string') {
            if (evaluation === '-' || evaluation === 'Error') {
                // Neutral position when no eval
                whiteBar.style.height = '50%';
                blackBar.style.height = '50%';
                return;
            }

            if (evaluation.includes('M')) {
                const m = parseInt(evaluation.replace('M', '').replace('+', ''), 10);
                // Mate scores: positive = White mating, negative = Black mating
                score = m > 0 ? 10 : -10; // Cap at ±10 for mate
            } else {
                score = parseFloat(evaluation);
            }
        } else {
            score = parseFloat(evaluation);
        }

        if (isNaN(score)) {
            whiteBar.style.height = '50%';
            blackBar.style.height = '50%';
            return;
        }

        // Clamp score for visual representation
        const maxScore = 5;
        const clampedScore = Math.max(-maxScore, Math.min(maxScore, score));

        // Calculate percentages (eval is ALWAYS from White's perspective)
        // +score = White winning, -score = Black winning
        const whitePercent = 50 + (clampedScore / maxScore) * 50;
        const blackPercent = 100 - whitePercent;

        // NO FLIPPING! The evaluation meaning stays constant.
        // White winning = more white, regardless of board orientation
        whiteBar.style.height = `${whitePercent}%`;
        blackBar.style.height = `${blackPercent}%`;

        const ourColor = getPlayerColor(getGame());
        const ourEval = ourColor === 'w' ? score : -score;

        if (ourEval < -2) {
            boardCtx.evalBarWrap.style.borderColor = 'rgba(255, 100, 100, 0.5)';
        } else if (ourEval > 2) {
            boardCtx.evalBarWrap.style.borderColor = 'rgba(100, 255, 100, 0.5)';
        } else {
            boardCtx.evalBarWrap.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
    }

    // FEN helpers for piece info
    function fenCharAtSquare(fen, square) {
        if (!fen || !square) return null;
        const placement = fen.split(' ')[0];
        const ranks = placement.split('/');
        const file = 'abcdefgh'.indexOf(square[0]);
        const rankNum = parseInt(square[1], 10);
        if (file < 0 || rankNum < 1 || rankNum > 8 || ranks.length !== 8) return null;
        const row = 8 - rankNum;
        const rowStr = ranks[row];
        let col = 0;
        for (const ch of rowStr) {
            if (/\d/.test(ch)) {
                col += parseInt(ch, 10);
                if (col > file) return null;
            } else {
                if (col === file) return ch;
                col++;
            }
        }
        return null;
    }
    function pieceFromFenChar(ch) {
        if (!ch) return null;
        const isUpper = ch === ch.toUpperCase();
        return { color: isUpper ? 'w' : 'b', type: ch.toLowerCase() };
    }

    // ===== Transposition-safe placement helpers =====
    function fenPlacementToBoard(placement) {
        const ranks = placement.split('/');
        const board = Array.from({ length: 8 }, () => Array(8).fill(null));
        for (let r = 0; r < 8; r++) {
            let f = 0;
            for (const ch of ranks[r]) {
                if (/\d/.test(ch)) {
                    f += parseInt(ch, 10);
                } else {
                    board[r][f] = ch;
                    f++;
                }
            }
        }
        return board;
    }

    function boardToPlacement(board) {
        const ranks = [];
        for (let r = 0; r < 8; r++) {
            let row = '';
            let empties = 0;
            for (let f = 0; f < 8; f++) {
                const ch = board[r][f];
                if (!ch) {
                    empties++;
                } else {
                    if (empties > 0) {
                        row += String(empties);
                        empties = 0;
                    }
                    row += ch;
                }
            }
            if (empties > 0) row += String(empties);
            ranks.push(row);
        }
        return ranks.join('/');
    }

    function sqToIdx(sq) {
        const file = 'abcdefgh'.indexOf(sq[0]);
        const rank = parseInt(sq[1], 10);
        return { r: 8 - rank, f: file }; // r: 0 (rank 8) -> 7 (rank 1), f: 0..7
    }

    // En passant detection for premove capture mode
    function isEnPassantCapture(fen, from, to, ourColor) {
        const parts = fen.split(' ');
        const ep = parts[3];
        const fromPiece = pieceFromFenChar(fenCharAtSquare(fen, from));
        if (!fromPiece || fromPiece.color !== ourColor || fromPiece.type !== 'p') return false;
        return ep && ep !== '-' && to === ep && from[0] !== to[0];
    }

    // Determine our planned move from PV given side-to-move
    function getOurMoveFromPV(pv, ourColor, sideToMove) {
        if (!pv) return null;
        const moves = pv.trim().split(/\s+/).filter(Boolean);
        if (!moves.length) return null;
        const idx = (sideToMove === ourColor) ? 0 : 1;
        return moves[idx] || null;
    }

    // Execute best move (draw + optional auto-move)
    async function executeAction(selectedUci, analysisFen) {
        try {
            clearArrows();
            if (!selectedUci || selectedUci.length < 4) return;
            const from = selectedUci.substring(0, 2);
            const to = selectedUci.substring(2, 4);
            const promotionChar = selectedUci.length >= 5 ? selectedUci[4] : null;

            drawArrow(from, to, 'rgba(100, 255, 100, 0.7)', 4);

            if (BotState.hackEnabled && BotState.autoMove) {
                const game = getGame();
                if (!game || !isPlayersTurn(game)) {
                    BotState.statusInfo = 'Waiting for opponent...'; ui.updateDisplay(pa()); return;
                }

                cancelPendingMove();

                const baseDelay = Math.max(0, AUTO_MOVE_BASE - BotState.autoMoveSpeed * AUTO_MOVE_STEP);
                const totalDelay = getHumanDelay(baseDelay, BotState.randomDelay);

                console.log(`GabiBot: Delay ${totalDelay}ms`);
                BotState.statusInfo = `Moving in ${(totalDelay / 1000).toFixed(1)}s`; ui.updateDisplay(pa());

                pendingMoveTimeoutId = setTimeout(async () => {
                    const g = getGame(); if (!g) return;
                    if (!isPlayersTurn(g)) { BotState.statusInfo = 'Move canceled (not our turn)'; ui.updateDisplay(pa()); return; }
                    if (getFen(g) !== analysisFen) { BotState.statusInfo = 'Move canceled (position changed)'; ui.updateDisplay(pa()); return; }

                    BotState.statusInfo = 'Making move...'; ui.updateDisplay(pa());
                    const success = await makeMove(from, to, analysisFen, promotionChar);
                    BotState.statusInfo = success ? '✓ Move made!' : '❌ Move failed';
                    ui.updateDisplay(pa());

                    //  Retry on failure
                    if (!success) {
                        setTimeout(() => {
                            if (BotState.hackEnabled && isPlayersTurn(getGame())) {
                                lastFenProcessedMain = '';
                                tick();
                            }
                        }, 800);
                    }

                }, totalDelay);
            } else {
                BotState.statusInfo = 'Ready (manual)'; ui.updateDisplay(pa());
            }
        } catch (error) {
            console.error('Error in executeAction:', error);
        }
    }

    // Single queued analysis runner for both main and premove
    function scheduleAnalysis(kind, fen) {
        const analysisId = ++currentAnalysisId;
        analysisQueue = analysisQueue.then(async () => {
            if (analysisId !== currentAnalysisId) return;
            if (!BotState.hackEnabled) return;

            const game = getGame();
            if (!game) return;

            if (kind === 'main') {
                if (lastFenProcessedMain === fen) return;
            } else {
                if (lastFenProcessedPremove === fen) return;
            }

            const ctrl = new AbortController(); // Local controller per analysis

            // ── Opening book attempt (before engine) ────────────────────────────────
            if (kind === 'main') {
                try {
                    const ourColor = getPlayerColor(game);
                    if (isPlayersTurn(game)) {
                        const book = (typeof findBookMoveForFen === 'function') ? findBookMoveForFen(fen, ourColor) : null;

                        // Quick plausibility validator (esp. castling rules)
                        const isBookMovePlausible = (fenStr, uci, color) => {
                            if (!uci || uci.length < 4) return false;
                            const from = uci.slice(0, 2);
                            const to = uci.slice(2, 4);
                            const chFrom = fenCharAtSquare(fenStr, from);
                            const fromP = pieceFromFenChar(chFrom);
                            if (!fromP || fromP.color !== color) return false;
                            const chTo = fenCharAtSquare(fenStr, to);
                            const toP = pieceFromFenChar(chTo);
                            if (toP && toP.color === color) return false;

                            // Castling checks
                            const isCastle = (uci === 'e1g1' || uci === 'e1c1' || uci === 'e8g8' || uci === 'e8c8');
                            if (!isCastle) return true;

                            const parts = fenStr.split(' ');
                            const rights = parts[2] || '-';
                            const opp = color === 'w' ? 'b' : 'w';

                            if (uci === 'e1g1') { // White O-O
                                if (!rights.includes('K')) return false;
                                if (fenCharAtSquare(fenStr, 'f1') || fenCharAtSquare(fenStr, 'g1')) return false;
                                if (isSquareAttackedBy(fenStr, 'e1', opp) || isSquareAttackedBy(fenStr, 'f1', opp) || isSquareAttackedBy(fenStr, 'g1', opp)) return false;
                                return true;
                            }
                            if (uci === 'e1c1') { // White O-O-O
                                if (!rights.includes('Q')) return false;
                                if (fenCharAtSquare(fenStr, 'd1') || fenCharAtSquare(fenStr, 'c1') || fenCharAtSquare(fenStr, 'b1')) return false;
                                if (isSquareAttackedBy(fenStr, 'e1', opp) || isSquareAttackedBy(fenStr, 'd1', opp) || isSquareAttackedBy(fenStr, 'c1', opp)) return false;
                                return true;
                            }
                            if (uci === 'e8g8') { // Black O-O
                                if (!rights.includes('k')) return false;
                                if (fenCharAtSquare(fenStr, 'f8') || fenCharAtSquare(fenStr, 'g8')) return false;
                                if (isSquareAttackedBy(fenStr, 'e8', opp) || isSquareAttackedBy(fenStr, 'f8', opp) || isSquareAttackedBy(fenStr, 'g8', opp)) return false;
                                return true;
                            }
                            if (uci === 'e8c8') { // Black O-O-O
                                if (!rights.includes('q')) return false;
                                if (fenCharAtSquare(fenStr, 'd8') || fenCharAtSquare(fenStr, 'c8') || fenCharAtSquare(fenStr, 'b8')) return false;
                                if (isSquareAttackedBy(fenStr, 'e8', opp) || isSquareAttackedBy(fenStr, 'd8', opp) || isSquareAttackedBy(fenStr, 'c8', opp)) return false;
                                return true;
                            }
                            return true;
                        };

                        if (book && book.nextUci && isBookMovePlausible(fen, book.nextUci, ourColor)) {
                            const pvHint = `📘 ${book.name} • ${book.pv}`; // subtle book hint in PV
                            BotState.bestMove = book.nextUci;
                            BotState.currentEvaluation = '-';
                            BotState.principalVariation = pvHint;
                            BotState.statusInfo = 'Book move';
                            ui.updateDisplay(pa());

                            await executeAction(book.nextUci, fen);
                            lastFenProcessedMain = fen;
                            if (typeof OpeningBookState !== 'undefined') OpeningBookState.lastUsed = 1;
                            return; // Do not call engine; book used
                        } else {
                            if (typeof OpeningBookState !== 'undefined') OpeningBookState.lastUsed = 0;
                        }
                    }
                } catch (e) {
                    console.warn('GabiBot: Opening book lookup failed:', e);
                }
            }

            try {
                BotState.statusInfo = kind === 'main' ? '🔄 Analyzing...' : '🔄 Analyzing (premove)...';
                ui.updateDisplay(pa());

                const randomDepth = getRandomDepth();

                // Check if newer analysis superseded this one
                if (analysisId !== currentAnalysisId) {
                    ctrl.abort('superseded');
                    return;
                }

                const data = await fetchEngineDataWithRetry(fen, randomDepth, ctrl.signal);

                // Double-check still current after async operation
                if (analysisId !== currentAnalysisId) return;

                const best = parseBestLine(data);

                if (kind === 'main') {
                    BotState.bestMove = best?.uci || '-';
                    BotState.currentEvaluation = scoreToDisplay(best?.score);
                    BotState.principalVariation = best?.pv || 'Not available';
                    BotState.statusInfo = '✓ Ready';
                    ui.updateDisplay(pa());

                    if (best) await executeAction(best.uci, fen);
                    lastFenProcessedMain = fen;
                } else {
                    // Premove analysis
                    const ourColor = getPlayerColor(game);
                    const stm = getSideToMove(game);
                    const ourUci = getOurMoveFromPV(best?.pv || '', ourColor, stm) ||
                        ((stm === ourColor) ? (best?.uci || null) : null);

                    const premoveEvalDisplay = scoreToDisplay(best?.score);

                    if (!ourUci) {
                        BotState.statusInfo = 'Premove unavailable (no PV)';
                        ui.updateDisplay(pa());
                        lastFenProcessedPremove = fen;
                        return;
                    }

                    if (!shouldPremove(ourUci, fen)) {
                        BotState.statusInfo = `Premove skipped (${BotState.premoveMode})`;
                        ui.updateDisplay(pa());
                        lastFenProcessedPremove = fen;
                        return;
                    }

                    // 🛡️ SAFETY CHECK: Threat detection
                    const safetyCheck = checkPremoveSafety(fen, ourUci, ourColor);
                    if (!safetyCheck.safe) {
                        BotState.statusInfo = `🛡️ Premove blocked: ${safetyCheck.reason}`;
                        ui.updateDisplay(pa());
                        lastFenProcessedPremove = fen;
                        return;
                    }

                    let currentChance = getEvalBasedPremoveChance(premoveEvalDisplay, ourColor);

                    // 🛡️ Reduce confidence based on risk level
                    if (safetyCheck.riskLevel > 0) {
                        const riskPenalty = safetyCheck.riskLevel * 0.5; // 50% reduction at max risk
                        currentChance = Math.max(5, currentChance - riskPenalty);
                        console.log(`GabiBot: Risk detected (${safetyCheck.riskLevel}%), reducing confidence: ${currentChance.toFixed(0)}%`);
                    }
                    const chanceEl = qs('[name="premoveChance"] .itemState');
                    if (chanceEl) chanceEl.textContent = `${Math.round(currentChance)}%`;

                    const roll = Math.random() * 100;
                    if (roll > currentChance) {
                        const skipReason = safetyCheck.riskLevel > 0
                            ? `${safetyCheck.reason} (${roll.toFixed(0)}% > ${currentChance.toFixed(0)}%)`
                            : `eval: ${premoveEvalDisplay}, ${roll.toFixed(0)}% > ${currentChance.toFixed(0)}%`;
                        BotState.statusInfo = `Premove skipped: ${skipReason}`;
                        ui.updateDisplay(pa());
                        lastFenProcessedPremove = fen;
                        return;
                    }

                    const from = ourUci.substring(0, 2);
                    const to = ourUci.substring(2, 4);

                    clearArrows();
                    drawArrow(from, to, 'rgba(80, 180, 255, 0.7)', 3);

                    await simulateClickMove(from, to);
                    await sleep(80);

                    lastPremoveFen = fen;
                    lastPremoveUci = ourUci;
                    const safetyEmoji = safetyCheck.riskLevel === 0 ? '✅' : safetyCheck.riskLevel < 25 ? '⚠️' : '🔶';
                    BotState.statusInfo = `${safetyEmoji} Premove: ${ourUci} (${Math.round(currentChance)}% confidence)`;
                    ui.updateDisplay(pa());
                    lastFenProcessedPremove = fen;
                }
            } catch (error) {
                if (String(error?.name || error).toLowerCase().includes('abort') ||
                    String(error?.message || error).toLowerCase().includes('superseded')) {
                    BotState.statusInfo = '⏸ Analysis canceled';
                } else {
                    console.error('GabiBot API Error:', error);
                    BotState.statusInfo = '❌ API Error';
                    BotState.currentEvaluation = 'Error';
                }
                ui.updateDisplay(pa());
            }
        });
    }
    // ═══════════════════════════════════════════════════════════
    // PREMOVE SAFETY: HEURISTIC THREAT DETECTION
    // ═══════════════════════════════════════════════════════════

    // Piece values for safety checks
    const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    // Get all squares attacking a given square (fast heuristic)
    function getAttackersOfSquare(fen, targetSquare, attackerColor) {
        const attackers = [];
        const placement = fen.split(' ')[0];
        const ranks = placement.split('/');

        const tFile = 'abcdefgh'.indexOf(targetSquare[0]);
        const tRank = parseInt(targetSquare[1], 10);

        if (tFile < 0 || tRank < 1 || tRank > 8) return attackers;

        // Helper: check square and add if it contains attacker piece
        const checkSquare = (file, rank, pieceTypes) => {
            if (file < 0 || file > 7 || rank < 1 || rank > 8) return;
            const sq = 'abcdefgh'[file] + rank;
            const ch = fenCharAtSquare(fen, sq);
            const piece = pieceFromFenChar(ch);
            if (piece && piece.color === attackerColor && pieceTypes.includes(piece.type)) {
                attackers.push({ square: sq, piece: piece.type });
            }
        };

        // Pawn attacks (diagonal)
        const pawnDir = attackerColor === 'w' ? 1 : -1;
        checkSquare(tFile - 1, tRank - pawnDir, ['p']);
        checkSquare(tFile + 1, tRank - pawnDir, ['p']);

        // Knight attacks
        const knightMoves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        knightMoves.forEach(([df, dr]) => checkSquare(tFile + df, tRank + dr, ['n']));

        // King attacks
        for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
                if (df === 0 && dr === 0) continue;
                checkSquare(tFile + df, tRank + dr, ['k']);
            }
        }

        // Sliding pieces (rook, bishop, queen)
        const directions = [
            { dx: 1, dy: 0, pieces: ['r', 'q'] },   // right
            { dx: -1, dy: 0, pieces: ['r', 'q'] },  // left
            { dx: 0, dy: 1, pieces: ['r', 'q'] },   // up
            { dx: 0, dy: -1, pieces: ['r', 'q'] },  // down
            { dx: 1, dy: 1, pieces: ['b', 'q'] },   // diagonal
            { dx: 1, dy: -1, pieces: ['b', 'q'] },
            { dx: -1, dy: 1, pieces: ['b', 'q'] },
            { dx: -1, dy: -1, pieces: ['b', 'q'] }
        ];

        directions.forEach(({ dx, dy, pieces }) => {
            let f = tFile + dx;
            let r = tRank + dy;
            while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
                const sq = 'abcdefgh'[f] + r;
                const ch = fenCharAtSquare(fen, sq);
                if (ch) {
                    const piece = pieceFromFenChar(ch);
                    if (piece && piece.color === attackerColor && pieces.includes(piece.type)) {
                        attackers.push({ square: sq, piece: piece.type });
                    }
                    break; // Blocked
                }
                f += dx;
                r += dy;
            }
        });

        return attackers;
    }

    // Check if square is attacked by opponent
    function isSquareAttackedBy(fen, square, attackerColor) {
        return getAttackersOfSquare(fen, square, attackerColor).length > 0;
    }

    // Find king position
    function findKing(fen, color) {
        const placement = fen.split(' ')[0];
        const ranks = placement.split('/');
        const kingChar = color === 'w' ? 'K' : 'k';

        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
            const rank = 8 - rankIdx;
            let file = 0;
            for (const ch of ranks[rankIdx]) {
                if (/\d/.test(ch)) {
                    file += parseInt(ch, 10);
                } else {
                    if (ch === kingChar) {
                        return 'abcdefgh'[file] + rank;
                    }
                    file++;
                }
            }
        }
        return null;
    }

    // Simple FEN after move simulation (for king safety check)
    function makeSimpleMove(fen, from, to, promotionChar) {
        if (!fen || !from || !to) return fen;

        const parts = fen.split(' ');
        const placement = parts[0] || '';
        const side = parts[1] || 'w';

        const board = fenPlacementToBoard(placement);
        const fromIdx = sqToIdx(from);
        const toIdx = sqToIdx(to);

        const moving = board?.[fromIdx.r]?.[fromIdx.f] || null;
        if (!moving) return fen;

        const color = moving === moving.toUpperCase() ? 'w' : 'b';
        const type = moving.toLowerCase();

        const dest = board?.[toIdx.r]?.[toIdx.f] || null;
        const isPawn = type === 'p';

        // En passant: pawn moves diagonally to empty square
        const isEnPassant = isPawn && fromIdx.f !== toIdx.f && !dest;
        if (isEnPassant) {
            const capRow = color === 'w' ? toIdx.r + 1 : toIdx.r - 1;
            if (capRow >= 0 && capRow < 8) board[capRow][toIdx.f] = null;
        }

        // Castling: king moves two files
        const isCastle = type === 'k' && Math.abs(toIdx.f - fromIdx.f) === 2;
        if (isCastle) {
            if (color === 'w' && fromIdx.r === 7) {
                // White
                if (toIdx.f === 6) { // e1g1 (O-O)
                    if (board[7][7]) { board[7][5] = board[7][7]; board[7][7] = null; }
                } else if (toIdx.f === 2) { // e1c1 (O-O-O)
                    if (board[7][0]) { board[7][3] = board[7][0]; board[7][0] = null; }
                }
            } else if (color === 'b' && fromIdx.r === 0) {
                // Black
                if (toIdx.f === 6) { // e8g8 (O-O)
                    if (board[0][7]) { board[0][5] = board[0][7]; board[0][7] = null; }
                } else if (toIdx.f === 2) { // e8c8 (O-O-O)
                    if (board[0][0]) { board[0][3] = board[0][0]; board[0][0] = null; }
                }
            }
        }

        // Move piece
        board[toIdx.r][toIdx.f] = moving;
        board[fromIdx.r][fromIdx.f] = null;

        // Promotion
        if (isPawn && (toIdx.r === 0 || toIdx.r === 7)) {
            const prom = (promotionChar || 'q').toLowerCase();
            board[toIdx.r][toIdx.f] = color === 'w' ? prom.toUpperCase() : prom;
        }

        const newPlacement = boardToPlacement(board);

        // Keep other FEN fields conservative; for indexing/safety we only need correct placement + side
        const castling = parts[2] || '-';
        const ep = '-';
        const halfmove = parts[4] || '0';
        const fullmove = parts[5] || '1';
        const newSide = side === 'w' ? 'b' : 'w';

        return `${newPlacement} ${newSide} ${castling} ${ep} ${halfmove} ${fullmove}`;
    }

    // ═══════════════════════════════════════════════════════════
    // OPENING BOOK SYSTEM (piece-placement + side-to-move matching)
    // ═══════════════════════════════════════════════════════════
    const START_POSITION_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    let BOOK_INDEX = new Map(); // key: "placement side" -> [{ name, nextUci, pv }]
    let OpeningBookState = { enabled: 1, lastUsed: 0 };

    function getFenSignature(fen) {
        if (!fen) return '';
        const parts = fen.split(' ');
        const placement = parts[0] || '';
        const side = parts[1] || 'w';
        return `${placement} ${side}`;
    }

    function applyUciToFenSignature(sig, uci) {
        if (!sig || !uci || uci.length < 4) return null;

        const sp = sig.indexOf(' ');
        const placement = sig.slice(0, sp);
        const side = sig.slice(sp + 1);

        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const promo = uci.length >= 5 ? uci[4] : null;

        // Use robust move application to keep placement correct across castling / EP / promotions
        const fakeFenBefore = `${placement} ${side} - - 0 1`;
        const fakeFenAfter = makeSimpleMove(fakeFenBefore, from, to, promo);
        const parts = fakeFenAfter.split(' ');

        return `${parts[0]} ${parts[1]}`;
    }

    function addBookMapping(sigBefore, opening, plyIndex) {
        const nextUci = opening.moves[plyIndex];
        if (!nextUci) return;
        const pv = opening.moves.slice(plyIndex).join(' ');
        const list = BOOK_INDEX.get(sigBefore) || [];
        list.push({ name: opening.name, nextUci, pv });
        BOOK_INDEX.set(sigBefore, list);
    }

    function initOpeningBook() {
        BOOK_INDEX = new Map();
        for (const opening of OPENING_BOOK) {
            let sig = `${START_POSITION_PLACEMENT} w`;
            for (let i = 0; i < opening.moves.length; i++) {
                addBookMapping(sig, opening, i);
                sig = applyUciToFenSignature(sig, opening.moves[i]);
                if (!sig) break;
            }
        }
        console.log(`GabiBot: 📘 Opening book indexed: ${BOOK_INDEX.size} signatures`);
    }

    function findBookMoveForFen(fen, ourColor) {
        if (!OpeningBookState.enabled || !fen) return null;
        const sig = getFenSignature(fen);
        const parts = sig.split(' ');
        const sideToMove = parts[1] || 'w';
        if (sideToMove !== ourColor) return null;

        const candidates = BOOK_INDEX.get(sig) || [];
        if (!candidates.length) return null;

        // Validate plausibility (same as before)
        const valid = candidates.filter(c => {
            const from = c.nextUci.slice(0, 2);
            const to = c.nextUci.slice(2, 4);
            const chFrom = fenCharAtSquare(fen, from);
            const pFrom = pieceFromFenChar(chFrom);
            if (!pFrom || pFrom.color !== ourColor) return false;
            const chTo = fenCharAtSquare(fen, to);
            const pTo = pieceFromFenChar(chTo);
            if (pTo && pTo.color === ourColor) return false;
            return true;
        });
        if (!valid.length) return null;

        // UNBIASED PICK: choose uniformly across unique UCIs
        const byMove = valid.reduce((acc, item) => {
            (acc[item.nextUci] ||= []).push(item);
            return acc;
        }, {});
        const uniqueMoves = Object.keys(byMove);
        const movePick = uniqueMoves[Math.floor(Math.random() * uniqueMoves.length)];

        // Pick one representative for PV/name (if multiple lines share this move)
        const group = byMove[movePick];
        const infoPick = group[Math.floor(Math.random() * group.length)];

        return infoPick; // { name, nextUci, pv }
    }
    // Main premove safety check
    function checkPremoveSafety(fen, uci, ourColor) {
        if (!fen || !uci || uci.length < 4) {
            return { safe: false, reason: 'Invalid move', riskLevel: 100 };
        }

        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const oppColor = ourColor === 'w' ? 'b' : 'w';

        const movingCh = fenCharAtSquare(fen, from);
        const movingPiece = pieceFromFenChar(movingCh);

        if (!movingPiece || movingPiece.color !== ourColor) {
            return { safe: false, reason: 'Not our piece', riskLevel: 100 };
        }

        const destCh = fenCharAtSquare(fen, to);
        const destPiece = pieceFromFenChar(destCh);

        let riskLevel = 0;
        const reasons = [];

        // Check 1: King safety (critical)
        if (movingPiece.type === 'k') {
            if (isSquareAttackedBy(fen, to, oppColor)) {
                return { safe: false, reason: 'King moves into check', riskLevel: 100 };
            }
        } else {
            // Check if move exposes our king
            const newFen = makeSimpleMove(fen, from, to, (uci.length >= 5 ? uci[4] : null));
            const kingPos = findKing(newFen, ourColor);
            if (kingPos && isSquareAttackedBy(newFen, kingPos, oppColor)) {
                return { safe: false, reason: 'Exposes king to check', riskLevel: 100 };
            }
        }

        // Check 2: Don't hang the queen
        if (movingPiece.type === 'q') {
            const attackers = getAttackersOfSquare(fen, to, oppColor);
            if (attackers.length > 0) {
                // Queen moving to attacked square
                const hasDefender = getAttackersOfSquare(fen, to, ourColor).length > 1; // >1 because queen itself
                if (!hasDefender || !destPiece) {
                    return { safe: false, reason: 'Hangs queen', riskLevel: 90 };
                }
            }
        }

        // Check 3: Don't hang rook for nothing
        if (movingPiece.type === 'r') {
            const attackers = getAttackersOfSquare(fen, to, oppColor);
            if (attackers.length > 0) {
                const captureValue = destPiece ? PIECE_VALUES[destPiece.type] : 0;
                if (captureValue < PIECE_VALUES.r) {
                    const hasDefender = getAttackersOfSquare(fen, to, ourColor).length > 1;
                    if (!hasDefender) {
                        reasons.push('Hangs rook');
                        riskLevel += 60;
                    }
                }
            }
        }

        // Check 4: Destination square safety
        const destAttackers = getAttackersOfSquare(fen, to, oppColor);
        if (destAttackers.length > 0 && !destPiece) {
            // Moving to attacked empty square
            const defenders = getAttackersOfSquare(fen, to, ourColor).length;
            if (defenders === 0) {
                reasons.push('Moves to undefended attacked square');
                riskLevel += 30;
            } else if (destAttackers.length > defenders) {
                reasons.push('Moves to heavily attacked square');
                riskLevel += 20;
            }
        }

        // Check 5: Unfavorable trades
        if (destPiece && destPiece.color === oppColor) {
            const ourValue = PIECE_VALUES[movingPiece.type];
            const theirValue = PIECE_VALUES[destPiece.type];
            const destAttackers = getAttackersOfSquare(fen, to, oppColor);

            if (destAttackers.length > 0 && ourValue > theirValue) {
                reasons.push(`Bad trade: ${movingPiece.type} for ${destPiece.type}`);
                riskLevel += 25;
            }
        }

        const safe = riskLevel < 50;
        const reason = reasons.length > 0 ? reasons.join(', ') : (safe ? 'Move appears safe' : 'Move risky');

        return { safe, reason, riskLevel };
    }
    // Should we premove this UCI for the given FEN (mode-aware)
    function shouldPremove(uci, fen) {
        if (!uci || uci.length < 4) return false;
        const game = getGame();
        const ourColor = getPlayerColor(game);
        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const fromCh = fenCharAtSquare(fen, from);
        const toCh = fenCharAtSquare(fen, to);
        const fromPiece = pieceFromFenChar(fromCh);
        const toPiece = pieceFromFenChar(toCh);

        if (!fromPiece || fromPiece.color !== ourColor) return false;

        if (BotState.premoveMode === 'every') return true;

        if (BotState.premoveMode === 'capture') {
            return !!(toPiece && toPiece.color !== ourColor) || isEnPassantCapture(fen, from, to, ourColor);
        }

        if (BotState.premoveMode === 'filter') {
            return !!BotState.premovePieces[fromPiece.type];
        }

        return false;
    }

    // Calculate premove confidence based on position evaluation
    function getEvalBasedPremoveChance(evaluation, ourColor) {
        if (!BotState.premoveEnabled) return 0;

        const game = getGame();
        if (!game || isPlayersTurn(game)) return 0;

        let evalScore = 0;

        if (typeof evaluation === 'string') {
            if (evaluation === '-' || evaluation === 'Error') return 0;

            if (evaluation.includes('M')) {
                const mateNum = parseInt(evaluation.replace('M', '').replace('+', ''), 10);
                if (!isNaN(mateNum)) {
                    // Mate is always from White's perspective from engine
                    // Positive mate = White winning, Negative = Black winning
                    const ourMate = ourColor === 'w' ? mateNum : -mateNum;
                    return ourMate > 0 ? 100 : 20;
                }
            }

            evalScore = parseFloat(evaluation);
        } else {
            evalScore = parseFloat(evaluation);
        }

        if (isNaN(evalScore)) return 0;

        // Engine eval is from White's perspective
        // Convert to our perspective
        const ourEval = ourColor === 'w' ? evalScore : -evalScore;

        if (ourEval >= 3.0) return 90;
        if (ourEval >= 2.0) return 75;
        if (ourEval >= 1.0) return 50;
        if (ourEval >= 0.5) return 35;
        if (ourEval >= 0) return 25;
        return 20;
    }

    // Tick loop
    function tick() {
        if (!BotState.hackEnabled) return;

        const game = getGame();
        if (!game) return;

        if (game.isGameOver && game.isGameOver()) {
            BotState.currentEvaluation = 'GAME OVER';
            BotState.bestMove = '-';
            BotState.principalVariation = 'Game ended';
            BotState.statusInfo = 'Game finished';
            clearArrows();
            ui.updateDisplay(pa());
            return;
        }

        const fen = getFen(game);
        if (!fen) return;

        if (fen !== lastFenSeen) {
            lastFenSeen = fen;
            cancelPendingMove();
            clearArrows();
            lastPremoveFen = '';
            lastPremoveUci = '';
        }

        if (isPlayersTurn(game)) {
            if (lastFenProcessedMain !== fen) {
                scheduleAnalysis('main', fen);
            }
        } else {
            if (BotState.premoveEnabled) {
                if (lastFenProcessedPremove !== fen) {
                    scheduleAnalysis('premove', fen);
                } else {
                    //  Pass ourColor when updating premove chance display
                    const chanceEl = qs('[name="premoveChance"] .itemState');
                    if (chanceEl && BotState.currentEvaluation && BotState.currentEvaluation !== '-') {
                        const ourColor = getPlayerColor(game);
                        const currentChance = getEvalBasedPremoveChance(BotState.currentEvaluation, ourColor);
                        chanceEl.textContent = `${Math.round(currentChance)}%`;
                    }

                    BotState.statusInfo = (lastPremoveUci && lastPremoveFen === fen) ? 'Waiting (premove ready)...' : 'Waiting for opponent...';
                    ui.updateDisplay(pa());
                }
            } else {
                const chanceEl = qs('[name="premoveChance"] .itemState');
                if (chanceEl) chanceEl.textContent = '0%';

                BotState.statusInfo = 'Waiting for opponent...';
                ui.updateDisplay(pa());
            }
        }
    }

    function startTickLoop() {
        stopTickLoop();
        const interval = Math.max(150, 1100 - (Number(BotState.updateSpeed) || 8) * 100);
        tickTimer = setInterval(tick, interval);
        tick();
    }

    function stopTickLoop() {
        if (tickTimer) clearInterval(tickTimer);
        tickTimer = null;
    }

    // Game auto-end detection and auto-rematch watchers
    function startAutoWatchers() {
        if (gameStartInterval) clearInterval(gameStartInterval);
        if (gameEndInterval) clearInterval(gameEndInterval);

        let gameEndDetected = false;

        gameEndInterval = setInterval(() => {
            const gameOverModal = qs('.game-over-modal-content');

            if (gameOverModal && !gameEndDetected) {
                console.log('GabiBot: Game over detected');

                clearArrows();
                cancelPendingMove();

                BotState.statusInfo = 'Game ended, preparing new game...';
                BotState.currentEvaluation = '-';
                BotState.bestMove = '-';
                ui?.updateDisplay(pa());

                gameEndDetected = true;

                if (BotState.autoRematch) {
                    console.log('GabiBot: Auto-rematch enabled');

                    setTimeout(() => {
                        const modal = qs('.game-over-modal-content');
                        if (!modal) return console.log('GabiBot: [2s] Modal closed, game started');

                        const btn = qsa('button', modal).find(b =>
                            /rematch/i.test((b.textContent || '').trim()) ||
                            /rematch/i.test((b.getAttribute?.('aria-label') || '').trim())
                        );

                        if (btn) {
                            console.log('GabiBot: [2s] ✅ Clicking Rematch');
                            btn.click();
                        } else {
                            console.log('GabiBot: [2s] No Rematch button');
                        }
                    }, 2000);

                    setTimeout(() => {
                        const modal = qs('.game-over-modal-content');
                        if (!modal) return console.log('GabiBot: [12s] Modal closed, game started');

                        const btn = qsa('button', modal).find(b => {
                            const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
                            return /new.*\d+.*min/i.test(text);
                        });

                        if (btn) {
                            console.log(`GabiBot: [12s] ✅ Clicking "${btn.textContent.trim()}"`);
                            btn.click();
                        } else {
                            console.log('GabiBot: [12s] No "New X min" button');
                        }
                    }, 12000);

                    setTimeout(async () => {
                        const modal = qs('.game-over-modal-content');
                        if (!modal) return console.log('GabiBot: [22s] Modal closed, game started');

                        console.log('GabiBot: [22s] Using New Game tab fallback');

                        const closeBtn = qs('[aria-label="Close"]', modal);
                        if (closeBtn) {
                            closeBtn.click();
                            await sleep(500);
                        }

                        const tab = qs('[data-tab="newGame"]') ||
                            qsa('.tabs-tab').find(t => /new.*game/i.test(t.textContent || ''));

                        if (tab) {
                            console.log('GabiBot: [22s] Clicking New Game tab');
                            tab.click();
                            await sleep(400);

                            const startBtn = qsa('button').find(b =>
                                /start.*game/i.test((b.textContent || '').trim())
                            );

                            if (startBtn) {
                                console.log('GabiBot: [22s] ✅ Clicking Start Game');
                                startBtn.click();
                            } else {
                                console.log('GabiBot: [22s] ❌ Start Game not found');
                            }
                        } else {
                            console.log('GabiBot: [22s] ❌ New Game tab not found');
                        }
                    }, 22000);
                }
            }

            if (!gameOverModal && gameEndDetected) {
                console.log('GabiBot: New game started, bot analyzing...');
                gameEndDetected = false;

                if (BotState.hackEnabled) {
                    BotState.statusInfo = 'Ready';
                    ui?.updateDisplay(pa());
                    setTimeout(() => {
                        if (BotState.hackEnabled) tick();
                    }, 500);
                }
            }
        }, 1000);
    }

    // Draggable panel
    function makePanelDraggable(panel) {
        function clampToViewport() {
            const rect = panel.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const margin = 8;

            panel.style.right = 'auto';

            let left = parseFloat(panel.style.left || rect.left);
            let top = parseFloat(panel.style.top || rect.top);

            left = Math.max(margin, Math.min(left, vw - rect.width - margin));
            top = Math.max(margin, Math.min(top, vh - rect.height - margin));

            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
        }

        function allowDragFromTarget(target, e) {
            if (e.altKey) return true;

            const rect = panel.getBoundingClientRect();
            const m = 14;
            const nearEdge =
                e.clientX <= rect.left + m ||
                e.clientX >= rect.right - m ||
                e.clientY <= rect.top + m ||
                e.clientY >= rect.bottom - m;

            if (nearEdge) return true;

            if (target.closest('input, select, textarea, button, label, a')) return false;

            return true;
        }

        function startDrag(e) {
            e.preventDefault();
            const startRect = panel.getBoundingClientRect();

            panel.classList.add('grabbing');
            panel.style.right = 'auto';
            panel.style.left = startRect.left + 'px';
            panel.style.top = startRect.top + 'px';

            const startX = e.clientX;
            const startY = e.clientY;

            const move = (ev) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                const vw = window.innerWidth;
                const vh = window.innerHeight;

                let newLeft = startRect.left + dx;
                let newTop = startRect.top + dy;

                const margin = 8;
                const maxLeft = Math.max(margin, vw - startRect.width - margin);
                const maxTop = Math.max(margin, vh - startRect.height - margin);
                newLeft = Math.min(Math.max(newLeft, margin), maxLeft);
                newTop = Math.min(Math.max(newTop, margin), maxTop);

                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
            };

            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                panel.classList.remove('grabbing');
                try { ui?.Settings.save?.(); } catch { }
            };

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        }

        panel.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (!allowDragFromTarget(e.target, e)) return;
            startDrag(e);
        });

        window.addEventListener('resize', clampToViewport);
        setTimeout(clampToViewport, 50);
    }

    // Kick off
    setTimeout(init, 3000);
})();