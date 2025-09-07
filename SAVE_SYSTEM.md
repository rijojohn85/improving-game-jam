# Save System and Leaderboard

The game now includes a comprehensive save system that tracks player scores and displays a leaderboard. Here's how it works:

## Features

### 1. Automatic Score Saving
- When the player loses all 3 lives (game over), the score is automatically saved
- Each entry includes:
  - Final score (points)
  - Maximum height reached (meters)
  - Date and time of the game
  - Unique timestamp for tracking

### 2. Leaderboard
- Displays the top 5 scores of all time
- Shows the current game's ranking among all saved scores
- Gold highlighting for top 3 positions
- Includes date/time information for each entry

### 3. Data Storage
- **Primary**: Saves to a JSON file in the system's user data directory (Electron)
- **Fallback**: Uses browser localStorage if file system access fails
- File location: `[User Data]/game-scores.json`

### 4. User Interface
- **Game Over Screen**: Shows final score and max height
- **View Leaderboard Button**: Opens the full leaderboard display
- **Current Game Rank**: Shows where the current game ranks among all scores
- **Continue Button**: Closes the leaderboard and returns to game over screen

## How to Use

1. **Play the Game**: Climb as high as possible and collect points
2. **Game Over**: When you lose all 3 lives, your score is automatically saved
3. **View Leaderboard**: Click "VIEW LEADERBOARD" on the game over screen
4. **See Your Rank**: The leaderboard shows your current game's position
5. **Continue**: Click "CONTINUE" to return to the game over screen
6. **Restart**: Click "RESTART GAME" to play again

## Technical Details

### File Structure
The save file (`game-scores.json`) contains an array of score entries:

```json
[
  {
    "score": 1250,
    "height": 125,
    "date": "2025-09-07T10:27:04.123Z",
    "timestamp": 1725707224123
  }
]
```

### Score Calculation
- **Height Points**: 10 points per meter climbed
- **Coin Collection**: 50 points per coin
- **Final Score**: Total of all points earned during the game

### Data Management
- Keeps up to 100 score entries to prevent file bloat
- Scores are automatically sorted by highest score first
- Duplicate or invalid entries are prevented

## Error Handling

The save system includes robust error handling:
- Falls back to localStorage if file system access fails
- Creates empty leaderboard if no save data exists
- Logs all operations for debugging
- Continues game operation even if saving fails

## Customization

You can modify the save system by editing `/src/SaveSystem.js`:
- Change `maxLeaderboardEntries` to keep more/fewer scores
- Modify the leaderboard display count (currently top 5)
- Adjust file names or storage locations
- Customize the UI appearance and layout

The system is designed to be robust and user-friendly, providing a seamless gaming experience with persistent progress tracking.
