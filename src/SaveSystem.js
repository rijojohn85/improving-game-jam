// SaveSystem.js - Handles saving game scores and leaderboard functionality

export class SaveSystem {
  constructor() {
    this.saveFilePath = 'game-scores.json';
    this.scores = [];
    this.currentGameScore = null;
    this.maxLeaderboardEntries = 100; // Keep more entries but display top 5
  }

  async initialize() {
    await this.loadScores();
  }

  async loadScores() {
    try {
      // Check if we're in Electron environment
      if (window.require) {
        try {
          const fs = window.require('fs').promises;
          const path = window.require('path');
          const { app } = window.require('@electron/remote');
          
          const userDataPath = app.getPath('userData');
          const fullPath = path.join(userDataPath, this.saveFilePath);
          
          try {
            const data = await fs.readFile(fullPath, 'utf8');
            this.scores = JSON.parse(data);
            console.log('Scores loaded successfully from file:', this.scores.length, 'entries');
          } catch (error) {
            if (error.code === 'ENOENT') {
              console.log('No save file found, starting with empty leaderboard');
              this.scores = [];
            } else {
              throw error;
            }
          }
        } catch (electronError) {
          console.warn('Electron remote access failed, falling back to localStorage:', electronError.message);
          // Fallback to localStorage if remote fails
          const savedData = localStorage.getItem('pixelClimber-scores');
          if (savedData) {
            this.scores = JSON.parse(savedData);
            console.log('Scores loaded from localStorage fallback:', this.scores.length, 'entries');
          } else {
            this.scores = [];
            console.log('No saved scores found, starting with empty leaderboard');
          }
        }
      } else {
        // Fallback to localStorage for web environment
        const savedData = localStorage.getItem('pixelClimber-scores');
        if (savedData) {
          this.scores = JSON.parse(savedData);
          console.log('Scores loaded from localStorage:', this.scores.length, 'entries');
        } else {
          this.scores = [];
          console.log('No saved scores found, starting with empty leaderboard');
        }
      }
    } catch (error) {
      console.error('Error loading scores:', error);
      this.scores = [];
    }
  }

  async saveScores() {
    try {
      const dataToSave = JSON.stringify(this.scores, null, 2);
      
      if (window.require) {
        try {
          const fs = window.require('fs').promises;
          const path = window.require('path');
          const { app } = window.require('@electron/remote');
          
          const userDataPath = app.getPath('userData');
          const fullPath = path.join(userDataPath, this.saveFilePath);
          
          await fs.writeFile(fullPath, dataToSave);
          console.log('Scores saved successfully to file:', fullPath);
        } catch (electronError) {
          console.warn('Electron file save failed, falling back to localStorage:', electronError.message);
          // Fallback to localStorage
          localStorage.setItem('pixelClimber-scores', dataToSave);
          console.log('Scores saved to localStorage fallback');
        }
      } else {
        // Fallback to localStorage
        localStorage.setItem('pixelClimber-scores', dataToSave);
        console.log('Scores saved to localStorage');
      }
    } catch (error) {
      console.error('Error saving scores:', error);
    }
  }

  async addScore(score, heightMeters) {
    const newEntry = {
      score: score,
      height: heightMeters,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };

    this.scores.push(newEntry);
    
    // Sort by score (descending) and keep only the best entries
    this.scores.sort((a, b) => b.score - a.score);
    
    // Trim to max entries to prevent the file from growing too large
    if (this.scores.length > this.maxLeaderboardEntries) {
      this.scores = this.scores.slice(0, this.maxLeaderboardEntries);
    }

    // Set current game score for rank calculation
    this.currentGameScore = newEntry;
    
    await this.saveScores();
    
    console.log('Score added:', newEntry);
    return this.getCurrentGameRank();
  }

  getTopScores(count = 5) {
    return this.scores.slice(0, count);
  }

  getCurrentGameRank() {
    if (!this.currentGameScore) return null;
    
    const rank = this.scores.findIndex(entry => 
      entry.timestamp === this.currentGameScore.timestamp
    ) + 1;
    
    return {
      rank: rank,
      totalEntries: this.scores.length,
      score: this.currentGameScore.score,
      height: this.currentGameScore.height
    };
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatScore(score) {
    return score.toLocaleString();
  }

  displayLeaderboard(scene) {
    // Clear any existing leaderboard UI
    this.clearLeaderboard(scene);

    const centerX = scene.cameras.main.worldView.centerX;
    const centerY = scene.cameras.main.worldView.centerY;

    // Create semi-transparent background
    const background = scene.add.rectangle(
      centerX, 
      centerY, 
      400, 
      500, 
      0x000000, 
      0.8
    );
    background.setScrollFactor(0);
    background.setDepth(2000);
    background.setStrokeStyle(2, 0xffffff);

    // Title
    const title = scene.add.text(centerX, centerY - 220, 'LEADERBOARD', {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(2001);

    // Get top 5 scores
    const topScores = this.getTopScores(5);
    
    // Display top scores
    const scoreElements = [];
    topScores.forEach((entry, index) => {
      const rank = index + 1;
      const y = centerY - 170 + (index * 35);
      
      // Rank and score
      const scoreText = scene.add.text(
        centerX, 
        y, 
        `${rank}. ${this.formatScore(entry.score)} pts (${entry.height}m)`,
        {
          fontSize: '16px',
          fill: rank <= 3 ? '#ffdd44' : '#ffffff',
          fontFamily: 'monospace',
          fontStyle: rank <= 3 ? 'bold' : 'normal'
        }
      );
      scoreText.setOrigin(0.5);
      scoreText.setScrollFactor(0);
      scoreText.setDepth(2001);
      scoreElements.push(scoreText);

      // Date
      const dateText = scene.add.text(
        centerX,
        y + 15,
        this.formatDate(entry.date),
        {
          fontSize: '12px',
          fill: '#aaaaaa',
          fontFamily: 'monospace'
        }
      );
      dateText.setOrigin(0.5);
      dateText.setScrollFactor(0);
      dateText.setDepth(2001);
      scoreElements.push(dateText);
    });

    // Current game rank (if available)
    const currentRank = this.getCurrentGameRank();
    let separator, currentGameText, rankText, scoreInfoText;
    
    if (currentRank) {
      const rankY = centerY + 50;
      
      // Separator line
      separator = scene.add.text(centerX, rankY - 20, '───────────────', {
        fontSize: '14px',
        fill: '#666666',
        fontFamily: 'monospace'
      });
      separator.setOrigin(0.5);
      separator.setScrollFactor(0);
      separator.setDepth(2001);

      // Current game text
      currentGameText = scene.add.text(centerX, rankY, 'YOUR GAME:', {
        fontSize: '14px',
        fill: '#ffff88',
        fontFamily: 'monospace',
        fontStyle: 'bold'
      });
      currentGameText.setOrigin(0.5);
      currentGameText.setScrollFactor(0);
      currentGameText.setDepth(2001);

      // Rank info
      rankText = scene.add.text(
        centerX, 
        rankY + 25, 
        `Rank ${currentRank.rank} of ${currentRank.totalEntries}`,
        {
          fontSize: '16px',
          fill: currentRank.rank <= 5 ? '#44ff44' : '#ffffff',
          fontFamily: 'monospace',
          fontStyle: currentRank.rank <= 5 ? 'bold' : 'normal'
        }
      );
      rankText.setOrigin(0.5);
      rankText.setScrollFactor(0);
      rankText.setDepth(2001);

      // Score info
      scoreInfoText = scene.add.text(
        centerX,
        rankY + 45,
        `${this.formatScore(currentRank.score)} pts (${currentRank.height}m)`,
        {
          fontSize: '14px',
          fill: '#ffffff',
          fontFamily: 'monospace'
        }
      );
      scoreInfoText.setOrigin(0.5);
      scoreInfoText.setScrollFactor(0);
      scoreInfoText.setDepth(2001);
    }

    // Close button
    const closeButton = scene.add.text(centerX, centerY + 180, 'CONTINUE', {
      fontSize: '18px',
      fill: '#44ff44',
      fontFamily: 'monospace',
      backgroundColor: '#002200',
      padding: { x: 15, y: 8 }
    });
    closeButton.setOrigin(0.5);
    closeButton.setScrollFactor(0);
    closeButton.setDepth(2001);
    closeButton.setInteractive({ useHandCursor: true });
    
    closeButton.on('pointerdown', () => {
      this.clearLeaderboard(scene);
    });
    
    closeButton.on('pointerover', () => {
      closeButton.setStyle({ fill: '#ffffff', backgroundColor: '#004400' });
    });
    
    closeButton.on('pointerout', () => {
      closeButton.setStyle({ fill: '#44ff44', backgroundColor: '#002200' });
    });

    // Store references for cleanup
    this.leaderboardElements = [
      background, title, closeButton, ...scoreElements
    ];
    
    // Add current rank elements if they exist
    if (separator) this.leaderboardElements.push(separator);
    if (currentGameText) this.leaderboardElements.push(currentGameText);
    if (rankText) this.leaderboardElements.push(rankText);
    if (scoreInfoText) this.leaderboardElements.push(scoreInfoText);
  }

  clearLeaderboard(scene) {
    // Remove only the specific leaderboard UI elements that we stored
    if (this.leaderboardElements) {
      this.leaderboardElements.forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.leaderboardElements = null;
    }
  }

  // Method to be called when the game ends (player loses all lives)
  async onGameEnd(finalScore, finalHeight) {
    console.log('Game ended - Final Score:', finalScore, 'Final Height:', finalHeight);
    const rank = await this.addScore(finalScore, finalHeight);
    return rank;
  }
}
