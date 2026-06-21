import { CareerManager } from './CareerManager.js';
import { MomentManager } from './MomentManager.js';
import { ObstacleCourseManager } from './ObstacleCourseManager.js';

class Game {
    constructor() {
        this.career = new CareerManager();
        this.career.onUpdate = () => this.refreshUI(); // Set callback for data changes
        this.career.onTrophyWon = (trophy) => this.notify(`YENİ KUPA: ${trophy.name}!`, trophy.icon);
        
        this.currentScreen = 'screen-creation';
        this.trainingActive = false;
        this.trainingScore = 0;
        this.trainingTotalNeeded = 5;
        this.trainingTimeLeft = 5.0;
        this.trainingSkillId = null;
        this.trainingLives = 3;

        this.initEventListeners();
        this.initUI();
        this.renderSkills();
        this.renderStore();
        
        const canvas = document.getElementById('pitch-canvas');
        // Canvas is sized each time triggerMoment() makes the screen visible
        // Set a default internal resolution so it is valid on first use
        canvas.width  = 400;
        canvas.height = 700;
        window.addEventListener('resize', () => {
            const r = canvas.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                canvas.width  = Math.round(r.width);
                canvas.height = Math.round(r.height);
            }
        });
        this.momentManager = new MomentManager(canvas, (success, message, type) => this.onMomentResult(success, message, type));
        
        const trainingCanvas3d = document.getElementById('training-canvas-3d');
        const trainingCanvas2d = document.getElementById('training-canvas-2d');
        if (trainingCanvas3d && trainingCanvas2d) {
            this.trainingMomentManager = new MomentManager(trainingCanvas3d, (success, msg, type) => this.onTrainingMomentResult(success, msg, type));
            this.staminaManager = new ObstacleCourseManager(trainingCanvas2d, (success, msg) => this.onTrainingMomentResult(success, msg));
        }
    }

    initEventListeners() {
        // Career Creation Start
        const btnStartCareer = document.getElementById('btn-start-career');
        if (btnStartCareer) {
            btnStartCareer.addEventListener('click', () => {
                const nameInput = document.getElementById('input-player-name');
                const teamSelect = document.getElementById('select-team');
                
                const name = nameInput ? nameInput.value.trim() : "Oyuncu";
                const teamName = teamSelect ? teamSelect.value : "Beşiktaş";
                
                if (!name) {
                    this.notify("Lütfen bir isim giriniz!", "⚠️");
                    return;
                }

                this.career.playerName = name;
                this.career.team = teamName;
                
                // Assign selected team with a full season contract
                this.career.currentClub = { 
                    name: teamName, 
                    tier: 1, 
                    matchesLeft: 14 
                };
                
                this.career.setRandomWeather(); 
                this.career.updateUI();
                this.switchScreen('screen-dashboard');
                
                this.notify(`${teamName} ile 14 maçlık sözleşme imzaladın! Başarılar dileriz.`, "🤝");
            });
        }

        // Pre-Match Navigation
        const btnPreMatch = document.getElementById('btn-pre-match');
        if (btnPreMatch) {
            btnPreMatch.addEventListener('click', () => {
                this.switchScreen('screen-pre-match');
            });
        }

        const btnCancelPreMatch = document.getElementById('btn-cancel-pre-match');
        if (btnCancelPreMatch) {
            btnCancelPreMatch.addEventListener('click', () => {
                this.switchScreen('screen-dashboard');
            });
        }

        // Rest Action
        const btnRest = document.getElementById('btn-rest');
        if (btnRest) {
            btnRest.addEventListener('click', () => {
                if (this.career.energy >= 100) {
                    this.notify("Enerjin zaten tam dolu!", "⚡");
                    return;
                }
                this.career.energy = Math.min(100, this.career.energy + 25);
                
                const passiveEarned = this.career.processPassiveIncome();
                this.career.updateUI();
                
                let msg = "Güzel bir uyku çektin. Enerji +25";
                if (passiveEarned > 0) {
                    msg += `\nMarka Elçiliği Geliri: +$${passiveEarned.toLocaleString()}`;
                }
                this.notify(msg, "💤");
            });
        }

        // Play Match
        const btnPlayMatch = document.getElementById('btn-play-match');
        if (btnPlayMatch) {
            btnPlayMatch.addEventListener('click', () => {
                const tacticEl = document.getElementById('select-tactic');
                const focusEl = document.getElementById('select-focus');
                
                const tactic = tacticEl ? tacticEl.value : 'balanced';
                const focus = focusEl ? focusEl.value : 'balanced';
                
                this.matchSettings = { tactic, focus };
                
                let baseDrain = 15;
                if (tactic === 'offensive') baseDrain = 22;
                if (tactic === 'defensive') baseDrain = 10;
                
                if (this.career.energy < baseDrain) {
                    this.notify("Enerjin çok düşük! Maçtan önce biraz dinlenmen gerekiyor.", "⚠️");
                    this.switchScreen('screen-dashboard');
                    return;
                }
                
                this.career.drainEnergy(baseDrain);
                
                // Big Match Check (Tier 4+ or Cup Final)
                const isBigMatch = this.career.currentClub.tier >= 4 || Math.random() < 0.2; 
                
                if (isBigMatch) {
                    this.showStadiumEntry();
                } else {
                    this.startMatch();
                }
            });
        }

        const btnToPress = document.getElementById('btn-to-press');
        if (btnToPress) {
            btnToPress.addEventListener('click', () => {
                this.showPressConference();
            });
        }

        const btnRenewContract = document.getElementById('btn-renew-contract');
        if (btnRenewContract) {
            btnRenewContract.addEventListener('click', () => {
                this.notify(`${this.career.currentClub.name} ile sözleşmeni yenilemek istiyor musun?`, "🤝", () => {
                    this.startTransferNegotiation(this.career.currentClub.name);
                });
            });
        }

        // Save Summary Logic
        const btnSaveSummary = document.getElementById('btn-save-summary');
        if (btnSaveSummary) {
            btnSaveSummary.addEventListener('click', () => {
                this.notify("Maç özeti galerinize kaydedildi!", "📸");
            });
        }

        const selectLeagueView = document.getElementById('select-league-view');
        if (selectLeagueView) {
            selectLeagueView.addEventListener('change', () => {
                this.renderLeagueTable();
            });
        }

        // Energy Shop
        document.querySelectorAll('.btn-buy-energy').forEach(btn => {
            btn.onclick = () => {
                const type = btn.getAttribute('data-type');
                const res = this.career.buyEnergyDrink(type);
                if (res.success) {
                    this.notify(res.message, "🥤");
                    this.refreshUI();
                } else {
                    this.notify(res.message, "❌");
                }
            };
        });
    }

    initUI() {
        // Tab Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Energy Refill Logic
        const energyPill = document.querySelector('.resource-pill:first-child');
        if (energyPill) {
            energyPill.style.cursor = 'pointer';
            energyPill.title = 'Enerji Satın Al';
            energyPill.innerHTML += `<div style="font-size: 0.6rem; color: var(--primary); margin-top: 2px;">🎬 ÜCRETSİZ</div>`;
            energyPill.onclick = () => {
                this.notify("Bir reklam izleyerek 30 Enerji kazanmak ister misin?", "🎬", () => {
                    this.showAdSimulation(() => {
                        this.career.energy = Math.min(100, this.career.energy + 30);
                        this.career.updateUI();
                    });
                });
            };
        }

        const btnRestore = document.getElementById('btn-restore-purchases');
        if (btnRestore) {
            btnRestore.onclick = () => {
                this.notify("Satın alımlar geri yüklendi.", "🔄");
            };
        }
    }

    notify(message, icon = 'ℹ️', onConfirm = null, onCancel = null) {
        const overlay = document.getElementById('game-notification');
        const msgEl = document.getElementById('notif-message');
        const iconEl = document.getElementById('notif-icon');
        const okBtn = document.getElementById('notif-btn');
        const cancelBtn = document.getElementById('notif-cancel-btn');

        msgEl.textContent = message;
        iconEl.textContent = icon;
        overlay.classList.add('active');

        if (onCancel) {
            cancelBtn.style.display = 'block';
            cancelBtn.onclick = () => {
                overlay.classList.remove('active');
                onCancel();
            };
        } else {
            cancelBtn.style.display = 'none';
        }

        okBtn.onclick = () => {
            overlay.classList.remove('active');
            if (onConfirm) onConfirm();
        };
    }

    refreshUI() {
        const moneyEl = document.getElementById('txt-money-val');
        if (moneyEl) moneyEl.textContent = `$${Math.floor(this.career.balance).toLocaleString()}`; 

        const marketValueEl = document.getElementById('txt-market-value');
        if (marketValueEl) marketValueEl.textContent = `$${this.career.marketValue.toLocaleString()}`;

        const jerseyIncomeEl = document.getElementById('txt-jersey-income');
        if (jerseyIncomeEl) jerseyIncomeEl.textContent = `$${this.career.jerseySalesIncome.toLocaleString()}`;
        
        const energyEl = document.getElementById('txt-energy-val');
        if (energyEl) energyEl.textContent = Math.floor(this.career.energy);

        const moraleStatus = this.career.getMoraleStatus();
        const popEl = document.getElementById('txt-pop-val');
        if (popEl) popEl.innerHTML = `${Math.floor(this.career.popularity)} <span style="font-size:0.7rem; margin-left:4px;">${moraleStatus.emoji}</span>`;

        const followersEl = document.getElementById('txt-followers-val');
        if (followersEl) followersEl.textContent = this.career.followers.toLocaleString();

        const socialFollowersEl = document.getElementById('social-follower-count');
        if (socialFollowersEl) socialFollowersEl.textContent = this.career.followers.toLocaleString();

        const socialNameEl = document.getElementById('social-profile-name');
        if (socialNameEl) socialNameEl.textContent = `@${this.career.playerName.replace(/\s/g, '')}`;

        const socialBioEl = document.getElementById('social-persona-bio');
        if (socialBioEl) socialBioEl.textContent = this.career.getMediaPersona();
        
        const weatherEl = document.getElementById('txt-weather');
        if (weatherEl) weatherEl.textContent = this.career.weather.label;

        const teamNameEl = document.getElementById('txt-team-name');
        const fixtureHomeEl = document.getElementById('txt-fixture-home');
        
        const currentClubName = this.career.currentClub ? this.career.currentClub.name : "KULÜPSÜZ";
        if (teamNameEl) teamNameEl.textContent = currentClubName;
        if (fixtureHomeEl) fixtureHomeEl.textContent = currentClubName.toUpperCase();

        // Contract Status
        const contractStatusEl = document.getElementById('txt-contract-status');
        const renewBtn = document.getElementById('btn-renew-contract');
        const preMatchBtn = document.getElementById('btn-pre-match');
        
        if (this.career.currentClub && this.career.currentClub.matchesLeft !== undefined) {
            const matches = this.career.currentClub.matchesLeft;
            contractStatusEl.textContent = matches > 0 ? `${matches} MAÇ KALDI` : "SÖZLEŞME BİTTİ";
            contractStatusEl.style.color = matches <= 2 ? 'var(--danger)' : 'var(--primary)';
            
            renewBtn.style.display = matches <= 3 ? 'block' : 'none';
            preMatchBtn.style.display = matches > 0 ? 'block' : 'none';
        } else {
            contractStatusEl.textContent = "SÖZLEŞMEN YOK";
            contractStatusEl.style.color = 'var(--danger)';
            renewBtn.style.display = 'none';
            preMatchBtn.style.display = 'none';
        }

        // Player Status & Progress
        const status = this.career.getPlayerStatus();
        const statusTitleEl = document.getElementById('txt-status-title');
        if (statusTitleEl) {
            statusTitleEl.textContent = status.title;
            statusTitleEl.style.color = status.color;
            statusTitleEl.style.borderColor = status.color;
        }

        const personaEl = document.getElementById('txt-media-persona');
        if (personaEl) {
            personaEl.textContent = this.career.getMediaPersona();
        }

        const currentRankEl = document.getElementById('txt-current-rank');
        if (currentRankEl) currentRankEl.textContent = status.title;

        const nextRankEl = document.getElementById('txt-next-rank');
        const progressBarEl = document.getElementById('bar-status-progress');
        
        const rankList = [
            "Amatör", "Yerel Marka", "Sosyal Figür", "Elit Sporcu", "Küresel İkon", "Efsanevi Milyarder"
        ];
        const currentRankIdx = rankList.indexOf(status.title);
        if (currentRankIdx < rankList.length - 1) {
            const nextRank = rankList[currentRankIdx + 1];
            if (nextRankEl) nextRankEl.textContent = `Sonraki: ${nextRank}`;
            
            // Progress based on purchased items. Thresholds: 1, 2, 3, 4, 5
            const threshold = currentRankIdx + 1;
            const currentOwned = this.career.purchasedItems.length;
            const progress = (currentOwned / threshold) * 100;
            if (progressBarEl) progressBarEl.style.width = `${Math.min(100, progress)}%`;
        } else {
            if (nextRankEl) nextRankEl.textContent = "ZİRVEDESİN";
            if (progressBarEl) progressBarEl.style.width = "100%";
        }

        // Relationship Bars
        const rels = this.career.relationships;
        if (document.getElementById('rel-fill-coach')) document.getElementById('rel-fill-coach').style.width = `${rels.coach}%`;
        if (document.getElementById('rel-fill-team')) document.getElementById('rel-fill-team').style.width = `${rels.team}%`;
        if (document.getElementById('rel-fill-fans')) document.getElementById('rel-fill-fans').style.width = `${rels.fans}%`;
        
        if (document.getElementById('val-rel-coach')) document.getElementById('val-rel-coach').textContent = `${rels.coach}%`;
        if (document.getElementById('val-rel-team')) document.getElementById('val-rel-team').textContent = `${rels.team}%`;
        if (document.getElementById('val-rel-fans')) document.getElementById('val-rel-fans').textContent = `${rels.fans}%`;

        this.renderSkills();
        this.renderSponsorships();
        this.renderLifestyleGallery();
    }

    renderLifestyleGallery() {
        const container = document.getElementById('lifestyle-gallery');
        if (!container) return;
        container.innerHTML = '';

        const ownedItems = this.career.lifestyleItems.filter(item => 
            this.career.purchasedItems.includes(item.id)
        );

        if (ownedItems.length === 0) {
            container.innerHTML = `<p style="grid-column: span 3; color: var(--text-muted); font-size: 0.7rem; text-align: center;">Henüz lüks bir eşyan yok...</p>`;
            return;
        }

        ownedItems.forEach(item => {
            const el = document.createElement('div');
            el.className = 'lifestyle-gallery-item';
            el.innerHTML = `
                <div class="icon">${item.icon}</div>
                <div class="label">${item.name}</div>
            `;
            container.appendChild(el);
        });

        for (let i = ownedItems.length; i < 3; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'lifestyle-gallery-item empty';
            placeholder.innerHTML = `<div class="icon">❓</div>`;
            container.appendChild(placeholder);
        }
    }

    renderStore() {
        const container = document.querySelector('.store-grid');
        if (!container) return;
        container.innerHTML = '';

        const packages = [
            { id: 'ad_free', title: 'REKLAMSIZ OYNAMA', desc: 'Tüm reklamları kalıcı olarak kaldırır.', price: '₺49.99', badge: 'EN POPÜLER', class: 'premium' },
            { id: 'starter', title: 'BAŞLANGIÇ PAKETİ', desc: '$10.000, Premium Krampon, 500 Enerji.', price: '₺19.99', badge: 'YENİ OYUNCULAR', class: 'starter' },
            { id: 'star', title: 'YILDIZ PAKETİ', desc: '$25.000, Tüm Kramponlar, 2x XP.', price: '₺49.99', badge: 'EN İYİ DEĞER', class: 'star' },
            { id: 'legend', title: 'EFSANE PAKETİ', desc: '$75.000, Max İstatistikler, VIP Rozeti.', price: '₺99.99', badge: 'GERÇEK YILDIZ', class: 'legend' },
            { id: 'energy', title: 'ENERJİ PAKETİ', desc: 'Anında +500 Enerji.', price: '₺9.99', badge: 'ÜRETKENLİK', class: 'energy' }
        ];

        packages.forEach(pkg => {
            const el = document.createElement('div');
            el.className = `store-card ${pkg.class}`;
            el.innerHTML = `
                <div class="package-badge">${pkg.badge}</div>
                <div class="package-title">${pkg.title}</div>
                <div class="package-desc">${pkg.desc}</div>
                <div class="package-price">${pkg.price}</div>
            `;
            el.onclick = () => this.handlePurchase(pkg);
            container.appendChild(el);
        });
    }

    handlePurchase(pkg) {
        this.notify(`${pkg.title} paketini ${pkg.price} karşılığında almak istiyor musunuz?`, "🛒", () => {
            this.career.applyPackage(pkg.id);
            this.notify("Satın alım başarılı! Keyifli oyunlar.", "✅");
        });
    }

    showAdSimulation(callback) {
        if (this.career.isPremium) {
            if (callback) callback();
            return;
        }
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.background = 'black';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
        overlay.innerHTML = `<div style="color:white; text-align:center;"><p>REKLAM OYNATILIYOR...</p><h1 id="ad-timer">5</h1></div>`;
        document.body.appendChild(overlay);

        let t = 5;
        const intr = setInterval(() => {
            t--;
            const timerEl = document.getElementById('ad-timer');
            if (timerEl) timerEl.textContent = t;
            if (t <= 0) {
                clearInterval(intr);
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                if (callback) callback();
            }
        }, 1000);
    }

    renderSponsorships() {
        const container = document.getElementById('sponsorships-list');
        const countEl = document.getElementById('txt-active-sponsors-count');
        if (!container) return;

        if (countEl) countEl.textContent = `${this.career.activeSponsorships.length}/2 AKTİF`;

        const luxuryMultiplier = this.career.getLuxuryBonusMultiplier();
        const luxuryBonusPercent = Math.round((luxuryMultiplier - 1) * 100);

        container.innerHTML = '';
        
        // Passive Endorsements Section
        const passiveHeader = document.createElement('h4');
        passiveHeader.textContent = "Marka Elçiliği (Pasif Gelir)";
        passiveHeader.className = 'lifestyle-cat-title';
        passiveHeader.style.color = 'var(--accent-blue)';
        passiveHeader.style.marginTop = '10px';
        container.appendChild(passiveHeader);

        this.career.endorsements.forEach(deal => {
            const isActive = this.career.activeEndorsements.includes(deal.id);
            const isUnlocked = this.career.followers >= deal.reqFans;
            
            const card = document.createElement('div');
            card.className = 'luxury-item'; 
            card.style.border = isActive ? '1.5px solid var(--accent-blue)' : '1px solid #eee';
            card.style.opacity = isUnlocked ? '1' : '0.6';

            const finalPassive = Math.floor(deal.passive * luxuryMultiplier);

            card.innerHTML = `
                <div class="luxury-info">
                    <div class="luxury-icon-box" style="color:var(--accent-blue);">${deal.icon}</div>
                    <div>
                        <div class="luxury-name">${deal.name}</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${deal.desc}</div>
                        <div style="font-size:0.75rem; color:var(--accent-blue); font-weight:700; margin-top:2px;">
                            $${finalPassive} / Aksiyon
                        </div>
                    </div>
                </div>
                <div>
                    ${isActive ? 
                        `<span class="badge-gold" style="background:var(--accent-blue);">AKTİF</span>` :
                        (isUnlocked ? 
                            `<button class="btn btn-sign-passive btn-action-sm" data-id="${deal.id}" style="background:var(--accent-blue); color:white;">İMZALA</button>` :
                            `<span style="font-size:0.6rem; color:#888; font-weight:700;">🔒 ${deal.reqFans.toLocaleString()} TAKİPÇİ</span>`
                        )
                    }
                </div>
            `;
            container.appendChild(card);
        });

        // Event listener for passive deals
        container.querySelectorAll('.btn-sign-passive').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                if (this.career.signEndorsement(id)) {
                    this.notify("Marka elçisi oldun! Artık her dinlendiğinde veya antrenman yaptığında bu geliri alacaksın.", "🤝");
                }
            };
        });

        const activeHeader = document.createElement('h4');
        activeHeader.textContent = "Maç Başı Sponsorluklar";
        activeHeader.className = 'lifestyle-cat-title';
        activeHeader.style.marginTop = '20px';
        container.appendChild(activeHeader);

        this.career.sponsorships.forEach(deal => {
            const activeDeal = this.career.activeSponsorships.find(d => d.id === deal.id);
            const isActive = !!activeDeal;
            const isUnlocked = this.career.followers >= deal.reqFans && 
                              this.career.purchasedItems.length >= deal.reqItems;
            
            const card = document.createElement('div');
            card.className = 'luxury-item'; 
            card.style.border = isActive ? '1.5px solid var(--primary)' : '1px solid #eee';
            card.style.opacity = isUnlocked ? '1' : '0.6';

            const baseBonus = activeDeal ? activeDeal.negotiatedBonus : deal.bonus;
            const finalBonus = Math.floor(baseBonus * luxuryMultiplier);

            card.innerHTML = `
                <div class="luxury-info">
                    <div class="luxury-icon-box" style="color:var(--primary);">${deal.icon}</div>
                    <div>
                        <div class="luxury-name">${deal.name}</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${deal.description}</div>
                        <div style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-top:2px;">
                            $${finalBonus} / Maç 
                            ${isActive ? `<span style="color:var(--gold); margin-left:8px;">⏱️ ${activeDeal.matchesLeft} maç</span>` : ''}
                        </div>
                    </div>
                </div>
                <div>
                    ${isActive ? 
                        `<button class="btn btn-cancel btn-action-sm" data-id="${deal.id}" style="background:var(--danger); color:white;">İPTAL</button>` :
                        (isUnlocked ? 
                            `<button class="btn btn-sign btn-action-sm" data-id="${deal.id}" style="background:var(--primary); color:white;">MÜZAKERE</button>` :
                            `<span style="font-size:0.6rem; color:#888; font-weight:700;">🔒 ${deal.reqFans.toLocaleString()} TAKİPÇİ</span>`
                        )
                    }
                </div>
            `;
            container.appendChild(card);
        });

        // Add event listeners to buttons
        container.querySelectorAll('.btn-sign').forEach(btn => {
            btn.onclick = () => this.startNegotiation(btn.getAttribute('data-id'));
        });
        container.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.onclick = () => this.career.cancelSponsorship(btn.getAttribute('data-id'));
        });
    }

    startNegotiation(dealId) {
        const deal = this.career.sponsorships.find(d => d.id === dealId);
        if (!deal) return;

        this.switchScreen('screen-negotiation');
        this.negotiationState = {
            deal,
            currentBonus: deal.bonus,
            patience: 100
        };
        this.updateNegotiationUI();
    }

    updateNegotiationUI() {
        const { deal, currentBonus, patience } = this.negotiationState;
        document.getElementById('neg-title').textContent = `${deal.name} Pazarlığı`;
        document.getElementById('neg-icon').textContent = deal.icon;
        document.getElementById('neg-current-bonus').textContent = `$${currentBonus} / Maç`;
        document.getElementById('txt-neg-patience').textContent = `${patience}%`;
        document.getElementById('bar-neg-patience').style.width = `${patience}%`;

        const optionsEl = document.getElementById('neg-options');
        optionsEl.innerHTML = '';

        const actions = [
            { t: "Teklifi Kabul Et", type: 'accept', style: 'btn-primary' },
            { t: "Daha Fazla İste (+10%)", type: 'push', power: 0.1, risk: 20 },
            { t: "Çok Daha Fazla İste (+25%)", type: 'push', power: 0.25, risk: 45 }
        ];

        // Reputation-based options
        if (this.career.reputation >= 50) {
            actions.push({ t: "🌟 Yükselen Yıldız Hitabı (+15%)", type: 'rep_push', power: 0.15, patienceGain: 10, risk: 15 });
        }
        if (this.career.reputation >= 150) {
            actions.push({ t: "📢 Marka Elçisi Sözü (+30%)", type: 'rep_push', power: 0.30, risk: 10 });
        }
        if (this.career.reputation >= 400) {
            actions.push({ t: "👑 Efsanevi Statü Talebi (+60%)", type: 'rep_push', power: 0.60, risk: 5 });
        }

        // Always keep the high-risk bluff
        actions.push({ t: "🃏 Blöf Yap! (+50%)", type: 'push', power: 0.5, risk: 75 });

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `btn ${action.style || ''}`;
            btn.textContent = action.t;
            btn.onclick = () => this.handleNegotiationAction(action);
            optionsEl.appendChild(btn);
        });
    }

    handleNegotiationAction(action) {
        if (action.type === 'accept') {
            this.finishNegotiation(true);
            return;
        }

        const isRepAction = action.type === 'rep_push';
        const successChance = 100 - (action.risk || 0);
        const success = Math.random() * 100 < successChance;

        if (success) {
            this.negotiationState.currentBonus = Math.floor(this.negotiationState.currentBonus * (1 + action.power));
            if (action.patienceGain) {
                this.negotiationState.patience = Math.min(100, this.negotiationState.patience + action.patienceGain);
                this.notify(`Etkileyici konuşma! Sponsor ikna oldu ve sabrı arttı. (+%${action.patienceGain} Sabır)`, "📢");
            } else {
                this.notify("Pazarlık başarılı! Teklif yükseltildi.", "📈");
            }
        } else {
            this.negotiationState.patience -= (action.risk || 20);
            this.notify(isRepAction ? "Sponsor bu kadar büyük konuşmana pek inanmadı..." : "Sponsor bu talepten hoşlanmadı...", "👎");
        }

        if (this.negotiationState.patience <= 0) {
            this.notify("Sponsor masadan kalktı! Pazarlık başarısız.", "🛑", () => {
                this.finishNegotiation(false);
            });
        } else {
            this.updateNegotiationUI();
        }
    }

    finishNegotiation(success) {
        if (success) {
            const { deal, currentBonus, isTransfer, clubName } = this.negotiationState;
            if (isTransfer) {
                this.career.balance += currentBonus;
                this.career.team = clubName;
                // Find league of the new club
                for (const lid in this.career.leagues) {
                    if (this.career.leagues[lid].teams.includes(clubName)) {
                        this.career.currentLeagueId = lid;
                        break;
                    }
                }
                this.career.transferTo(clubName);
                this.notify(`${clubName} kulübüne transfer oldun! İmza Bonusu: $${currentBonus.toLocaleString()}`, "🏟️");
            } else {
                this.career.signSponsorship(deal.id, currentBonus);
                this.generateFanReactions(deal, currentBonus);
            }
        }
        this.career.updateUI();
        this.switchScreen('screen-dashboard');
    }

    startTransferNegotiation(clubName) {
        const club = this.career.clubs.find(c => c.name === clubName);
        if (!club) return;

        // Base signing bonus based on club tier
        const baseBonus = club.tier * 500 + Math.floor(this.career.reputation * 5);
        
        this.switchScreen('screen-negotiation');
        this.negotiationState = {
            deal: { name: club.name, icon: '🏟️', bonus: baseBonus },
            currentBonus: baseBonus,
            patience: 100,
            isTransfer: true,
            clubName: club.name
        };
        this.updateNegotiationUI();
    }

    generateFanReactions(deal, bonus) {
        const list = document.getElementById('social-feed-list');
        if (!list) return;

        // Clear placeholder if it exists
        if (list.querySelector('p')) list.innerHTML = '';

        const usernames = ["GolMakinesi", "UltraFan99", "FutbolAsigi", "Kaptan10", "TransferGurusu", "SahadakiZeka"];
        const avatars = ["⚽", "🔥", "📣", "💎", "⭐", "🧤"];
        
        const isBluff = bonus > (deal.bonus * 1.5);
        const isPrestigious = deal.reqFans >= 80;

        let templates = [
            `Müthiş bir anlaşma! ${deal.name} ile yolların kesişmesi gurur verici.`,
            `Geleceğin parlayan yıldızı dedik, yanılmadık. Tebrikler!`,
            `Yeni kramponlar yolda mı? 😂 @${this.career.playerName}`,
            `Bu çocuk sadece gol atmıyor, işi de biliyor.`
        ];

        if (isBluff) {
            templates.push(`Oha! O bonus ne? Sponsoru resmen soymuşuz. HELAL!`);
            templates.push(`Parayı bulduk ama sahada da görmek istiyoruz performansı.`);
        }

        if (isPrestigious) {
            templates.push(`Dünya devi ${deal.name} ile anlaşmak mı? Seviye atladık!`);
            templates.push(`Artık bir süperstar olduğunu kanıtladın.`);
        }

        // Generate 2-3 random reactions
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const user = usernames[Math.floor(Math.random() * usernames.length)];
            const avatar = avatars[Math.floor(Math.random() * avatars.length)];
            const text = templates[Math.floor(Math.random() * templates.length)];
            
            const post = document.createElement('div');
            post.className = 'fan-post';
            post.innerHTML = `
                <div class="fan-avatar">${avatar}</div>
                <div class="fan-content">
                    <div class="fan-user">@${user}</div>
                    <div class="fan-text">${text}</div>
                    <div class="fan-time">Az önce</div>
                </div>
            `;
            list.prepend(post);
        }
    }

    switchScreen(id) {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        this.currentScreen = id;
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const targetTab = document.getElementById(`tab-content-${tabId}`);
        if (targetTab) targetTab.classList.add('active');
        
        if (tabId === 'shop') this.renderMarket();
        if (tabId === 'training') this.renderTrainingTab();
        if (tabId === 'collection') this.renderCollection();
        if (tabId === 'social') this.renderSocialFeed();
        if (tabId === 'lifestyle') this.renderLifestyleMenu();
        if (tabId === 'league') this.renderLeagueTable();
    }

    renderLeagueTable() {
        const leagueId = document.getElementById('select-league-view').value;
        const body = document.getElementById('league-table-body');
        if (!body) return;
        body.innerHTML = '';

        const standings = this.career.standings[leagueId];
        const sorted = [...standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.gf - b.ga) - (a.gf - a.ga);
        });

        sorted.forEach((team, index) => {
            const row = document.createElement('tr');
            if (team.name === this.career.team) row.classList.add('player-team-row');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td style="text-align:left;">${team.name}</td>
                <td>${team.played}</td>
                <td>${team.won}</td>
                <td>${team.draw}</td>
                <td>${team.lost}</td>
                <td><strong>${team.points}</strong></td>
            `;
            body.appendChild(row);
        });
    }

    renderLifestyleMenu() {
        const categories = ['Home', 'Vehicle', 'Accessory'];
        categories.forEach(cat => {
            const container = document.getElementById(`lifestyle-list-${cat.toLowerCase()}`);
            if (!container) return;
            container.innerHTML = '';

            const items = this.career.lifestyleItems.filter(i => i.category === cat);
            items.forEach(item => {
                const isPurchased = this.career.purchasedItems.includes(item.id);
                const canAfford = this.career.balance >= item.price;
                
                const card = document.createElement('div');
                card.className = `luxury-item ${isPurchased ? 'purchased' : ''}`;
                card.innerHTML = `
                    <div class="luxury-info">
                        <div class="luxury-icon-box">${item.icon}</div>
                        <div>
                            <div class="luxury-name">${item.name} ${isPurchased ? '✅' : ''}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted);">${item.desc}</div>
                            <div class="luxury-perk">+${item.rep} Prestij</div>
                        </div>
                    </div>
                    <div>
                        ${isPurchased ? 
                            `<span style="font-size:0.65rem; color:var(--gold); font-weight:800;">ALINDI</span>` :
                            `<button class="btn btn-primary btn-action-sm ${!canAfford ? 'disabled' : ''}" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.65rem;">
                                $${item.price.toLocaleString()}
                            </button>`
                        }
                    </div>
                `;
                container.appendChild(card);
            });

            container.querySelectorAll('.btn-primary:not(.disabled)').forEach(btn => {
                btn.onclick = () => {
                    const result = this.career.buyLifestyleItem(btn.getAttribute('data-id'));
                    if (result.success) {
                        this.notify(result.message, "💎");
                        this.renderLifestyleMenu();
                    }
                };
            });
        });
    }

    renderSocialFeed() {
        // Feed is updated dynamically by other events, just ensuring UI is fresh
    }

    renderCollection() {
        const trophyGrid = document.getElementById('trophy-grid');
        const recordsList = document.getElementById('records-list');
        if (!trophyGrid || !recordsList) return;

        // Render Trophies
        trophyGrid.innerHTML = '';
        if (this.career.trophies.length === 0) {
            trophyGrid.innerHTML = '<p style="grid-column: span 3; color: var(--text-muted); font-size: 0.7rem; text-align: center; padding: 20px;">Henüz kupa kazanmadın...</p>';
        } else {
            this.career.trophies.forEach(t => {
                const el = document.createElement('div');
                el.style.textAlign = 'center';
                el.style.padding = '10px';
                el.style.background = 'rgba(251, 191, 36, 0.05)';
                el.style.border = '1px solid var(--gold-glow)';
                el.style.borderRadius = '12px';
                el.innerHTML = `
                    <div style="font-size: 2rem; margin-bottom: 5px;">${t.icon}</div>
                    <div style="font-size: 0.65rem; font-weight: 800; color: var(--gold);">${t.name}</div>
                    <div style="font-size: 0.5rem; color: var(--text-muted);">${t.date}</div>
                `;
                el.onclick = () => this.notify(`${t.name}: ${t.desc}`, t.icon);
                trophyGrid.appendChild(el);
            });
        }

        // Render Records
        recordsList.innerHTML = '';
        const rec = this.career.records;
        const winRate = rec.totalWins + rec.totalLosses > 0 ? 
            ((rec.totalWins / (rec.totalWins + rec.totalLosses + rec.totalDraws)) * 100).toFixed(1) : 0;

        const recordItems = [
            { label: 'Maçtaki En Çok Gol', val: rec.maxGoalsInMatch, icon: '⚽' },
            { label: 'Maçtaki En Çok Asist', val: rec.maxAssistsInMatch, icon: '👟' },
            { label: 'Kariyer Galibiyeti', val: rec.totalWins, icon: '🏟️' },
            { label: 'Galibiyet Oranı', val: `%${winRate}`, icon: '📈' },
            { label: 'En Yüksek Değer', val: `$${rec.highestMarketValue.toLocaleString()}`, icon: '💰' },
            { label: 'En Yüksek İtibar', val: rec.highestReputation, icon: '🌟' },
            { label: 'Toplam Gol', val: rec.allTimeGoals, icon: '🎯' }
        ];

        recordItems.forEach(item => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px';
            row.style.background = 'rgba(255,255,255,0.02)';
            row.style.borderRadius = '8px';
            row.style.fontSize = '0.75rem';
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>${item.icon}</span>
                    <span style="color:var(--text-muted);">${item.label}</span>
                </div>
                <span style="font-weight:800; color:var(--primary);">${item.val}</span>
            `;
            recordsList.appendChild(row);
        });
    }

    renderMarket() {
        this.renderTransferList();
        this.renderGearList();
    }

    renderTransferList() {
        const container = document.getElementById('transfer-list');
        if (!container) return;
        container.innerHTML = '';

        const offers = this.career.getAvailableOffers();
        const transferOffers = this.career.getTransferOffers();
        
        const allOffers = [...offers, ...transferOffers];

        if (allOffers.length === 0) {
            container.innerHTML = '<p style="font-size:0.7rem; color:var(--text-muted); text-align:center;">Şu an teklif yok. İtibarını artır!</p>';
            return;
        }

        allOffers.forEach(club => {
            const card = document.createElement('div');
            card.className = 'luxury-item';
            const isTransfer = !!club.leagueId;
            card.innerHTML = `
                <div class="luxury-info">
                    <div class="luxury-icon-box">${isTransfer ? '🌍' : '🏟️'}</div>
                    <div>
                        <div class="luxury-name">${club.team || club.name}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${isTransfer ? club.leagueName : 'Yerel Lig'}</div>
                    </div>
                </div>
                <button class="btn btn-primary btn-action-sm" data-club="${club.team || club.name}" data-is-transfer="${isTransfer}">İMZALA</button>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-primary').forEach(btn => {
            btn.onclick = () => {
                const clubName = btn.getAttribute('data-club');
                this.notify(`${clubName} kulübüne transfer olmak için görüşmelere başlamak istiyor musun?`, "🤝", () => {
                    this.startTransferNegotiation(clubName);
                }, () => {});
            };
        });
    }

    renderGearList() {
        const container = document.getElementById('gear-list');
        if (!container) return;
        container.innerHTML = '';

        this.career.gearItems.forEach(item => {
            const isOwned = this.career.ownedGear.includes(item.id);
            const canAfford = this.career.balance >= item.price;
            
            const card = document.createElement('div');
            card.className = `luxury-item ${isOwned ? 'purchased' : ''}`;
            card.innerHTML = `
                <div class="luxury-info">
                    <div class="luxury-icon-box" style="background:rgba(56, 189, 248, 0.1); color:var(--accent-blue);">${item.icon}</div>
                    <div>
                        <div class="luxury-name">${item.name} ${isOwned ? '✅' : ''}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${item.desc}</div>
                        <div class="luxury-perk" style="color:var(--accent-blue);">+${item.bonus} ${item.skill.toUpperCase()}</div>
                    </div>
                </div>
                <div>
                    ${isOwned ? 
                        `<span style="font-size:0.65rem; color:var(--accent-blue); font-weight:800;">KUŞANILDI</span>` :
                        `<button class="btn btn-primary btn-action-sm ${!canAfford ? 'disabled' : ''}" data-id="${item.id}" style="background:var(--accent-blue); padding: 6px 12px; font-size: 0.65rem;">
                            $${item.price.toLocaleString()}
                        </button>`
                    }
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-primary:not(.disabled)').forEach(btn => {
            btn.onclick = () => {
                const result = this.career.buyGearItem(btn.getAttribute('data-id'));
                if (result.success) {
                    alert(result.message);
                    this.renderGearList();
                    this.renderSkills();
                }
            };
        });
    }

    renderShop() {
        const container = document.getElementById('lifestyle-list');
        if (!container) return;
        container.innerHTML = '';

        this.career.lifestyleItems.forEach(item => {
            const isPurchased = this.career.purchasedItems.includes(item.id);
            const canAfford = this.career.balance >= item.price;
            
            const card = document.createElement('div');
            card.className = `luxury-item ${isPurchased ? 'purchased' : ''}`;
            card.innerHTML = `
                <div class="luxury-info">
                    <div class="luxury-icon-box">${item.icon}</div>
                    <div>
                        <div class="luxury-name">${item.name} ${isPurchased ? '✅' : ''}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${item.desc}</div>
                        <div class="luxury-perk">+${item.rep} Prestij</div>
                    </div>
                </div>
                <div>
                    ${isPurchased ? 
                        `<span style="font-size:0.65rem; color:var(--gold); font-weight:800;">ALINDI</span>` :
                        `<button class="btn btn-primary btn-action-sm ${!canAfford ? 'disabled' : ''}" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.65rem;">
                            $${item.price.toLocaleString()}
                        </button>`
                    }
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-primary:not(.disabled)').forEach(btn => {
            btn.onclick = () => {
                const result = this.career.buyLifestyleItem(btn.getAttribute('data-id'));
                if (result.success) {
                    this.notify(result.message, "💎");
                    this.renderShop();
                }
            };
        });
    }

    renderSkills() {
        const container = document.getElementById('skills-list');
        if (!container) return;
        container.innerHTML = '';
        
        const skillData = [
            { id: 'shooting', name: 'Şut' },
            { id: 'passing', name: 'Pas' },
            { id: 'pace', name: 'Hız' },
            { id: 'vision', name: 'Vizyon' }
        ];

        skillData.forEach(skill => {
            const val = this.career.skills[skill.id];
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '10px';
            row.innerHTML = `
                <span style="width: 60px; font-size: 0.8rem;">${skill.name}</span>
                <div class="bar-container"><div class="bar-fill blue" style="width: ${val}%;"></div></div>
                <span style="font-size: 0.8rem; width: 20px;">${val}</span>
                <button class="btn btn-primary" data-skill="${skill.id}" style="padding: 4px 8px; font-size: 0.6rem; min-width: 40px;">🏋️</button>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                this.switchTab('training');
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                const trainingNav = document.querySelector('.nav-item[data-tab="training"]');
                if (trainingNav) trainingNav.classList.add('active');
            };
        });
    }

    renderTrainingTab() {
        const container = document.getElementById('training-list');
        if (!container) return;
        container.innerHTML = '';

        const sessions = [
            { id: 'shooting', name: 'Şut Antrenmanı', icon: '🎯', desc: 'Kaleyi bulma oranını artırır.' },
            { id: 'stamina', name: 'Kondisyon Parkuru', icon: '🏃', desc: 'Dayanıklılığını ve enerjini geliştirir.' },
            { id: 'passing', name: 'Pas Çalışması', icon: '👟', desc: 'Oyun kurma becerini geliştirir.' },
            { id: 'pace', name: 'Hız Gelişimi', icon: '🏃', desc: 'Sahadaki süratini yükseltir.' },
            { id: 'vision', name: 'Taktik Vizyon', icon: '🧠', desc: 'Oyunu okuma yeteneğini parlatır.' }
        ];

        sessions.forEach(session => {
            const card = document.createElement('div');
            card.className = 'luxury-item'; // Reuse luxury styling for consistency
            card.style.cursor = 'pointer';
            
            const currentVal = session.id === 'stamina' ? this.career.stats.stamina : this.career.skills[session.id];

            card.innerHTML = `
                <div class="luxury-info">
                    <div class="luxury-icon-box">${session.icon}</div>
                    <div>
                        <div class="luxury-name">${session.name}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${session.desc}</div>
                        <div class="luxury-perk">Mevcut: ${currentVal}</div>
                    </div>
                </div>
                <button class="btn btn-primary btn-action-sm" style="background: var(--accent-blue);">BAŞLA</button>
            `;
            card.onclick = () => this.startTraining(session.id);
            container.appendChild(card);
        });
    }

    startTraining(skillId) {
        if (this.career.energy < 20 && !this.career.skipEnergy) {
            this.notify("Enerjin çok düşük! Antrenman için en az 20 enerji gerekiyor.", "⚠️");
            return;
        }

        const skillNames = { shooting: 'ŞUT', passing: 'PAS', pace: 'HIZ', vision: 'VİZYON', stamina: 'KONDİSYON' };
        this.trainingSkillId = skillId;
        this.trainingScore = 0;
        this.trainingLives = 3;
        this.trainingActive = false; // Wait for countdown

        const countdownEl = document.getElementById('training-countdown');
        countdownEl.style.display = 'flex';
        let count = 3;
        countdownEl.textContent = count;
        
        this.switchScreen('screen-training-game');

        const cdInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownEl.textContent = count;
            } else if (count === 0) {
                countdownEl.textContent = "BAŞLA!";
            } else {
                clearInterval(cdInterval);
                countdownEl.style.display = 'none';
                this.beginTrainingLogic(skillId);
            }
        }, 800);
    }

    beginTrainingLogic(skillId) {
        this.trainingActive = true;
        this.trainingTimeLeft = (skillId === 'stamina') ? 45.0 : 30.0;
        
        if (skillId === 'stamina') {
            document.getElementById('training-canvas-3d').style.display = 'none';
            document.getElementById('training-canvas-2d').style.display = 'block';
            document.getElementById('training-rhythm-ui').style.display = 'flex';
            this.startRhythmGame();
        } else if (skillId === 'pace') {
            document.getElementById('training-canvas-3d').style.display = 'none';
            document.getElementById('training-canvas-2d').style.display = 'block';
            this.startSpeedGame();
        } else {
            document.getElementById('training-canvas-3d').style.display = 'block';
            document.getElementById('training-canvas-2d').style.display = 'none';
            this.trainingMomentManager.reset(this.career.skills, true, skillId);
            this.trainingMomentManager.start();
        }

        document.getElementById('training-progress-text').textContent = `0 / 20`;
        
        if (this.trainingTimerInterval) clearInterval(this.trainingTimerInterval);
        this.trainingTimerInterval = setInterval(() => {
            if (!this.trainingActive) { clearInterval(this.trainingTimerInterval); return; }
            this.trainingTimeLeft -= 0.1;
            document.getElementById('training-timer').textContent = Math.max(0, this.trainingTimeLeft).toFixed(1);
            if (this.trainingTimeLeft <= 0) this.completeTraining(false, "Süre Doldu!");
        }, 100);
    }

    startRhythmGame() {
        const arrows = ['↑', '↓', '←', '→'];
        const target = document.getElementById('rhythm-target');
        let currentArrow = '';
        
        const nextArrow = () => {
            if (!this.trainingActive) return;
            currentArrow = arrows[Math.floor(Math.random() * arrows.length)];
            target.textContent = currentArrow;
        };

        nextArrow();

        window.onkeydown = (e) => {
            if (!this.trainingActive) return;
            const keyMap = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
            if (keyMap[e.key] === currentArrow) {
                this.trainingScore++;
                document.getElementById('training-progress-text').textContent = `${this.trainingScore} / 20`;
                if (this.trainingScore >= 20) this.completeTraining(true);
                else nextArrow();
            } else {
                this.trainingLives--;
                if (this.trainingLives <= 0) this.completeTraining(false, "Canlar Tükendi!");
            }
        };
    }

    startSpeedGame() {
        const ctx = document.getElementById('training-canvas-2d').getContext('2d');
        const W = 400, H = 480;
        let balls = [];
        
        const spawnBall = () => {
            if (!this.trainingActive) return;
            balls.push({ x: 50 + Math.random() * (W-100), y: 50 + Math.random() * (H-100), r: 30, t: 1.5 });
            if (this.trainingScore + balls.length < 15) setTimeout(spawnBall, 1500);
        };
        spawnBall();

        const loop = () => {
            if (!this.trainingActive) return;
            ctx.clearRect(0, 0, W, H);
            balls = balls.filter(b => {
                b.t -= 0.016;
                if (b.t <= 0) return false;
                ctx.fillStyle = 'red';
                ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
                return true;
            });
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        document.getElementById('training-canvas-2d').onclick = (e) => {
            const r = e.target.getBoundingClientRect();
            const mx = e.clientX - r.left, my = e.clientY - r.top;
            balls.forEach((b, i) => {
                if (Math.hypot(b.x - mx, b.y - my) < b.r) {
                    balls.splice(i, 1);
                    this.trainingScore++;
                    document.getElementById('training-progress-text').textContent = `${this.trainingScore} / 15`;
                    if (this.trainingScore >= 10) this.completeTraining(true);
                }
            });
        };
    }

    onTrainingMomentResult(success, message) {
        if (!this.trainingActive) return;

        if (this.trainingSkillId === 'stamina') {
            this.completeTraining(success, message);
            return;
        }

        if (success) {
            // Instant success for the whole session in one shot or cumulative?
            // The prompt says "as soon as: goal is scored (success)"
            this.trainingScore++;
            this.completeTraining(true, "Harika vuruş! Antrenman başarıyla tamamlandı.");
        } else {
            // The MomentManager handles the 3-miss logic and calls this with success=false
            this.completeTraining(false, message || "Üç denemede de başarısız oldun.");
        }
    }

    completeTraining(success, customMsg) {
        this.trainingActive = false;
        document.getElementById('training-rhythm-ui').style.display = 'none';
        if (this.trainingTimerInterval) clearInterval(this.trainingTimerInterval);
        
        if (this.trainingSkillId === 'stamina') this.staminaManager.stop();

        if (!this.career.skipEnergy) this.career.drainEnergy(20);
        const passiveEarned = this.career.processPassiveIncome();

        let msg = customMsg || (success ? "Başarılı!" : "Başarısız.");
        if (passiveEarned > 0) msg += `\nMarka Elçiliği Geliri: +$${passiveEarned.toLocaleString()}`;

        if (success) {
            const gain = (2 + Math.floor(Math.random() * 3)) * this.career.xpMultiplier; 
            if (this.trainingSkillId === 'stamina') {
                this.career.stats.stamina = Math.min(100, this.career.stats.stamina + gain);
            } else {
                this.career.improveSkill(this.trainingSkillId, gain);
            }
            this.career.updateUI();
            
            this.notify(msg, "🏋️", () => {
                this.switchScreen('screen-dashboard');
                this.switchTab('training');
            });
        } else {
            // Failure: Show retry option
            this.notify(msg + "\nTekrar denemek ister misin?", "⏱️", () => {
                this.startTraining(this.trainingSkillId);
            }, () => {
                this.switchScreen('screen-dashboard');
                this.switchTab('training');
            });
        }
    }

    triggerMoment(interval) {
        if (interval) clearInterval(interval);
        this.switchScreen('screen-gameplay');

        // Re-size canvas after screen switch (it may have been hidden before)
        const canvas = document.getElementById('pitch-canvas');
        const r = canvas.getBoundingClientRect();
        if (r.width > 0) {
            canvas.width  = Math.round(r.width);
            canvas.height = Math.round(r.height);
        }

        const teamName = this.career.currentClub ? this.career.currentClub.name : 'TAKIM';
        const oppName  = document.getElementById('txt-fixture-away')?.textContent || 'RAKİP';
        this.momentManager.reset(this.career.skills, {
            team:      teamName,
            opp:       oppName,
            scoreHome: this.matchScore ? this.matchScore.team : 0,
            scoreAway: this.matchScore ? this.matchScore.opp  : 0,
            minute:    this.lastMatchMinute || 0,
        });
        this.momentManager.start();
    }

    showStadiumEntry() {
        this.switchScreen('screen-stadium-entry');
        
        // Update intro text based on context
        const sub = document.getElementById('intro-subtitle');
        const title = document.getElementById('intro-title');
        const venue = document.getElementById('intro-venue');
        
        const isTier4 = this.career.currentClub.tier >= 4;
        
        if (isTier4) {
            sub.textContent = "DEVLER LİGİ ATMOSFERİ";
            title.textContent = "BÜYÜK DERBİ";
            venue.textContent = "ELİT STADYUM";
        } else {
            sub.textContent = "KUPA HEYECANI";
            title.textContent = "KRİTİK MÜCADELE";
            venue.textContent = "ŞEHİR ARENASI";
        }

        // Wait for animation to finish before starting match
        setTimeout(() => {
            this.startMatch();
        }, 4500); // Cinematic lasts about 4.5 seconds before transitioning
    }

    startMatch() {
        this.switchScreen('screen-match');
        const commentary = document.getElementById('match-commentary-list');
        commentary.innerHTML = '';
        
        // Reset scores for every new match
        this.matchScore = { team: 0, opp: 0 };
        this.matchPlayerStats = { goals: 0, assists: 0 };
        this.lastMatchMinute = 0;

        // Reset Scoreboard UI
        document.getElementById('match-score-team').textContent = '0';
        document.getElementById('match-score-opp').textContent = '0';
        document.getElementById('match-timer').textContent = "00'";
        
        // Match chance based on focus
        const focus = this.matchSettings.focus;
        this.momentMinuteTrigger = 15 + Math.random() * 20; // First moment earlier
        
        this.startMatchInternal(0);
    }

    startMatchInternal(startMinute) {
        const commentary = document.getElementById('match-commentary-list');
        let minute = startMinute;
        
        if (minute === 0 && !this.career.isPremium) {
            this.career.adCount++;
            if (this.career.adCount % 3 === 0) {
                this.showAdSimulation();
            }
        }

        // Dynamic match events pool
        const matchEvents = [
            "Orta sahada kıran kırana bir mücadele var.",
            "Rakip takım sol kanattan etkili gelmeye çalışıyor.",
            "Savunmamız bugün çok dikkatli, geçit vermiyor.",
            "Takım arkadaşlarımız pas trafiğini artırdı.",
            "Hocamız kenardan taktik direktifler veriyor.",
            "Tribünlerde müthiş bir tezahürat var, oyuncular motive oluyor.",
            "Hakem oyunu sertlik nedeniyle durdurdu.",
            "Topla oynama oranlarında üstünlüğümüz devam ediyor."
        ];

        const interval = setInterval(() => {
            minute += Math.floor(Math.random() * 3) + 2; // Random jumps (2-4 mins)
            if (minute > 90) minute = 90;

            this.lastMatchMinute = minute;
            document.getElementById('match-timer').textContent = `${minute}'`;
            
            const entry = document.createElement('div');
            entry.className = 'ticker-entry';
            
            if (minute === 45 && startMinute < 45) {
                entry.innerHTML = `<span class="ticker-time">HT</span> İlk yarı sona erdi. Takımlar dinlenmeye gidiyor.`;
            } else if (minute >= this.momentMinuteTrigger && minute < this.momentMinuteTrigger + 5) {
                this.momentMinuteTrigger = minute + 25 + Math.random() * 20;
                this.triggerMoment(interval);
                return;
            } else if (minute >= 90) {
                clearInterval(interval);
                entry.innerHTML = `<span class="ticker-time">FT</span> Maç sona erdi! Müthiş bir 90 dakikayı geride bıraktık.`;
                this.career.addMatchPerformance(0, 0, this.matchScore.team, this.matchScore.opp);
                this.showResults();
            } else {
                // Dynamic goal logic for opponent
                const oppChance = 0.04 + (this.matchSettings.tactic === 'offensive' ? 0.02 : 0);
                if (Math.random() < oppChance) {
                    this.matchScore.opp++;
                    this.updateScoreboard('opp');
                    entry.innerHTML = `<span class="ticker-time">${minute}'</span> ⚽ <strong>GOL!</strong> Rakip takım fileleri havalandırdı. Skor: ${this.matchScore.team}-${this.matchScore.opp}`;
                    entry.style.color = 'var(--danger)';
                    entry.style.fontWeight = 'bold';
                } else {
                    const randomText = matchEvents[Math.floor(Math.random() * matchEvents.length)];
                    entry.innerHTML = `<span class="ticker-time">${minute}'</span> ${randomText}`;
                }
            }
            
            commentary.prepend(entry);
        }, 1200);
    }

    updateScoreboard(who) {
        const el = document.getElementById(`match-score-${who}`);
        el.textContent = this.matchScore[who];
        el.classList.remove('score-update-anim');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('score-update-anim');
    }

    onMomentResult(success, message, type) {
        if (success) {
            const comments = ["Harika bir şut!", "Seyirciler ayağa kalktı!", "Muazzam bir gol!", "Ne pas!", "Tehlikeli pozisyon!"];
            const randomComment = comments[Math.floor(Math.random() * comments.length)];
            
            if (type === 'assist') {
                this.matchPlayerStats.assists++;
                this.career.addMatchPerformance(0, 1, this.matchScore.team, this.matchScore.opp);
            } else {
                this.matchScore.team++;
                this.matchPlayerStats.goals++;
                this.updateScoreboard('team');
                this.career.addMatchPerformance(1, 0, this.matchScore.team, this.matchScore.opp);
            }
            
            if (type !== 'assist') {
                 // Auto-continue after 2 seconds for goals
                 this.notify(randomComment + " " + (message || ""), "⚽");
                 setTimeout(() => {
                    const overlay = document.getElementById('game-notification');
                    if (overlay.classList.contains('active')) {
                        overlay.classList.remove('active');
                        this.switchScreen('screen-match');
                        this.resumeMatch();
                    }
                 }, 2000);
            } else {
                this.notify(randomComment + " " + (message || ""), "⚽", () => {
                    this.switchScreen('screen-match');
                    this.resumeMatch();
                });
            }
        } else {
            this.notify(message || "KAÇTI!", "❌", () => {
                this.switchScreen('screen-match');
                this.resumeMatch();
            });
        }
    }

    resumeMatch() {
        this.startMatchInternal(this.lastMatchMinute);
    }

    showResults() {
        setTimeout(() => {
            this.switchScreen('screen-results');
            document.getElementById('results-score').textContent = `${this.matchScore.team} - ${this.matchScore.opp}`;
            
            // Stats for summary
            document.getElementById('summary-goals').textContent = this.matchPlayerStats.goals;
            document.getElementById('summary-assists').textContent = this.matchPlayerStats.assists;
            
            // Calculate Performance Rating
            let rating = 6.0;
            rating += (this.matchPlayerStats.goals * 1.5);
            rating += (this.matchPlayerStats.assists * 1.0);
            
            if (this.matchScore.team > this.matchScore.opp) rating += 0.5;
            else if (this.matchScore.team < this.matchScore.opp) rating -= 0.2;
            
            rating += (Math.random() * 0.6) - 0.3;
            rating = Math.min(10, Math.max(4, rating));
            
            const ratingEl = document.getElementById('txt-match-rating');
            const labelEl = document.getElementById('txt-match-rating-label');
            const motmEl = document.getElementById('badge-motm');
            
            ratingEl.textContent = rating.toFixed(1);
            
            // MOTM Logic
            if (rating >= 8.5) {
                motmEl.style.display = 'block';
            } else {
                motmEl.style.display = 'none';
            }

            let label = "ORTALAMA";
            let color = "var(--text-muted)";
            
            if (rating >= 9.0) { label = "DÜNYA KLASSI"; color = "var(--gold)"; }
            else if (rating >= 8.0) { label = "MÜKEMMEL"; color = "var(--primary)"; }
            else if (rating >= 7.0) { label = "ÇOK İYİ"; color = "var(--accent-blue)"; }
            else if (rating < 5.5) { label = "ZAYIF"; color = "var(--danger)"; }
            
            ratingEl.style.color = color;
            labelEl.textContent = label;
            labelEl.style.color = color;

            // Fan growth calc for summary
            const fanGrowth = Math.floor((this.matchPlayerStats.goals * 50) + (this.matchPlayerStats.assists * 25) + (this.career.popularity * 2));
            document.getElementById('summary-fans').textContent = `+${fanGrowth.toLocaleString()}`;

            this.generateMatchFanReactions();
        }, 1500);
    }

    showPressConference() {
        this.switchScreen('screen-press');
        const questionEl = document.getElementById('txt-press-question');
        const optionsEl = document.getElementById('press-options');
        optionsEl.innerHTML = '';

        // Determine scenario based on match performance and popularity
        let scenario = 'neutral';
        if (this.matchPlayerStats.goals > 0) scenario = 'win';
        else if (this.matchScore.team < this.matchScore.opp) scenario = 'lose';
        
        // Random chance for a "Special" scenario if popularity is high
        if (this.career.popularity > 60 && Math.random() < 0.4) scenario = 'star';

        const questions = {
            win: {
                q: "Harika bir gol attınız! Takım galibiyetinde başroldeydiniz, neler hissediyorsunuz?",
                options: [
                    { t: "Tamamen takım işiydi, arkadaşlarım olmasa atamazdım.", effect: { team: 10, coach: 5, fans: 5, popularity: -2 } },
                    { t: "Kalitemi her zaman gösteririm, bu daha başlangıç.", effect: { coach: -5, fans: 5, popularity: 15, team: -10 } },
                    { t: "Taraftarlarımız için oynuyorum, onlara armağan olsun.", effect: { fans: 15, team: 5, popularity: 10 } }
                ]
            },
            lose: {
                q: "Maçta istediğiniz fırsatları bulamadınız. Takımın formunu nasıl değerlendiriyorsunuz?",
                options: [
                    { t: "Hocamızın taktiklerine sadık kalmalıyız, düzeleceğiz.", effect: { coach: 15, team: 5, popularity: 2 } },
                    { t: "Takım arkadaşlarım daha çok çalışmalı.", effect: { team: -15, coach: 5, popularity: 10 } },
                    { t: "Daha iyisini yapacağım, pes etmek yok.", effect: { fans: 10, coach: 5, popularity: 5 } }
                ]
            },
            star: {
                q: "Son zamanlarda magazin gündeminden düşmüyorsunuz. Özel hayatınız futbolunuzu etkiliyor mu?",
                options: [
                    { t: "Ben sahada konuşurum, gerisi beni ilgilendirmez.", effect: { popularity: 20, coach: -10, team: -5 } },
                    { t: "Futbol benim önceliğim, diğer her şey ikincil.", effect: { coach: 10, team: 5, popularity: -5 } },
                    { t: "İnsanların ilgisi beni daha çok motive ediyor.", effect: { fans: 15, popularity: 15 } }
                ]
            },
            neutral: {
                q: "Sıradan bir maçtı diyebiliriz. Gelecek haftalar için planınız nedir?",
                options: [
                    { t: "Antrenmanlara asılıp formumu yükselteceğim.", effect: { coach: 10, team: 5 } },
                    { t: "Şans yanımızda değildi, önümüze bakıyoruz.", effect: { fans: 5, popularity: 2 } },
                    { t: "Taraftarlarımızdan sabır bekliyoruz.", effect: { fans: 10, team: -5 } }
                ]
            }
        };

        const current = questions[scenario];
        questionEl.textContent = current.q;

        current.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.textAlign = 'left';
            btn.style.fontSize = '0.85rem';
            btn.textContent = opt.t;
            btn.onclick = () => {
                // Apply effects
                for (const [key, val] of Object.entries(opt.effect)) {
                    if (key === 'popularity') {
                        this.career.popularity = Math.min(100, Math.max(0, this.career.popularity + val));
                    } else {
                        this.career.relationships[key] = Math.min(100, Math.max(0, this.career.relationships[key] + val));
                    }
                }
                this.career.updateUI();
                
                // Randomly trigger a commercial event after press conference (30% chance)
                if (Math.random() < 0.3) {
                    this.showCommercialEvent();
                } else {
                    this.switchScreen('screen-dashboard');
                }
            };
            optionsEl.appendChild(btn);
        });
    }

    showCommercialEvent() {
        this.switchScreen('screen-commercial');
        const titleEl = document.getElementById('comm-title');
        const iconEl = document.getElementById('comm-icon');
        const descEl = document.getElementById('comm-description');
        const optionsEl = document.getElementById('comm-options');
        optionsEl.innerHTML = '';

        const events = [
            {
                title: "REKLAM ÇEKİMİ 🎥",
                icon: "📸",
                q: "Yerel bir giyim markası seninle katalog çekimi yapmak istiyor. Kabul ediyor musun?",
                options: [
                    { t: "Profesyonel bir çekim yapalım.", effect: { fans: 5, sponsor: 15, rep: 50 }, cost: 0 },
                    { t: "Sadece kısa bir poz verebilirim (Enerji Tasarrufu).", effect: { fans: 2, sponsor: 5, rep: 20 }, cost: 0 },
                    { t: "Reddet, antrenmana odaklan.", effect: { coach: 10, team: 5 }, cost: 0 }
                ]
            },
            {
                title: "SOSYAL SORUMLULUK ❤️",
                icon: "🏥",
                q: "Bir çocuk hastanesini ziyaret edip forma imzalaman istendi.",
                options: [
                    { t: "Bütün öğleden sonramı ayırırım.", effect: { fans: 25, team: 10, coach: 10, rep: 30 }, cost: 0 },
                    { t: "Hızlıca uğrayıp hediye bırakırım.", effect: { fans: 10, rep: 10 }, cost: 0 },
                    { t: "Programım çok yoğun.", effect: { fans: -10, coach: -5 }, cost: 0 }
                ]
            },
            {
                title: "MARKA ELÇİSİ 💎",
                icon: "⌚",
                q: "Lüks bir saat markası seninle özel bir akşam yemeği düzenlemek istiyor.",
                options: [
                    { t: "Şık bir giriş yap ve herkesle tanış.", effect: { sponsor: 25, fans: 10, rep: 100 }, cost: 0 },
                    { t: "Sadece reklam yüzü olmayı kabul et.", effect: { sponsor: 15, rep: 50 }, cost: 0 },
                    { t: "Zaman kaybı, evde dinleneceğim.", effect: { energy: 10 }, cost: 0 }
                ]
            }
        ];

        const ev = events[Math.floor(Math.random() * events.length)];
        titleEl.textContent = ev.title;
        iconEl.textContent = ev.icon;
        descEl.textContent = ev.q;

        ev.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.style.textAlign = 'left';
            btn.style.fontSize = '0.85rem';
            btn.textContent = opt.t;
            btn.onclick = () => {
                if (opt.effect) {
                    for (const [key, val] of Object.entries(opt.effect)) {
                        if (key === 'rep') {
                            this.career.reputation += val;
                        } else if (key === 'energy') {
                            this.career.energy = Math.min(100, this.career.energy + val);
                        } else {
                            this.career.relationships[key] = Math.min(100, Math.max(0, this.career.relationships[key] + val));
                        }
                    }
                }
                this.career.updateUI();
                this.switchScreen('screen-dashboard');
                
                // Add a fan reaction for the event
                this.generateEventFanReaction(ev.title);
            };
            optionsEl.appendChild(btn);
        });
    }

    generateEventFanReaction(eventTitle) {
        const list = document.getElementById('social-feed-list');
        if (!list) return;
        if (list.querySelector('p')) list.innerHTML = '';

        const post = document.createElement('div');
        post.className = 'fan-post';
        post.innerHTML = `
            <div class="fan-avatar">🌟</div>
            <div class="fan-content">
                <div class="fan-user">@HaberMerkezi</div>
                <div class="fan-text">SON DAKİKA: Yıldız oyuncu ${this.career.playerName}, ${eventTitle} etkinliğinde görüntülendi!</div>
                <div class="fan-time">Az önce</div>
            </div>
        `;
        list.prepend(post);
    }

    generateMatchFanReactions() {
        const list = document.getElementById('social-feed-list');
        if (!list) return;
        if (list.querySelector('p')) list.innerHTML = '';

        const usernames = ["SporSever", "HizliKanat", "SahaKenari", "KaleArka"];
        const avatars = ["⚽", "🙌", "🔥", "🏟️"];
        
        const win = this.matchScore.team > this.matchScore.opp;
        const draw = this.matchScore.team === this.matchScore.opp;
        const playerScored = this.matchPlayerStats.goals > 0;

        let templates = [];
        if (win) {
            templates.push("Harika bir galibiyet! Takım müthişti.");
            templates.push("İşte beklediğimiz ruh buydu. Tebrikler Kartallar!");
        } else if (draw) {
            templates.push("Beraberlik üzücü ama pes etmek yok.");
            templates.push("Zor maçtı, 1 puan da iyidir.");
        } else {
            templates.push("Bu mağlubiyet yakışmadı, haftaya telafi etmeliyiz.");
            templates.push("Hatalardan ders çıkarıp önümüze bakalım.");
        }

        if (playerScored) {
            templates.push(`@${this.career.playerName.replace(/\s/g, '')} bugün sahanın tozunu attırdı!`);
            templates.push("O nasıl bir goldü öyle? Hala etkisindeyim.");
        }

        const count = 2;
        for (let i = 0; i < count; i++) {
            const user = usernames[Math.floor(Math.random() * usernames.length)];
            const avatar = avatars[Math.floor(Math.random() * avatars.length)];
            const text = templates[Math.floor(Math.random() * templates.length)];
            
            const post = document.createElement('div');
            post.className = 'fan-post';
            post.innerHTML = `
                <div class="fan-avatar">${avatar}</div>
                <div class="fan-content">
                    <div class="fan-user">@${user}</div>
                    <div class="fan-text">${text}</div>
                    <div class="fan-time">Maç Sonu</div>
                </div>
            `;
            list.prepend(post);
        }
    }
}

window.addEventListener('load', () => new Game());
