export class ObstacleCourseManager {
    constructor(canvas, onResult) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onResult = onResult;
        this.width = canvas.width;
        this.height = canvas.height;

        this.player = {
            x: this.width / 2,
            y: this.height - 80,
            radius: 15,
            targetX: this.width / 2
        };

        this.obstacles = [];
        this.active = false;
        this.score = 0;
        this.speed = 4;
        this.spawnTimer = 0;
        this.distance = 0;
        this.targetDistance = 1000;

        this.initEventListeners();
    }

    initEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleInput(e.offsetX));
        this.canvas.addEventListener('touchstart', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.handleInput(e.touches[0].clientX - rect.left);
        });
    }

    handleInput(x) {
        if (!this.active) return;
        this.player.targetX = x;
    }

    start() {
        this.active = true;
        this.score = 0;
        this.distance = 0;
        this.obstacles = [];
        this.speed = 4;
        this.gameLoop();
    }

    stop() {
        this.active = false;
    }

    gameLoop() {
        if (!this.active) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Move player towards target
        const dx = this.player.targetX - this.player.x;
        this.player.x += dx * 0.2;

        // Spawn obstacles (cones)
        this.spawnTimer++;
        if (this.spawnTimer > 30) {
            this.obstacles.push({
                x: 30 + Math.random() * (this.width - 60),
                y: -20,
                width: 30,
                height: 30,
                type: Math.random() < 0.2 ? 'bonus' : 'hazard'
            });
            this.spawnTimer = 0;
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.y += this.speed;

            // Collision detection
            const distX = Math.abs(this.player.x - obs.x);
            const distY = Math.abs(this.player.y - obs.y);

            if (distX < this.player.radius + 10 && distY < this.player.radius + 10) {
                if (obs.type === 'hazard') {
                    this.active = false;
                    this.onResult(false, "ENGELE ÇARPTIN! DAYANIKLILIK YETERSİZ.");
                    return;
                } else {
                    this.score += 5;
                    this.obstacles.splice(i, 1);
                    continue;
                }
            }

            if (obs.y > this.height) {
                this.obstacles.splice(i, 1);
            }
        }

        this.distance += this.speed;
        this.speed += 0.001; // Accelerate

        if (this.distance >= this.targetDistance) {
            this.active = false;
            this.onResult(true, "PARKUR TAMAMLANDI! KONDİSYON ARTTI.");
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Grass Background
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Running track lines
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
            const x = (this.width / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Obstacles
        for (const obs of this.obstacles) {
            if (obs.type === 'hazard') {
                this.ctx.fillStyle = '#e67e22'; // Orange cone
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, obs.y - 15);
                this.ctx.lineTo(obs.x - 15, obs.y + 15);
                this.ctx.lineTo(obs.x + 15, obs.y + 15);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#3498db'; // Water bottle
                this.ctx.fillRect(obs.x - 8, obs.y - 15, 16, 30);
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(obs.x - 8, obs.y - 5, 16, 5);
            }
        }

        // Player
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Distance progress bar at top
        const progress = this.distance / this.targetDistance;
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(50, 20, this.width - 100, 10);
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillRect(50, 20, (this.width - 100) * progress, 10);
    }
}