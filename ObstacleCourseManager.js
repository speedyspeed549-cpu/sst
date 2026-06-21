export class ObstacleCourseManager {
    constructor(canvas, onResult) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onResult = onResult;
        this.width = canvas.width;
        this.height = canvas.height;

        this.active = false;
        this.score = 0;
        this.maxScore = 20;
        this.lives = 3;
        this.timeLeft = 44.9;
        
        this.arrows = ['←', '↑', '→', '↓'];
        this.keyMap = {
            'ArrowLeft': '←', 'a': '←', 'A': '←',
            'ArrowUp': '↑', 'w': '↑', 'W': '↑',
            'ArrowRight': '→', 'd': '→', 'D': '→',
            'ArrowDown': '↓', 's': '↓', 'S': '↓'
        };

        this.currentTarget = null;
        this.targetTimer = 0;
        this.flashState = null; // 'green' or 'red'
        this.flashTimer = 0;
        
        this.timerUI = document.getElementById('training-timer');
        this.scoreUI = document.getElementById('training-progress-text');
        this.livesUI = document.getElementById('training-skill-title');
        
        this.handleInput = this.handleInput.bind(this);
    }

    initEventListeners() {
        // Remove existing to avoid duplicates if started multiple times
        window.removeEventListener('keydown', this.handleInput);
        window.addEventListener('keydown', this.handleInput);
    }

    handleInput(e) {
        if (!this.active || !this.currentTarget) return;
        
        const pressedArrow = this.keyMap[e.key];
        if (pressedArrow) {
            e.preventDefault(); // Prevent scrolling
            if (pressedArrow === this.currentTarget) {
                // Correct tap
                this.score++;
                this.flashState = 'green';
                this.flashTimer = 15;
                if (this.score >= this.maxScore) {
                    this.endGame(true, "PARKUR TAMAMLANDI! KONDİSYON ARTTI.");
                    return;
                }
                this.spawnNextArrow();
            } else {
                // Wrong tap
                this.loseLife();
            }
        }
    }

    loseLife() {
        this.lives--;
        this.flashState = 'red';
        this.flashTimer = 15;
        this.spawnNextArrow();
        
        if (this.lives <= 0) {
            this.endGame(false, "ÇOK FAZLA HATA! ANTRENMAN BAŞARISIZ.");
        }
    }

    spawnNextArrow() {
        this.currentTarget = this.arrows[Math.floor(Math.random() * this.arrows.length)];
        this.targetTimer = 90; // 1.5 seconds at 60fps
        this.updateHUD();
    }

    updateHUD() {
        if (this.scoreUI) this.scoreUI.textContent = `${this.score}/${this.maxScore}`;
        if (this.timerUI) this.timerUI.textContent = this.timeLeft.toFixed(1);
        if (this.livesUI) {
            let hearts = '';
            for (let i = 0; i < this.lives; i++) hearts += '❤️';
            for (let i = this.lives; i < 3; i++) hearts += '🖤';
            this.livesUI.textContent = hearts;
        }
    }

    start() {
        this.active = true;
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 44.9;
        this.flashState = null;
        
        // Show 2d canvas, hide 3d canvas just in case
        this.canvas.style.display = 'block';
        document.getElementById('training-canvas-3d').style.display = 'none';
        
        this.initEventListeners();
        this.spawnNextArrow();
        this.updateHUD();
        
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.active = false;
        window.removeEventListener('keydown', this.handleInput);
    }

    endGame(success, message) {
        this.stop();
        // Give one last render
        this.draw();
        setTimeout(() => this.onResult(success, message), 500);
    }

    gameLoop(currentTime = performance.now()) {
        if (!this.active) return;
        
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update timers
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateHUD();
            this.endGame(false, "SÜRE BİTTİ! ANTRENMAN BAŞARISIZ.");
            return;
        }
        
        this.targetTimer -= dt * 60; // Approximate frames
        if (this.targetTimer <= 0 && this.currentTarget) {
            // Timeout, lose life
            this.loseLife();
        }
        
        if (this.flashTimer > 0) this.flashTimer -= dt * 60;

        // Ensure UI updates periodically
        if (Math.floor(this.timeLeft * 10) % 2 === 0) {
            this.updateHUD();
        }

        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background
        this.ctx.fillStyle = '#1a4a1a'; // Dark green grass
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Field lines
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.lineWidth = 2;
        for(let i=0; i<5; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * 100);
            this.ctx.lineTo(this.width, i * 100);
            this.ctx.stroke();
        }

        // Draw Flash
        if (this.flashTimer > 0) {
            this.ctx.fillStyle = this.flashState === 'green' ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw Arrow
        if (this.currentTarget) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 120px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Pulsing effect based on targetTimer (1.5s max -> 90 frames)
            const scale = 1 + (90 - this.targetTimer) * 0.002;
            this.ctx.save();
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(scale, scale);
            
            // Add shadow
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 5;
            
            this.ctx.fillText(this.currentTarget, 0, 0);
            this.ctx.restore();
            
            // Draw progress circle around arrow
            this.ctx.beginPath();
            this.ctx.arc(this.width / 2, this.height / 2, 90, -Math.PI / 2, -Math.PI / 2 + (this.targetTimer / 90) * Math.PI * 2);
            this.ctx.strokeStyle = this.targetTimer > 30 ? '#f1c40f' : '#e74c3c';
            this.ctx.lineWidth = 8;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }
    }
}