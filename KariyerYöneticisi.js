export class CareerManager {
    constructor() {
        this.playerName = "Yıldız Adayı";
        this.reputation = 0;
        this.balance = 500; // Starting money
        this.energy = 100;
        this.currentClub = null; 
        this.stats = {
            goals: 0,
            assists: 0,
            matches: 0,
            stamina: 50 
        };
        this.skills = {
            shooting: 20,
            passing: 20,
            dribbling: 20,
            pace: 20,
            stamina: 20,
            vision: 20
        };
        this.xp = 0;
        this.division = 3;
        this.morale = 50; // 0-100
        this.currentLeagueId = 'tur';
        this.currentMatchDay = 1;
        
        this.leagues = {
            tur: {
                name: "TÜRK LİGİ",
                teams: ["Anadolu Kartalları", "Boğaz FC", "Karadeniz Fırtınası", "Ege Aslanları", "Marmara United", "Ankara Güneşi", "İzmir Körfezi", "Trabzon Yıldızları"]
            },
            esp: {
                name: "İSPANYA LİGİ",
                teams: ["Madrid Galaksisi", "Barselona Ejderleri", "Sevilla Güneşi", "Valencia Portakalı", "Atletik Boğalar", "Getafe Kartalları", "Villareal Sarı Denizaltı", "Bilbao Aslanları"]
            },
            eng: {
                name: "İNGİLTERE LİGİ",
                teams: ["Londra Kılıçları", "Kuzey Yıldızı FC", "Thames United", "Wembley Lions", "Kırmızı Şimşekler", "Mavi Oklar FC", "Yorkshire Gururu", "Batı Sahili FC"]
            },
            ger: {
                name: "ALMANYA LİGİ",
                teams: ["Bavyera Ejderleri", "Ren Şelalesi FC", "Hamburg Denizci", "Berlin Demir", "Dortmund Sarı-Siyah", "Frankfurt Boğası", "Stuttgart Kanatları", "Köln Keçisi"]
            },
            ita: {
                name: "İTALYA LİGİ",
                teams: ["Roma İmparatoru", "Milano Çift Kule", "Napoli Volkan", "Torino Boğası", "Venedik Aslanı", "Floransa Zambak", "Lazio Kartalı", "Juventus Yıldızı"]
            }
        };

        this.standings = {};
        this.initLeagues();

        this.team = "Anadolu Kartalları"; 
        this.marketValue = 5000;
        this.jerseySalesIncome = 0;
        this.weather = { type: 'Sunny', label: '☀️ Güneşli', friction: 0.99, staminaDrain: 1.0 };
        this.relationships = {
            coach: 50,
            team: 50,
            fans: 30,
            sponsor: 10
        };
        this.popularity = 20; // 0-100
        this.teamSpirit = 50; // 0-100
        this.followers = 150; // Starting followers
        this.activeSponsorships = [];
        this.activeEndorsements = []; // For passive income
        
        // Monetization & Premium features
        this.isPremium = false; // Ad-free
        this.hasVIP = false;
        this.xpMultiplier = 1;
        this.skipEnergy = false;
        this.adCount = 0;
        
        this.trophies = []; 
        this.records = {
            maxGoalsInMatch: 0,
            maxAssistsInMatch: 0,
            totalWins: 0,
            totalLosses: 0,
            totalDraws: 0,
            highestMarketValue: 5000,
            highestReputation: 0,
            allTimeGoals: 0,
            allTimeAssists: 0
        };

        this.sponsorships = [
            { id: 'local_drink', name: 'Fresh Kola', bonus: 80, reqFans: 20, reqSponsor: 10, reqItems: 0, icon: '🥤', description: 'Maç başı ferahlık primi.' },
            { id: 'shoe_brand', name: 'Velocity Pro', bonus: 250, reqFans: 150, reqSponsor: 40, reqItems: 1, icon: '👟', description: 'Hız tutkunlarının tercihi.' },
            { id: 'watch_co', name: 'Apex Chrono', bonus: 750, reqFans: 500, reqSponsor: 80, reqItems: 2, icon: '⌚', description: 'Zamanın elit yüzü ol.' },
            { id: 'car_brand', name: 'Zenith Motors', bonus: 2500, reqFans: 2500, reqSponsor: 150, reqItems: 3, icon: '🏎️', description: 'Asfaltın yeni kralı.' },
            { id: 'global_airline', name: 'Sky High Air', bonus: 6000, reqFans: 10000, reqSponsor: 300, reqItems: 5, icon: '✈️', description: 'Kıtalararası prestij elçisi.' }
        ];

        this.endorsements = [
            { id: 'social_media', name: 'Social Influencer', passive: 40, reqFans: 500, reqSponsor: 30, icon: '📱', desc: 'İçerik üreticisi geliri.' },
            { id: 'shaving_cream', name: 'Smooth Skin', passive: 150, reqFans: 2000, reqSponsor: 100, icon: '🪒', desc: 'Klasik bakım reklamı geliri.' },
            { id: 'luxury_fashion', name: 'Vogue Ambassador', passive: 800, reqFans: 25000, reqSponsor: 250, icon: '👔', desc: 'Moda dünyasının ikonik yüzü.' },
            { id: 'crypto_exchange', name: 'Future Mint', passive: 2500, reqFans: 100000, reqSponsor: 500, icon: '🪙', desc: 'Kripto dünyasının temsilcisi.' }
        ];
        
        this.lifestyleItems = [
            // Accessories
            { id: 'perfume', name: 'Özel Tasarım Parfüm', price: 500, rep: 2, icon: '🧴', category: 'Accessory', desc: 'Etrafındakileri etkile.' },
            { id: 'boots_gold', name: 'Altın Kaplama Krampon', price: 5000, rep: 15, icon: '👟', category: 'Accessory', desc: 'Sahada parlamak için.' },
            { id: 'watch_diamond', name: 'Pırlantalı Saat', price: 50000, rep: 100, icon: '💎', category: 'Accessory', desc: 'Zamanın en pahalı hali.' },
            
            // Vehicles
            { id: 'suv', name: 'Lüks SUV', price: 85000, rep: 80, icon: '🚙', category: 'Vehicle', desc: 'Konforlu bir sürüş.' },
            { id: 'supercar', name: 'Süper Spor Araba', price: 350000, rep: 250, icon: '🏎️', category: 'Vehicle', desc: '0-100 sadece 2.5 saniye.' },
            { id: 'yacht', name: 'Süper Yat', price: 5000000, rep: 1500, icon: '🛥️', category: 'Vehicle', desc: 'Denizlerin hakimi ol.' },
            { id: 'jet', name: 'Özel Jet', price: 15000000, rep: 5000, icon: '🛩️', category: 'Vehicle', desc: 'Dünyayı kendi hızında gez.' },

            // Real Estate
            { id: 'apartment', name: 'Şehir Merkezi Rezidans', price: 150000, rep: 120, icon: '🏢', category: 'Home', desc: 'Manzaralı bir başlangıç.' },
            { id: 'villa', name: 'Havuzlu Villa', price: 1200000, rep: 600, icon: '🏡', category: 'Home', desc: 'Geniş bahçe, büyük prestij.' },
            { id: 'mansion', name: 'Boğazda Yalı', price: 25000000, rep: 8000, icon: '🏰', category: 'Home', desc: 'Efsanelerin tek adresi.' },
            { id: 'island', name: 'Özel Ada', price: 100000000, rep: 25000, icon: '🏝️', category: 'Home', desc: 'Kendi krallığını kur.' }
        ];
        this.purchasedItems = [];
        this.ownedGear = [];

        this.gearItems = [
            { id: 'pro_boots', name: 'Elite Krampon', price: 1200, skill: 'shooting', bonus: 8, icon: '👟', desc: 'Şut isabetini ve gücünü artırır.' },
            { id: 'speed_socks', name: 'Aerodinamik Çorap', price: 800, skill: 'pace', bonus: 5, icon: '🧦', desc: 'Daha hızlı depar atmanı sağlar.' },
            { id: 'precision_ball', name: 'Pro Maç Topu', price: 1500, skill: 'passing', bonus: 10, icon: '⚽', desc: 'Pas kaliteni en üst seviyeye taşır.' },
            { id: 'vision_glasses', name: 'Analiz Gözlüğü', price: 2500, skill: 'vision', bonus: 12, icon: '👓', desc: 'Saha içindeki boşlukları daha iyi görmeni sağlar.' }
        ];

        this.clubs = [
            { name: "Anadolu Kartalları", tier: 1, minRep: 0 },
            { name: "Karaköprü SK", tier: 1, minRep: 0 },
            { name: "Şehir Spor", tier: 2, minRep: 50 },
            { name: "Süper Güç FK", tier: 3, minRep: 150 },
            { name: "Avrupa Devleri", tier: 4, minRep: 400 },
            { name: "Dünya Şampiyonu FC", tier: 5, minRep: 1000 }
        ];
    }

    getPlayerStatus() {
        const count = this.purchasedItems.length;
        if (count >= 5) return { title: "Efsanevi Milyarder", color: "var(--gold)" };
        if (count >= 4) return { title: "Küresel İkon", color: "var(--primary)" };
        if (count >= 3) return { title: "Elit Sporcu", color: "var(--accent-blue)" };
        if (count >= 2) return { title: "Sosyal Figür", color: "#ffcc00" };
        if (count >= 1) return { title: "Yerel Marka", color: "#fff" };
        return { title: "Amatör", color: "var(--text-muted)" };
    }

    getMediaStatus() {
        if (this.popularity >= 90) return { title: "Küresel İkon", color: "var(--gold)" };
        if (this.popularity >= 70) return { title: "Süperstar", color: "var(--primary)" };
        if (this.popularity >= 50) return { title: "Halkın Sevgilisi", color: "var(--accent-blue)" };
        if (this.popularity >= 30) return { title: "Tanınan Yüz", color: "#fff" };
        return { title: "Yeni Yetenek", color: "var(--text-muted)" };
    }

    getMediaPersona() {
        const { coach, team, fans } = this.relationships;
        if (fans > 80 && team > 70) return "Taraftarın Sevgilisi";
        if (fans > 70 && team < 30) return "Asi Yetenek";
        if (coach > 80 && team > 80) return "Profesyonel";
        if (fans < 30 && team < 30) return "Tartışmalı İsim";
        return "Gelişmekte Olan";
    }

    getLuxuryBonusMultiplier() {
        const popBonus = this.popularity / 200; 
        return 1 + (this.purchasedItems.length * 0.1) + popBonus;
    }

    initLeagues() {
        Object.keys(this.leagues).forEach(leagueId => {
            this.standings[leagueId] = this.leagues[leagueId].teams.map(teamName => ({
                name: teamName,
                played: 0,
                won: 0,
                draw: 0,
                lost: 0,
                gf: 0,
                ga: 0,
                points: 0
            }));
        });
    }

    getMoraleStatus() {
        if (this.morale >= 90) return { emoji: "🔥", label: "Mükemmel", color: "#f59e0b" };
        if (this.morale >= 70) return { emoji: "😊", label: "Mutlu", color: "#2ecc71" };
        if (this.morale >= 40) return { emoji: "😐", label: "Normal", color: "#fff" };
        if (this.morale >= 20) return { emoji: "🙂", label: "Düşük", color: "#94a3b8" };
        return { emoji: "😢", label: "Üzgün", color: "#ef4444" };
    }

    getEffectiveSkill(skillName) {
        let val = this.skills[skillName] || 20;
        if (this.morale < 30) val *= 0.9; // 10% reduction
        return Math.floor(val);
    }

    buyEnergyDrink(type) {
        const drinks = {
            small: { name: "Küçük Enerji İçeceği", price: 50, gain: 20 },
            medium: { name: "Orta Enerji İçeceği", price: 120, gain: 50 },
            large: { name: "Büyük Enerji İçeceği", price: 250, gain: 100 }
        };
        const drink = drinks[type];
        if (drink && this.balance >= drink.price) {
            this.balance -= drink.price;
            this.energy = Math.min(100, this.energy + drink.gain);
            this.updateUI();
            return { success: true, message: `${drink.name} içildi! +${drink.gain} Enerji.` };
        }
        return { success: false, message: "Yetersiz bakiye!" };
    }

    simulateWeek() {
        Object.keys(this.leagues).forEach(leagueId => {
            const leagueStandings = this.standings[leagueId];
            const teams = [...leagueStandings];
            
            // Randomly pair teams for simulation
            // In a real system we'd follow a fixture, but random pairs is enough for simulation
            const shuffled = teams.sort(() => 0.5 - Math.random());
            for (let i = 0; i < shuffled.length; i += 2) {
                const teamA = shuffled[i];
                const teamB = shuffled[i+1];
                
                // If it's the player's team, we don't simulate here as it's handled in addMatchPerformance
                if (teamA.name === this.team || teamB.name === this.team) continue;

                const scoreA = Math.floor(Math.random() * 4);
                const scoreB = Math.floor(Math.random() * 4);
                
                this.recordMatchResult(leagueId, teamA.name, scoreA, scoreB);
                this.recordMatchResult(leagueId, teamB.name, scoreB, scoreA);
            }
        });
        this.currentMatchDay++;
    }

    recordMatchResult(leagueId, teamName, gf, ga) {
        const team = this.standings[leagueId].find(t => t.name === teamName);
        if (team) {
            team.played++;
            team.gf += gf;
            team.ga += ga;
            if (gf > ga) {
                team.won++;
                team.points += 3;
            } else if (gf === ga) {
                team.draw++;
                team.points += 1;
            } else {
                team.lost++;
            }
        }
    }

    addMatchPerformance(goals, assists, teamScore, oppScore) {
        this.stats.goals += goals;
        this.stats.assists += assists;
        this.stats.matches += 1;
        this.currentOpponent = null;

        // Record player team result in standings
        this.recordMatchResult(this.currentLeagueId, this.team, teamScore, oppScore);
        // Simulate other teams
        this.simulateWeek();

        // Update All-time records
        this.records.allTimeGoals += goals;
        this.records.allTimeAssists += assists;
        
        // Morale System
        if (teamScore > oppScore) {
            this.records.totalWins++;
            this.morale = Math.min(100, this.morale + 10);
        } else if (teamScore < oppScore) {
            this.records.totalLosses++;
            this.morale = Math.max(0, this.morale - 15);
        } else {
            this.records.totalDraws++;
            this.morale = Math.min(100, this.morale + 2);
        }

        if (goals > 0) this.morale = Math.min(100, this.morale + 20);
        
        // Update All-time records max
        if (goals > this.records.maxGoalsInMatch) this.records.maxGoalsInMatch = goals;
        if (assists > this.records.maxAssistsInMatch) this.records.maxAssistsInMatch = assists;

        // Contract decrement
        if (this.currentClub && this.currentClub.matchesLeft !== undefined) {
            this.currentClub.matchesLeft = Math.max(0, this.currentClub.matchesLeft - 1);
        }

        const repGain = (goals * 10) + (assists * 5) + 2;
        this.reputation += repGain;
        
        const popGain = (goals * 5) + (assists * 3) + 1;
        this.popularity = Math.min(100, this.popularity + popGain);
        
        // Follower growth
        const followerGain = Math.floor((goals * 50) + (assists * 25) + (this.popularity * 2));
        this.followers += followerGain;
        
        const clubSalary = this.currentClub ? (this.currentClub.tier * 200) : 0;
        const baseMatchIncome = 100 + (this.reputation * 2) + clubSalary;
        this.balance += baseMatchIncome;
        
        const fanMultiplier = 1 + (this.relationships.fans / 100);
        this.marketValue = Math.floor((this.reputation * 500 + 5000) * fanMultiplier);

        const matchJerseyIncome = Math.floor(this.relationships.fans * (this.reputation / 10 + 1));
        this.jerseySalesIncome += matchJerseyIncome;
        this.balance += matchJerseyIncome; 

        if (this.reputation > this.records.highestReputation) this.records.highestReputation = this.reputation;
        if (this.marketValue > this.records.highestMarketValue) this.records.highestMarketValue = this.marketValue;

        const luxuryMultiplier = this.getLuxuryBonusMultiplier();

        this.activeSponsorships.forEach(activeDeal => {
            const deal = this.sponsorships.find(s => s.id === activeDeal.id);
            if (deal) {
                const baseBonus = activeDeal.negotiatedBonus !== undefined ? activeDeal.negotiatedBonus : deal.bonus;
                const finalBonus = Math.floor(baseBonus * luxuryMultiplier);
                this.balance += finalBonus; 
                activeDeal.matchesLeft--;
            }
        });

        this.activeSponsorships = this.activeSponsorships.filter(d => d.matchesLeft > 0);
        this.checkTrophyMilestones();
        this.updateUI();
    }

    getTransferOffers() {
        const offers = [];
        const seasonRating = 7.5; // Dummy: in real game would be average of ratings
        
        if (seasonRating > 7.0) {
            // Higher leagues offers
            const otherLeagues = Object.keys(this.leagues).filter(id => id !== this.currentLeagueId);
            const randomLeague = otherLeagues[Math.floor(Math.random() * otherLeagues.length)];
            const randomTeam = this.leagues[randomLeague].teams[Math.floor(Math.random() * this.leagues[randomLeague].teams.length)];
            
            offers.push({
                team: randomTeam,
                leagueId: randomLeague,
                leagueName: this.leagues[randomLeague].name,
                bonus: 2000 + (this.reputation * 10),
                tier: 3
            });
        }
        return offers;
    }

    checkTrophyMilestones() {
        const milestones = [
            { id: 'first_goal', name: 'İlk Gol', icon: '⚽', desc: 'Profesyonel kariyerindeki ilk golün.', condition: () => this.records.allTimeGoals >= 1 },
            { id: 'goal_machine', name: 'Gol Makinesi', icon: '🔥', desc: 'Toplam 50 gol barajını aştın.', condition: () => this.records.allTimeGoals >= 50 },
            { id: 'assist_king', name: 'Asist Kralı', icon: '👑', desc: 'Toplam 25 asist yaptın.', condition: () => this.records.allTimeAssists >= 25 },
            { id: 'millionaire', name: 'Milyoner', icon: '💰', desc: '1.000.000$ bakiyeye ulaştın.', condition: () => this.balance >= 1000000 },
            { id: 'global_star', name: 'Dünya Yıldızı', icon: '🌍', desc: '1000 itibara ulaştın.', condition: () => this.reputation >= 1000 },
            { id: 'loyal_player', name: 'Sadık Oyuncu', icon: '🛡️', desc: 'Birçok maçta ter döktün.', condition: () => this.stats.matches >= 20 },
            { id: 'tier5_pro', name: 'Zirve Oyuncusu', icon: '🏆', desc: 'En üst seviye (Tier 5) bir takıma transfer oldun.', condition: () => this.currentClub && this.currentClub.tier === 5 }
        ];

        milestones.forEach(m => {
            if (m.condition() && !this.trophies.find(t => t.id === m.id)) {
                this.trophies.push({ ...m, date: new Date().toLocaleDateString('tr-TR') });
                if (this.onTrophyWon) this.onTrophyWon(m);
            }
        });
    }

    processPassiveIncome() {
        if (!this.activeEndorsements || this.activeEndorsements.length === 0) return 0;
        
        const luxuryMultiplier = this.getLuxuryBonusMultiplier();
        let totalPassive = 0;
        
        this.activeEndorsements.forEach(activeId => {
            const deal = this.endorsements.find(e => e.id === activeId);
            if (deal) {
                totalPassive += Math.floor(deal.passive * luxuryMultiplier);
            }
        });
        
        this.balance += totalPassive;
        this.updateUI();
        return totalPassive;
    }

    signEndorsement(id) {
        if (this.activeEndorsements.includes(id)) return false;
        const deal = this.endorsements.find(e => e.id === id);
        if (deal && this.relationships.fans >= deal.reqFans && this.relationships.sponsor >= deal.reqSponsor) {
            this.activeEndorsements.push(id);
            this.updateUI();
            return true;
        }
        return false;
    }

    buyLifestyleItem(id) {
        const item = this.lifestyleItems.find(i => i.id === id);
        if (item && this.balance >= item.price && !this.purchasedItems.includes(id)) {
            this.balance -= item.price;
            this.reputation += item.rep;
            this.purchasedItems.push(id);
            this.updateUI();
            return { success: true, message: `${item.name} satın alındı! +${item.rep} İtibar.` };
        }
        return { success: false, message: "Yetersiz bakiye veya zaten sahipsin." };
    }

    buyGearItem(id) {
        const item = this.gearItems.find(i => i.id === id);
        if (item && this.balance >= item.price && !this.ownedGear.includes(id)) {
            this.balance -= item.price;
            this.ownedGear.push(id);
            // Apply skill bonus
            this.skills[item.skill] = Math.min(100, this.skills[item.skill] + item.bonus);
            this.updateUI();
            return { success: true, message: `${item.name} alındı! ${item.skill.toUpperCase()} +${item.bonus}` };
        }
        return { success: false, message: "Yetersiz bakiye veya zaten sahipsin." };
    }

    improveSkill(skillId, amount) {
        if (this.skills[skillId] !== undefined) {
            this.skills[skillId] = Math.min(100, this.skills[skillId] + amount);
            this.updateUI();
            return true;
        }
        return false;
    }

    updateUI() {
        if (this.onUpdate) this.onUpdate();
    }

    setRandomWeather() {
        const conditions = [
            { type: 'Sunny', label: '☀️ Güneşli', friction: 0.99, staminaDrain: 1.0 },
            { type: 'Rainy', label: '🌧️ Yağmurlu', friction: 0.995, staminaDrain: 1.3 },
            { type: 'Snowy', label: '❄️ Karlı', friction: 0.97, staminaDrain: 1.8 }
        ];
        this.weather = conditions[Math.floor(Math.random() * conditions.length)];
        this.updateUI();
    }

    drainEnergy(amount) {
        const staminaFactor = 1 - (this.stats.stamina / 200); 
        this.energy = Math.max(0, this.energy - (amount * this.weather.staminaDrain * staminaFactor));
        this.updateUI();
    }

    getAvailableOffers() {
        return this.clubs.filter(club => 
            club.minRep <= this.reputation && 
            (!this.currentClub || club.name !== this.currentClub.name)
        );
    }

    applyPackage(packageId) {
        switch(packageId) {
            case 'ad_free':
                this.isPremium = true;
                break;
            case 'starter':
                this.balance += 10000;
                this.energy = Math.min(1000, this.energy + 500);
                this.skills.shooting = Math.min(100, this.skills.shooting + 15);
                break;
            case 'star':
                this.balance += 25000;
                this.xpMultiplier = 2;
                this.skills.shooting = Math.min(100, this.skills.shooting + 10);
                this.skills.pace = Math.min(100, this.skills.pace + 10);
                break;
            case 'legend':
                this.balance += 75000;
                this.hasVIP = true;
                this.skipEnergy = true;
                // Max stats to 50
                Object.keys(this.skills).forEach(k => {
                    this.skills[k] = Math.max(50, this.skills[k]);
                });
                break;
            case 'energy':
                this.energy += 500;
                break;
        }
        this.updateUI();
    }

    transferTo(clubName) {
        const club = this.clubs.find(c => c.name === clubName);
        if (club) {
            this.currentClub = { 
                ...club, 
                matchesLeft: 10 + Math.floor(Math.random() * 5) 
            };
            this.updateUI();
            return true;
        }
        return false;
    }

    signSponsorship(id, finalBonus) {
        if (this.activeSponsorships.length >= 2) return false;
        const deal = this.sponsorships.find(s => s.id === id);
        const alreadyActive = this.activeSponsorships.find(d => d.id === id);
        
        if (deal && !alreadyActive) {
            if (this.followers >= deal.reqFans) {
                const duration = 5 + Math.floor(Math.random() * 4);
                this.activeSponsorships.push({ 
                    id, 
                    matchesLeft: duration,
                    negotiatedBonus: finalBonus || deal.bonus 
                });
                this.updateUI();
                return true;
            }
        }
        return false;
    }

    cancelSponsorship(id) {
        this.activeSponsorships = this.activeSponsorships.filter(sid => sid.id !== id);
        this.updateUI();
    }
}