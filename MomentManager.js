// MomentManager.js — Full 2D Canvas NSS-style match scene
// No Three.js — pixel-perfect 2D top-down view

export class MomentManager {
    constructor(canvas, onResult) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onResult = onResult;

        // Canvas size — will be set in reset()
        this.W = canvas.width;
        this.H = canvas.height;

        // Ball physics
        this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8, trail: [] };

        // Players
        this.hero = null;
        this.teammates = [];
        this.opponents = [];
        this.goalkeeper = null;

        // State
        this.isActive = false;
        this.isBallInFlight = false;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.passTarget = null;

        // Match info
        this.matchMinute = 0;
        this.scoreHome = 0;
        this.scoreAway = 0;
        this.homeTeamName = 'EAGLES';
        this.awayTeamName = 'WOLVES';
        this.stats = { shooting: 20, passing: 20, dribbling: 20, pace: 20, stamina: 20 };

        this.keeperDifficulty = 'Medium'; // Easy, Medium, Hard
        this.slowMoTimer = 0;
        this.dribbleCooldown = 0;
        this.firstTouchTimer = 0;

        // Keeper reaction delay
        this.keeperReactionTimer = 0;
        this.keeperTargetX = 0;
        
        this.commentary = '';
        this.commentaryTimer = 0;

        // Goal flash
        this.goalFlash = 0;
        this.goalText = '';
        this.savedText = '';
        this.savedTimer = 0;

        // Pitch layout constants (set per reset)
        this.pitch = {};

        this.animFrameId = null;

        // ── Celebration state ──
        this.goalCelebration = false;    // true while celebration plays
        this.celebrationTimer = 0;       // counts up (frames)
        this.celebrationDuration = 150;  // ~2.5 s at 60fps
        this.confetti = [];              // particles
        this.celebrationAngle = 0;       // hero spin angle
        this.shakeFrames = 0;            // canvas shake
        this.shakeX = 0;                 // current shake offset
        this.whiteFlash = 0;             // 0-1 overlay
        this.scorePopTimer = 0;          // +1 pop

        this.initEventListeners();
    }

    // ─────────────────────────── SETUP ───────────────────────────

    reset(stats = {}, matchContext = {}, trainingType = null) {
        this.stats = { shooting: 20, passing: 20, dribbling: 20, pace: 20, stamina: 20, ...stats };
        this.isTraining = !!trainingType;
        this.trainingType = trainingType;
        this.trainingFails = 0;
        
        this.homeTeamName = (matchContext.team || 'EAGLES').toUpperCase();
        this.awayTeamName = (matchContext.opp  || 'WOLVES').toUpperCase();
        this.scoreHome = matchContext.scoreHome || 0;
        this.scoreAway = matchContext.scoreAway || 0;
        this.matchMinute = matchContext.minute  || 0;
        
        this.commentary = '';
        this.commentaryTimer = 0;

        this.W = this.canvas.width;
        this.H = this.canvas.height;

        // Pitch rectangle (inset inside canvas)
        const px = 20, py = 60;
        this.pitch = {
            x: px, y: py,
            w: this.W - px * 2,
            h: this.H - py - 20,
        };
        const p = this.pitch;

        // Goal dimensions
        this.goalW = p.w * 0.38;
        this.goalH = 18;
        this.goalX = p.x + (p.w - this.goalW) / 2;
        this.goalY = p.y;

        // Penalty box
        this.penBoxW = p.w * 0.65;
        this.penBoxH = p.h * 0.18;
        this.penBoxX = p.x + (p.w - this.penBoxW) / 2;
        this.penBoxY = p.y;

        // Ball starting position — centre of pitch
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h * 0.72;
        this.ball = { x: cx, y: cy, vx: 0, vy: 0, radius: 8, trail: [] };

        this.isBallInFlight = false;
        this.isDragging = false;
        this.passTarget = null;
        this.goalFlash = 0;
        this.goalText = '';
        this.savedText = '';
        this.savedTimer = 0;
        this.keeperReactionTimer = 0;
        this.keeperTargetX = cx;
        this.isActive = true;

        this.spawnPlayers();
    }

    spawnPlayers() {
        const p = this.pitch;
        const cx = p.x + p.w / 2;

        // Hero player — bottom centre
        this.hero = {
            x: cx, y: p.y + p.h * 0.72,
            vx: 0, vy: 0, radius: 11,
            color: '#3498db', isHero: true, label: 'YOU'
        };

        // Goalkeeper — on goal line, inside goal
        this.goalkeeper = {
            x: cx, y: p.y + this.goalH / 2,
            vx: 0, vy: 0, radius: 10,
            color: '#f39c12', label: 'GK',
            reactionDelay: 24, // frames
            framesSinceUpdate: 0
        };

        // 4 Blue teammates spread across pitch
        this.teammates = [
            { x: p.x + p.w * 0.20, y: p.y + p.h * 0.45, radius: 10, color: '#3498db', label: 'TM' },
            { x: p.x + p.w * 0.80, y: p.y + p.h * 0.45, radius: 10, color: '#3498db', label: 'TM' },
            { x: p.x + p.w * 0.35, y: p.y + p.h * 0.58, radius: 10, color: '#3498db', label: 'TM' },
            { x: p.x + p.w * 0.65, y: p.y + p.h * 0.58, radius: 10, color: '#3498db', label: 'TM' },
        ];

        // 4 Red defenders
        this.opponents = [
            { x: cx - 70, y: p.y + p.h * 0.28, baseX: cx - 70, baseY: p.y + p.h * 0.28, radius: 10, color: '#e74c3c', label: 'DEF', vx: 0, vy: 0, reactionTimer: 0 },
            { x: cx + 70, y: p.y + p.h * 0.28, baseX: cx + 70, baseY: p.y + p.h * 0.28, radius: 10, color: '#e74c3c', label: 'DEF', vx: 0, vy: 0, reactionTimer: 0 },
            { x: cx - 35, y: p.y + p.h * 0.40, baseX: cx - 35, baseY: p.y + p.h * 0.40, radius: 10, color: '#e74c3c', label: 'DEF', vx: 0, vy: 0, reactionTimer: 0 },
            { x: cx + 35, y: p.y + p.h * 0.40, baseX: cx + 35, baseY: p.y + p.h * 0.40, radius: 10, color: '#e74c3c', label: 'DEF', vx: 0, vy: 0, reactionTimer: 0 },
        ];
    }

    // ─────────────────────────── INPUT ───────────────────────────

    initEventListeners() {
        const xy = (e) => {
            const r = this.canvas.getBoundingClientRect();
            const sx = this.W  / r.width;
            const sy = this.H / r.height;
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
        };

        this.canvas.addEventListener('mousedown', e => this.onPointerDown(xy(e)));
        this.canvas.addEventListener('mousemove', e => this.onPointerMove(xy(e)));
        window.addEventListener('mouseup', () => this.onPointerUp());

        this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this.onPointerDown(xy(e)); }, { passive: false });
        this.canvas.addEventListener('touchmove',  e => { e.preventDefault(); this.onPointerMove(xy(e)); }, { passive: false });
        window.addEventListener('touchend', () => this.onPointerUp());
    }

    onPointerDown(pos) {
        if (!this.isActive || this.isBallInFlight) return;

        // Check if tapping a teammate → pass
        for (const tm of this.teammates) {
            const d = Math.hypot(pos.x - tm.x, pos.y - tm.y);
            if (d < tm.radius + 14) {
                this.executePass(tm);
                return;
            }
        }

        // Otherwise start drag/shoot
        this.isDragging = true;
        this.dragStart = { ...pos };
        this.dragCurrent = { ...pos };
    }

    onPointerMove(pos) {
        if (!this.isDragging) return;
        this.dragCurrent = { ...pos };

        // Dribble mechanic: quick sideways swipe
        const dx = pos.x - this.dragStart.x;
        const dy = pos.y - this.dragStart.y;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 30 && this.dribbleCooldown <= 0) {
            this.executeDribble(dx > 0 ? 1 : -1);
            return;
        }

        // Auto-detect nearest teammate in drag direction
        const dxx = this.dragStart.x - pos.x;
        const dyy = this.dragStart.y - pos.y;
        const len = Math.hypot(dxx, dyy);
        if (len < 5) return;

        const nx = dxx / len, ny = dyy / len;
        this.passTarget = null;
        let bestDot = 0.8; // threshold
        for (const tm of this.teammates) {
            const tx = tm.x - this.ball.x, ty = tm.y - this.ball.y;
            const tl = Math.hypot(tx, ty);
            if (tl === 0) continue;
            const dot = (nx * tx + ny * ty) / tl;
            if (dot > bestDot) { bestDot = dot; this.passTarget = tm; }
        }
    }

    executeDribble(dir) {
        this.dribbleCooldown = 60;
        this.hero.x += dir * 40;
        this.ball.x = this.hero.x;
        this.setCommentary("Şık bir çalım!", 60);
        
        // Find nearest defender and make them "step aside"
        let nearestDef = null, minDist = 100;
        this.opponents.forEach(op => {
            const d = Math.hypot(op.x - this.hero.x, op.y - this.hero.y);
            if (d < minDist) { minDist = d; nearestDef = op; }
        });
        if (nearestDef) {
            nearestDef.x -= dir * 50;
            nearestDef.stunned = 40;
        }
    }

    onPointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;

        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 12) return; // ignore tiny taps

        if (this.passTarget) {
            this.executePass(this.passTarget);
        } else {
            // Shoot
            // Snap to zones
            const snapZone = this.getSnapZone(dx, dy, dist);
            const finalVx = snapZone.vx;
            const finalVy = snapZone.vy;

            // Power Accuracy tradeoff
            const power = Math.min(dist / 90, 2.5);
            const spread = power > 1.8 ? (Math.random() - 0.5) * 40 : 0;
            
            this.fireBall(finalVx + spread/10, finalVy);
        }
        this.passTarget = null;
    }

    getSnapZone(dx, dy, dist) {
        const power = Math.min(dist / 90, 2.5);
        const spd = 4 + power * 5;
        const nx = dx / dist, ny = dy / dist;
        
        // Zones on goal: top-left, top-right, top-center, bottom-left, bottom-right, bottom-center
        // Simply snap the angle to these areas
        const angle = Math.atan2(ny, nx);
        // This is a simplified snapping for the top goal
        return { vx: nx * spd, vy: ny * spd };
    }

    fireBall(vx, vy) {
        this.ball.vx = vx;
        this.ball.vy = vy;
        this.isBallInFlight = true;
        this.ball.trail = [];
        
        const speed = Math.hypot(vx, vy);
        if (speed > 10) this.setCommentary("Harika bir vuruş!", 60);
        else if (this.passTarget) this.setCommentary("Şık bir pas!", 60);

        try { new Audio('assets/audio/kick_ball_sfx.mp3').play().catch(() => {}); } catch(e) {}
    }

    setCommentary(text, frames) {
        this.commentary = text;
        this.commentaryTimer = frames;
    }

    executePass(tm) {
        // Aim ball at teammate
        const dx = tm.x - this.ball.x;
        const dy = tm.y - this.ball.y;
        const dist = Math.hypot(dx, dy);
        const spd = 7;
        this.fireBall((dx / dist) * spd, (dy / dist) * spd);
        this.currentPassTarget = tm;
    }

    // ─────────────────────────── GAME LOOP ───────────────────────────

    start() {
        this.isActive = true;
        this.isBallInFlight = false;
        this.isDragging = false;
        this.momentEnded = false;
        
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        const loop = () => {
            // update() handles celebration, physics, and idle states internally
            this.update();
            this.draw();
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    update() {
        // Celebration tick (runs even when isActive=false)
        if (this.goalCelebration) {
            this.celebrationTimer++;
            // Spin the hero 360 degrees over 60 frames
            this.celebrationAngle = (this.celebrationAngle + 6) % 360;
            // Hero "jump" - oscillate y by ±20px
            this.hero.celebY = this.hero.baseY + Math.sin(this.celebrationTimer * 0.2) * 20;
            // Teammates run toward hero
            this.teammates.forEach(tm => {
                const dx = this.hero.x - tm.x, dy = this.hero.y - tm.y;
                const d = Math.hypot(dx, dy);
                if (d > 10) { tm.x += dx / d * 3; tm.y += dy / d * 3; }
            });
            // Update confetti particles
            this.confetti.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.4; // gravity
                p.life -= 1;
                p.vx *= 0.97;
            });
            this.confetti = this.confetti.filter(p => p.life > 0);
            // Shake
            if (this.shakeFrames > 0) {
                this.shakeFrames--;
                this.shakeX = (this.shakeFrames % 2 === 0) ? 10 : -10;
                this.canvas.style.transform = `translateX(${this.shakeX}px)`;
            } else {
                this.canvas.style.transform = '';
            }
            // White flash fade
            if (this.whiteFlash > 0) this.whiteFlash = Math.max(0, this.whiteFlash - 0.05);
            // Score pop
            if (this.scorePopTimer > 0) this.scorePopTimer--;
            return; // skip normal physics
        }

        if (this.slowMoTimer > 0) {
            this.slowMoTimer--;
            if (this.slowMoTimer % 2 === 0) return; // 0.5x speed
        }

        if (this.dribbleCooldown > 0) this.dribbleCooldown--;

        // Slow-motion tension when ball approaches goal (within 80px of goal line)
        if (this.isBallInFlight && this.ball.y < this.pitch.y + 100 && this.ball.vy < 0) {
            // Apply 0.3x speed by scaling velocities
            const origVx = this.ball.vx, origVy = this.ball.vy;
            this.ball.vx *= 0.3;
            this.ball.vy *= 0.3;
            this.ball.x += this.ball.vx;
            this.ball.y += this.ball.vy;
            this.ball.vx = origVx * 0.982;
            this.ball.vy = origVy * 0.982;
            this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
            if (this.ball.trail.length > 12) this.ball.trail.shift();
            this._updateKeeper();
            this._updateDefenders();
            this._checkBallState();
            return;
        }

        if (!this.isBallInFlight) {
            // Gentle teammate drift
            this.teammates.forEach((tm, i) => {
                const angle = (Date.now() / 2000 + i * 1.3);
                tm.x += Math.cos(angle) * 0.3;
                tm.y += Math.sin(angle * 0.7) * 0.2;
                // Clamp inside pitch
                tm.x = Math.max(this.pitch.x + 15, Math.min(this.pitch.x + this.pitch.w - 15, tm.x));
                tm.y = Math.max(this.pitch.y + this.pitch.h * 0.3, Math.min(this.pitch.y + this.pitch.h - 20, tm.y));
            });
            return;
        }

        // Ball motion
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 12) this.ball.trail.shift();

        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Drag / deceleration
        this.ball.vx *= 0.982;
        this.ball.vy *= 0.982;

        // Keeper AI (Advanced)
        this.goalkeeper.framesSinceUpdate++;
        if (this.goalkeeper.framesSinceUpdate >= this.goalkeeper.reactionDelay) {
            this.keeperTargetX = this.ball.x;
            this.goalkeeper.framesSinceUpdate = 0;
        }

        let kspeed = 4.0; // Increased speed
        if (this.keeperDifficulty === 'Hard') kspeed = 5.5;
        if (this.keeperDifficulty === 'Easy') kspeed = 2.5;

        const kdx = this.keeperTargetX - this.goalkeeper.x;
        if (Math.abs(kdx) > kspeed) {
            this.goalkeeper.x += Math.sign(kdx) * kspeed;
        } else {
            this.goalkeeper.x = this.keeperTargetX;
        }
        
        // Clamp keeper inside goal area + diving range
        this.goalkeeper.x = Math.max(this.goalX - 20, Math.min(this.goalX + this.goalW + 20, this.goalkeeper.x));

        // Balanced Defender AI
        let eligiblePressers = [];
        
        this.opponents.forEach(op => {
            if (op.stunned > 0) return;
            const tdx = this.ball.x - op.x;
            const tdy = this.ball.y - op.y;
            const td = Math.hypot(tdx, tdy);
            
            eligiblePressers.push({ op, td });
        });

        // Sort by distance and pick up to 2
        eligiblePressers.sort((a, b) => a.td - b.td);
        const pressers = eligiblePressers.slice(0, 2).map(p => p.op);

        this.opponents.forEach(op => {
            if (op.stunned > 0) { op.stunned--; return; }
            
            if (pressers.includes(op)) {
                // Pressing logic
                const tdx = this.ball.x - op.x;
                const tdy = this.ball.y - op.y;
                const td = Math.hypot(tdx, tdy);
                const speed = this.dribbleCooldown > 0 ? 0.8 : 1.5;
                if (td > 5) {
                    op.x += (tdx / td) * speed;
                    op.y += (tdy / td) * speed;
                }
            } else {
                // Return to base logic
                const bdx = op.baseX - op.x;
                const bdy = op.baseY - op.y;
                const bd = Math.hypot(bdx, bdy);
                if (bd > 2) {
                    op.x += (bdx / bd) * 1.5;
                    op.y += (bdy / bd) * 1.5;
                }
            }
        });

        // Slow motion trigger (old mechanism kept for non-near-goal slow-mo)
        // (near-goal slow-mo is handled at top of update())

        this._updateKeeper();
        this._updateDefenders();
        this._checkBallState();
    }

    // ─── Helper: keeper AI ───
    _updateKeeper() {
        this.goalkeeper.framesSinceUpdate++;
        const reactionFrames = Math.round(0.4 * 60); // 0.4s delay
        if (this.goalkeeper.framesSinceUpdate >= reactionFrames) {
            this.keeperTargetX = this.ball.x;
            this.goalkeeper.framesSinceUpdate = 0;
        }
        const kspeed = 2.5; // 2.5px/frame — physical movement only
        const kdx = this.keeperTargetX - this.goalkeeper.x;
        if (Math.abs(kdx) > kspeed) {
            this.goalkeeper.x += Math.sign(kdx) * kspeed;
        } else {
            this.goalkeeper.x = this.keeperTargetX;
        }
        this.goalkeeper.x = Math.max(this.goalX - 20, Math.min(this.goalX + this.goalW + 20, this.goalkeeper.x));
    }

    // ─── Helper: defender AI ───
    _updateDefenders() {
        const eligiblePressers = [];
        this.opponents.forEach(op => {
            if (op.stunned > 0) return;
            eligiblePressers.push({ op, td: Math.hypot(this.ball.x - op.x, this.ball.y - op.y) });
        });
        eligiblePressers.sort((a, b) => a.td - b.td);
        const pressers = eligiblePressers.slice(0, 2).map(p => p.op);
        this.opponents.forEach(op => {
            if (op.stunned > 0) { op.stunned--; return; }
            if (pressers.includes(op)) {
                const tdx = this.ball.x - op.x, tdy = this.ball.y - op.y;
                const td = Math.hypot(tdx, tdy);
                const speed = this.dribbleCooldown > 0 ? 0.8 : 1.5;
                if (td > 5) { op.x += (tdx / td) * speed; op.y += (tdy / td) * speed; }
            } else {
                const bdx = op.baseX - op.x, bdy = op.baseY - op.y;
                const bd = Math.hypot(bdx, bdy);
                if (bd > 2) { op.x += (bdx / bd) * 1.5; op.y += (bdy / bd) * 1.5; }
            }
        });
    }

    // ─── Helper: ball boundary + stop checks ───
    _checkBallState() {
        if (this.currentPassTarget) {
            const dt = this.currentPassTarget;
            const d = Math.hypot(this.ball.x - dt.x, this.ball.y - dt.y);
            if (d < dt.radius + 10) {
                // Ball received — snap ball, transfer control
                this.ball.x = dt.x;
                this.ball.y = dt.y;
                this.ball.vx = 0; this.ball.vy = 0;
                this.hero.x = dt.x; this.hero.y = dt.y;
                this.isBallInFlight = false;
                this.currentPassTarget = null;
                return;
            }
        }

        // Defender tackle
        for (const op of this.opponents) {
            if (Math.hypot(this.ball.x - op.x, this.ball.y - op.y) < op.radius + this.ball.radius) {
                this.endMoment(false, 'MÜDAHALE!');
                return;
            }
        }

        // Pitch bounds (out of play)
        const p = this.pitch;
        if (this.ball.x < p.x || this.ball.x > p.x + p.w) {
            if (!this.momentEnded) this.endMoment(false, 'TACA ÇIKTI!');
            return;
        }
        if (this.ball.y < p.y - 10) {
            // Off the top — check goal
            this.checkGoal();
            return;
        }
        if (this.ball.y > p.y + p.h + 10) {
            if (!this.momentEnded) this.endMoment(false, 'ARKADAN ÇIKTI!');
            return;
        }

    }

    // ─── Helper: triggerGoalCelebration ───
    triggerGoalCelebration() {
        this.goalCelebration = true;
        this.celebrationTimer = 0;
        this.shakeFrames = 16; // 8 shakes x 2 directions
        this.whiteFlash = 1.0;
        this.scorePopTimer = 60;
        this.hero.baseY = this.hero.y; // store for oscillation
        this.celebrationAngle = 0;

        // Spawn 50 confetti particles
        this.confetti = [];
        const cx = this.W / 2, cy = this.H / 2;
        const colors = ['#2ecc71','#f1c40f','#ffffff','#FFD700','#00ff88','#ff4757'];
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            this.confetti.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 4 + Math.random() * 6,
                life: 60 + Math.random() * 30,
                maxLife: 90,
            });
        }

        // Play crowd roar
        try { new Audio('assets/audio/crowd_goal_sfx.mp3').play().catch(() => {}); } catch(e) {}

        // Score counter bounce via CSS
        const scoreEl = document.getElementById('match-score-team');
        if (scoreEl) {
            scoreEl.style.transition = 'transform 0.15s, color 0.2s';
            scoreEl.style.color = '#FFD700';
            scoreEl.style.transform = 'translateY(-20px) scale(1.4)';
            setTimeout(() => {
                scoreEl.style.transform = 'translateY(0) scale(1)';
                setTimeout(() => { scoreEl.style.color = ''; }, 1000);
            }, 250);
        }

        // Auto-continue after 2.5s
        setTimeout(() => {
            this.goalCelebration = false;
            this.confetti = [];
            this.canvas.style.transform = '';
            this.onResult(true, 'MUHTEŞEM GOOOL!');
        }, 2500);
    }

    checkGoal() {
        const bx = this.ball.x;
        const goalLeft  = this.goalX;
        const goalRight = this.goalX + this.goalW;

        if (bx >= goalLeft && bx <= goalRight) {
            const goalCenter = (goalLeft + goalRight) / 2;
            const keeperX    = this.goalkeeper.x;

            // --- Zone definitions ---
            const isTopLeftCorner  = bx < goalLeft  + 25;
            const isTopRightCorner = bx > goalRight - 25;
            const isCenter         = Math.abs(bx - goalCenter) < 30;
            const keeperReach      = 55;
            const distToKeeper     = Math.abs(bx - keeperX);

            let isSaved = false;

            if (isTopLeftCorner || isTopRightCorner) {
                // Corners: ALWAYS GOAL — keeper cannot reach
                isSaved = false;
            } else if (isCenter) {
                // Dead center: ALWAYS SAVED
                isSaved = true;
            } else if (distToKeeper < keeperReach) {
                // Within reach: 60% save, 40% goal
                isSaved = Math.random() < 0.60;
            } else {
                // Outside reach: ALWAYS GOAL
                isSaved = false;
            }

            if (isSaved) {
                // Keeper physically dives to ball (capped by reach)
                const diveDir = Math.sign(bx - keeperX);
                this.goalkeeper.x += diveDir * Math.min(keeperReach, distToKeeper);
                this.savedText = 'SAVED!';
                this.savedTimer = 90;
                if (!this.momentEnded) this.endMoment(false, 'KALECİ KURTARDI!');
            } else {
                // Keeper dives but can't reach — GOAL!
                const diveDir = Math.sign(bx - keeperX);
                this.goalkeeper.x += diveDir * Math.min(keeperReach, distToKeeper);
                if (!this.momentEnded) {
                    this.momentEnded = true;
                    this.isActive = false;
                    this.isBallInFlight = false;
                    this.triggerGoalCelebration(); // full celebration sequence
                }
            }
        } else {
            if (!this.momentEnded) this.endMoment(false, 'DIŞARI!');
        }
    }

    endMoment(success, message, type = 'goal') {
        if (this.momentEnded) return;
        this.momentEnded = true;
        
        // Ensure requestAnimationFrame keeps rendering
        this.isActive = false; // Stops physics updates
        this.isBallInFlight = false;
        
        if (this.isTraining) {
            if (!success) {
                this.trainingFails++;
                if (this.trainingFails >= 3) {
                    this.draw();
                    setTimeout(() => this.onResult(false, 'Antrenman başarısız!'), 900);
                    return;
                } else {
                    this.draw();
                    setTimeout(() => {
                        this.reset(this.stats, {}, this.trainingType);
                        this.isActive = true;
                        this.start();
                    }, 1500);
                    return;
                }
            } else {
                this.draw();
                setTimeout(() => this.onResult(true, 'Harika çalışma!'), 900);
                return;
            }
        }

        // Wait 1.5 seconds to show result fully without freezing
        setTimeout(() => {
            this.onResult(success, message, type);
        }, 1500);
    }

    // ─────────────────────────── DRAWING ───────────────────────────

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.W, this.H);

        // Black letterbox
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.W, this.H);

        this.drawPitch();
        this.drawGoal();
        this.drawPlayers();
        this.drawBall();
        if (this.isDragging) this.drawAimLine();
        this.drawHUD();

        // Celebration layer (on top of everything)
        if (this.goalCelebration) {
            this.drawCelebration();
        } else {
            if (this.goalFlash > 0) this.drawGoalFlash();
        }

        if (this.savedTimer > 0) this.drawSavedText();
        if (this.commentaryTimer > 0) this.drawCommentary();
        
        this.goalFlash = Math.max(0, this.goalFlash - 1);
        this.savedTimer = Math.max(0, this.savedTimer - 1);
        this.commentaryTimer = Math.max(0, this.commentaryTimer - 1);
    }

    drawCommentary() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, this.H - 80, this.W, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.commentary, this.W / 2, this.H - 60);
        ctx.restore();
    }

    drawPitch() {
        const ctx = this.ctx;
        const { x, y, w, h } = this.pitch;

        // Diagonal stripe pattern
        const cols = ['#27ae60', '#2ecc71'];
        const stripeW = w / 8;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        for (let i = -2; i < 10; i++) {
            ctx.fillStyle = cols[i % 2 === 0 ? 0 : 1];
            ctx.fillRect(x + i * stripeW, y, stripeW, h);
        }
        // Central gradient highlight
        const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, h * 0.6);
        grad.addColorStop(0, 'rgba(255,255,255,0.04)');
        grad.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        ctx.restore();

        // White pitch lines
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;

        // Sidelines
        ctx.strokeRect(x, y, w, h);

        // Halfway line
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();

        // Centre circle
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w * 0.12, 0, Math.PI * 2);
        ctx.stroke();

        // Centre dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Top penalty box
        const pbX = this.penBoxX, pbY = this.penBoxY, pbW = this.penBoxW, pbH = this.penBoxH;
        ctx.strokeRect(pbX, pbY, pbW, pbH);

        // Bottom penalty box (opponent area at bottom)
        ctx.strokeRect(pbX, y + h - pbH, pbW, pbH);

        // Penalty spots
        ctx.beginPath(); ctx.arc(x + w / 2, pbY + pbH * 0.55, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w / 2, y + h - pbH * 0.55, 3, 0, Math.PI * 2); ctx.fill();

        // Penalty arc (D)
        ctx.beginPath();
        ctx.arc(x + w / 2, pbY + pbH * 0.55, pbH * 0.45, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
    }

    drawGoal() {
        const ctx = this.ctx;
        const gx = this.goalX, gy = this.pitch.y, gw = this.goalW, gh = this.goalH;

        // Net mesh (subtle grey)
        ctx.save();
        ctx.beginPath(); ctx.rect(gx + 2, gy - gh, gw - 4, gh); ctx.clip();
        ctx.strokeStyle = 'rgba(200,200,200,0.35)';
        ctx.lineWidth = 0.8;
        const step = 7;
        for (let nx = gx; nx < gx + gw; nx += step) {
            ctx.beginPath(); ctx.moveTo(nx, gy - gh); ctx.lineTo(nx, gy); ctx.stroke();
        }
        for (let ny = gy - gh; ny < gy + step; ny += step) {
            ctx.beginPath(); ctx.moveTo(gx, ny); ctx.lineTo(gx + gw, ny); ctx.stroke();
        }
        ctx.restore();

        // Goal posts
        const postW = 5;
        // Left post
        ctx.fillStyle = 'white';
        ctx.fillRect(gx - postW / 2, gy - gh, postW, gh + postW / 2);
        // Right post
        ctx.fillRect(gx + gw - postW / 2, gy - gh, postW, gh + postW / 2);
        // Crossbar
        ctx.fillRect(gx - postW / 2, gy - gh, gw + postW, postW);

        // Post shadows for depth
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(gx + postW / 2, gy - gh + 3, 3, gh);
        ctx.fillRect(gx + gw + postW / 2, gy - gh + 3, 3, gh);
    }

    drawPlayers() {
        const ctx = this.ctx;

        // Hero glow ring
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.hero.x, this.hero.y, this.hero.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Draw all player types
        [
            ...this.teammates,
            ...this.opponents,
            this.hero,
            this.goalkeeper,
        ].forEach(pl => this.drawPlayer(pl));

        // Pass target highlight
        if (this.passTarget) {
            ctx.save();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(this.passTarget.x, this.passTarget.y, this.passTarget.radius + 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    drawPlayer(pl) {
        const ctx = this.ctx;
        const r = pl.radius;
        const x = pl.x, y = pl.y;

        // Shadow
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';

        // Body circle (jersey)
        ctx.fillStyle = pl.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Shirt stripe highlight
        const sg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        sg.addColorStop(0, 'rgba(255,255,255,0.25)');
        sg.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Head (small circle above body)
        ctx.fillStyle = '#f0d0a0';
        ctx.beginPath();
        ctx.arc(x, y - r * 0.9, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Direction legs (two lines)
        ctx.strokeStyle = pl.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 4, y + r);
        ctx.lineTo(x - 5, y + r + 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y + r);
        ctx.lineTo(x + 5, y + r + 6);
        ctx.stroke();
    }

    drawBall() {
        const ctx = this.ctx;
        const { x, y, radius, trail } = this.ball;

        // Motion trail
        trail.forEach((pt, i) => {
            const alpha = (i / trail.length) * 0.3;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Drop shadow
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowOffsetY = 3;

        // White base
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Black pentagon pattern (simplified star patches)
        ctx.fillStyle = '#222';
        const angles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
        const pr = radius * 0.38;
        // Centre patch
        ctx.beginPath();
        ctx.arc(x, y, pr * 0.7, 0, Math.PI * 2);
        ctx.fill();
        // 5 outer patches
        angles.forEach(a => {
            const px = x + Math.cos(a) * radius * 0.6;
            const py = y + Math.sin(a) * radius * 0.6;
            ctx.beginPath();
            ctx.arc(px, py, pr * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawAimLine() {
        const ctx = this.ctx;
        const sx = this.ball.x, sy = this.ball.y;
        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) return;

        const nx = dx / dist, ny = dy / dist;
        const power = Math.min(dist / 90, 1);

        // Curved predicted path (parabolic dots)
        ctx.save();
        const steps = 14;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const px = sx + nx * dist * t * 1.2;
            const py = sy + ny * dist * t * 1.2;
            const alpha = 1 - t * 0.7;
            const dotR = 3 * (1 - t * 0.5);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Pass target dotted line
        if (this.passTarget) {
            ctx.save();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(this.passTarget.x, this.passTarget.y);
            ctx.stroke();
            ctx.restore();
        }

        // Power bar (left side)
        const barX = this.pitch.x - 16;
        const barH = this.pitch.h * 0.4;
        const barY = this.pitch.y + this.pitch.h / 2 - barH / 2;
        const barW = 8;
        const filled = barH * power;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();

        const pGrad = ctx.createLinearGradient(barX, barY + barH, barX, barY);
        pGrad.addColorStop(0,   '#2ecc71');
        pGrad.addColorStop(0.6, '#f39c12');
        pGrad.addColorStop(1,   '#e74c3c');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY + barH - filled, barW, filled, 4);
        ctx.fill();

        // Power bar label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 8px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('POW', barX + barW / 2, barY - 5);
    }

    drawHUD() {
        const ctx = this.ctx;
        const W = this.W;

        // Top HUD strip
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.fillRect(0, 0, W, 52);

        // Timer (top left)
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 15px Poppins, Arial';
        ctx.textAlign = 'left';
        const mm = String(Math.floor(this.matchMinute)).padStart(2, '0');
        ctx.fillText(`${mm}:00`, 14, 32);

        // Score (top centre)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.homeTeamName}  ${this.scoreHome} — ${this.scoreAway}  ${this.awayTeamName}`, W / 2, 32);

        // Rating stars (bottom left)
        ctx.fillStyle = '#f1c40f';
        ctx.font = '13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('★★★☆☆', 14, this.H - 14);

        // "TAP BALL OR TEAMMATE" hint when idle
        if (!this.isBallInFlight && !this.isDragging) {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = '11px Poppins, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Topa bas veya arkadaşına pas at', W / 2, this.H - 14);
        }
    }

    drawGoalFlash() {
        const ctx = this.ctx;
        const alpha = Math.min(this.goalFlash / 30, 0.85);

        // White flash overlay
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`;
        ctx.fillRect(0, 0, this.W, this.H);

        // GOAL text
        const scale = 1 + (1 - this.goalFlash / 60) * 0.6;
        ctx.save();
        ctx.translate(this.W / 2, this.H / 2);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 64px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#f39c12';
        ctx.fillText('GOOOL! ⚽', 0, 0);
        ctx.restore();
    }

    drawCelebration() {
        const ctx = this.ctx;
        const t = this.celebrationTimer;  // 0..150
        const W = this.W, H = this.H;

        // 1. White flash overlay (fades over ~6 frames)
        if (this.whiteFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.whiteFlash})`;
            ctx.fillRect(0, 0, W, H);
        }

        // 2. Crowd wave at bottom — flashes of colour strips
        const waveColors = ['#2ecc71','#f1c40f','#e74c3c','#3498db','#e67e22'];
        const waveH = 28;
        for (let i = 0; i < waveColors.length; i++) {
            const waveAlpha = 0.3 + 0.3 * Math.sin(t * 0.25 + i * 1.2);
            ctx.fillStyle = waveColors[i].replace(')', `,${waveAlpha})`).replace('rgb', 'rgba');
            // simple colour blocks
            ctx.globalAlpha = waveAlpha;
            ctx.fillStyle = waveColors[i];
            ctx.fillRect(0, H - waveH - i * 5, W, 8);
        }
        ctx.globalAlpha = 1;

        // 3. Confetti particles
        this.confetti.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, (t * 5 * Math.PI) / 180, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 4. GOOOL! text — animate size 0→ 80px bounce then hold
        const textProgress = Math.min(t / 24, 1); // 0..1 over 0.4s
        const bounce = t > 24 ? 1 + 0.2 * Math.sin((t - 24) * 0.2) * Math.exp(-(t - 24) * 0.03) : 0;
        const textScale = textProgress * (1 + bounce * 0.2);
        const textAlpha = t > 120 ? Math.max(0, (150 - t) / 30) : 1; // fade last 0.5s

        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.translate(W / 2, H * 0.38);
        ctx.scale(textScale, textScale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Black outline
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        ctx.font = 'bold 80px Poppins, Arial';
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'rgba(255,220,0,0.9)';
        ctx.strokeText('GOOOL! ⚽', 0, 0);
        // Yellow fill
        ctx.fillStyle = '#FFE000';
        ctx.fillText('GOOOL! ⚽', 0, 0);
        ctx.restore();

        // 5. +1 floating text next to score
        if (this.scorePopTimer > 0) {
            const rise = (60 - this.scorePopTimer) * 0.7;
            const popAlpha = this.scorePopTimer / 60;
            ctx.save();
            ctx.globalAlpha = popAlpha;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 22px Poppins, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('+1', W * 0.62, 42 - rise);
            ctx.restore();
        }

        // 6. "Devam ediyor..." banner in last 0.7s
        if (t > 107) {
            const bannerAlpha = (t - 107) / 43;
            ctx.save();
            ctx.globalAlpha = bannerAlpha * 0.85;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, H * 0.55, W, 36);
            ctx.globalAlpha = bannerAlpha;
            ctx.fillStyle = 'white';
            ctx.font = '14px Poppins, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Devam ediyor...', W / 2, H * 0.55 + 18);
            ctx.restore();
        }
    }

    drawSavedText() {
        const ctx = this.ctx;
        const alpha = Math.min(this.savedTimer / 30, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 40px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'red';
        ctx.fillText('SAVED!', this.W / 2, this.H * 0.38);
        ctx.restore();
    }
}
