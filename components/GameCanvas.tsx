
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  GameState, Player, Enemy, Bullet, Particle, PowerUp, FloatingText,
  EnemyType, Vector2D, WeaponType, CityBlock, PlayerShipType, BackgroundTheme
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, BULLET_SPEED, 
  BASE_PLAYER_SPEED, DASH_SPEED, DASH_DURATION, DASH_COOLDOWN, GRAZE_DISTANCE,
  HEAT_DECAY, ORBITAL_RADIUS, MISSILE_COOLDOWN, SNIPER_AIM_TIME, CORE_HITBOX_SIZE,
  SHIP_STATS, THEME_CHANGE_INTERVAL, SHIELD_REGEN_DELAY
} from '../constants';
import { generateBossTaunt } from '../services/geminiService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setHealth: (health: number) => void;
  setBossMessage: (msg: string | null) => void;
  missionActive: boolean;
  setSkillCharge: (val: number) => void;
  setCombo: (val: number) => void;
  setHeat: (val: number) => void;
  triggerSkillRef: React.MutableRefObject<() => void>;
  triggerDashRef: React.MutableRefObject<() => void>;
  selectedShip: PlayerShipType;
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const checkCollision = (e1: { pos: Vector2D, width: number }, e2: { pos: Vector2D, width: number }, hitboxScale1: number = 1.0, hitboxScale2: number = 1.0) => {
  const dx = e1.pos.x - e2.pos.x;
  const dy = e1.pos.y - e2.pos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const r1 = (e1.width / 2) * hitboxScale1;
  const r2 = (e2.width / 2) * hitboxScale2;
  return distance < (r1 + r2);
};

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, setGameState, setScore, setHealth, setBossMessage, missionActive,
  setSkillCharge, setCombo, setHeat, triggerSkillRef, triggerDashRef, selectedShip
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Background State
  const bgThemeRef = useRef<BackgroundTheme>(BackgroundTheme.NEON_CITY);
  const themeTimerRef = useRef<number>(0);

  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'p1', pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 200 }, 
    velocity: { x: 0, y: 0 }, width: 60, height: 70, 
    color: COLORS.PLAYER, health: 100, maxHealth: 100, isDead: false,
    shipType: selectedShip,
    weaponLevel: 1, weaponType: WeaponType.PLASMA, 
    shield: 50, maxShield: 50, shieldRegenTimer: 0,
    score: 0, invincibleTimer: 0,
    combo: 0, comboTimer: 0, skillCharge: 0,
    dashCooldown: 0, dashTimer: 0,
    heat: 0, orbitals: 0, missilesUnlocked: false, missileTimer: 0
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cityBlocksRef = useRef<CityBlock[]>([]); 

  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const bossSpawnedRef = useRef<boolean>(false);
  const shakeTimerRef = useRef<number>(0);
  const regenTimerRef = useRef<number>(0);
  
  const isShootingRef = useRef<boolean>(false);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchPosRef = useRef<Vector2D | null>(null);

  const initGame = useCallback(() => {
    const stats = SHIP_STATS[selectedShip];
    playerRef.current = {
      id: 'p1', pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 200 }, 
      velocity: { x: 0, y: 0 }, width: 60, height: 70, 
      color: stats.color, 
      health: stats.maxHealth, maxHealth: stats.maxHealth, 
      isDead: false,
      shipType: selectedShip,
      weaponLevel: 1, weaponType: stats.startWeapon, 
      shield: stats.maxShield, maxShield: stats.maxShield, shieldRegenTimer: 0,
      score: 0, invincibleTimer: 0,
      combo: 0, comboTimer: 0, skillCharge: 0,
      dashCooldown: 0, dashTimer: 0,
      heat: 0, orbitals: 0, missilesUnlocked: false, missileTimer: 0
    };
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    floatingTextsRef.current = [];
    cityBlocksRef.current = [];
    
    bgThemeRef.current = BackgroundTheme.NEON_CITY;
    themeTimerRef.current = 0;
    for(let i=0; i<25; i++) spawnCityBlock(Math.random() * CANVAS_HEIGHT);

    bossSpawnedRef.current = false;
    regenTimerRef.current = 0;
    setScore(0);
    setHealth(100); // UI Percentage
    setSkillCharge(0);
    setCombo(0);
    setHeat(0);
    setBossMessage(null);
  }, [selectedShip, setScore, setHealth, setBossMessage, setSkillCharge, setCombo, setHeat]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && missionActive) {
      initGame();
    }
  }, [gameState, missionActive, initGame]);

  const triggerShake = (duration: number) => {
    shakeTimerRef.current = duration;
  };

  const spawnFloatingText = (pos: Vector2D, text: string, color: string, size: number = 20) => {
     floatingTextsRef.current.push({
        id: Math.random().toString(),
        pos: { x: pos.x + rand(-10, 10), y: pos.y - 10 },
        velocity: { x: rand(-1, 1), y: -3 },
        text, color, size, life: 1.0
     });
  };

  const spawnCityBlock = (yPos?: number) => {
    if (bgThemeRef.current !== BackgroundTheme.NEON_CITY) return;
    const depth = Math.floor(rand(1, 4));
    const size = rand(60, 180) * depth;
    const shade = Math.floor(20 + (depth * 15));
    const hasNeon = Math.random() > 0.7;
    const neonColors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0055'];

    cityBlocksRef.current.push({
      x: rand(0, CANVAS_WIDTH - 50),
      y: yPos ?? -size,
      width: size,
      height: size * rand(1, 4),
      depth: depth,
      color: `rgba(0, ${shade + 40}, ${shade + 80}, ${0.1 * depth})`,
      hasNeon,
      neonColor: hasNeon ? neonColors[Math.floor(Math.random() * neonColors.length)] : undefined
    });
  };

  // Spawn Matrix Characters
  const spawnMatrixChar = () => {
     const chars = "01ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ";
     particlesRef.current.push({
        id: Math.random().toString(),
        pos: { x: rand(0, CANVAS_WIDTH), y: -20 },
        velocity: { x: 0, y: rand(10, 30) }, // Slow falling
        life: rand(2, 5), maxLife: 5,
        color: '#00ff00', size: rand(14, 24),
        isMatrixChar: true,
        char: chars.charAt(Math.floor(Math.random() * chars.length))
     });
  };

  // Spawn Void Clouds
  const spawnVoidParticle = () => {
     particlesRef.current.push({
        id: Math.random().toString(),
        pos: { x: rand(0, CANVAS_WIDTH), y: -50 },
        velocity: { x: rand(-2, 2), y: rand(20, 60) },
        life: 5, maxLife: 5,
        color: `rgba(${rand(100, 200)}, 0, ${rand(200, 255)}, 0.1)`,
        size: rand(50, 150)
     });
  };

  const createExplosion = (pos: Vector2D, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { ...pos },
        velocity: { x: rand(-8, 8), y: rand(-8, 8) },
        life: 1.0, maxLife: 1.0, color, size: rand(2, 6)
      });
    }
  };

  const createLightning = (start: Vector2D, end: Vector2D) => {
     particlesRef.current.push({
        id: Math.random().toString(),
        pos: { ...start },
        velocity: { x: 0, y: 0 },
        life: 0.2, maxLife: 0.2, color: COLORS.LIGHTNING, size: 2,
        isLightning: true, targetPos: { ...end }
     });
  };

  const createGrazeEffect = (pos: Vector2D) => {
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { ...pos },
        velocity: { x: rand(-5, 5), y: rand(-5, 5) },
        life: 0.5, maxLife: 0.5, color: COLORS.GRAZE_SPARK, size: rand(1, 3)
      });
    }
  };

  const triggerBulletClear = (pos: Vector2D, radius: number) => {
     createExplosion(pos, 15, '#ffffff'); 
     bulletsRef.current.forEach(b => {
        if (b.owner === 'ENEMY') {
           const dx = b.pos.x - pos.x;
           const dy = b.pos.y - pos.y;
           if (Math.sqrt(dx*dx+dy*dy) < radius) {
              b.isDead = true;
              playerRef.current.score += 10;
              spawnFloatingText(b.pos, "10", COLORS.TEXT_DAMAGE_NORMAL, 12);
              createExplosion(b.pos, 2, '#fff');
           }
        }
     });
  };

  const createShieldPulse = (pos: Vector2D) => {
    createExplosion(pos, 20, COLORS.PLAYER);
    triggerBulletClear(pos, 250);
  };

  const triggerEMP = useCallback(() => {
    const player = playerRef.current;
    triggerShake(0.5);
    createExplosion({x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2}, 100, '#ffffff');
    enemiesRef.current.forEach(e => {
      if (e.type !== EnemyType.BOSS) {
        e.health = 0; 
        player.score += e.scoreValue;
        spawnFloatingText(e.pos, "WIPEOUT!", COLORS.TEXT_DAMAGE_CRIT, 30);
        createExplosion(e.pos, 10, e.color);
      } else {
        e.health -= 1000;
        spawnFloatingText(e.pos, "1000", COLORS.TEXT_DAMAGE_CRIT, 40);
      }
    });
    bulletsRef.current.forEach(b => {
      if (b.owner === 'ENEMY') {
        b.isDead = true;
        createExplosion(b.pos, 2, '#fff');
      }
    });
  }, []);

  const activateSkill = useCallback(() => {
      if (playerRef.current.skillCharge >= 100 && !playerRef.current.isDead) {
          playerRef.current.skillCharge = 0;
          setSkillCharge(0);
          triggerEMP();
      }
  }, [triggerEMP, setSkillCharge]);

  const triggerDash = useCallback(() => {
    const player = playerRef.current;
    if (player.dashCooldown <= 0 && !player.isDead) {
      player.dashCooldown = DASH_COOLDOWN;
      player.dashTimer = DASH_DURATION;
      player.invincibleTimer = DASH_DURATION + 0.1;
      createExplosion(player.pos, 10, COLORS.PLAYER);
    }
  }, []);

  useEffect(() => {
    triggerSkillRef.current = activateSkill;
    triggerDashRef.current = triggerDash;
  }, [activateSkill, triggerDash, triggerSkillRef, triggerDashRef]);

  const spawnEnemy = (dt: number, score: number) => {
    spawnTimerRef.current += dt;
    const difficultyMultiplier = 1 + (score / 10000);
    const spawnRate = Math.max(0.3, 1.5 / difficultyMultiplier); 

    if (spawnTimerRef.current > spawnRate && !bossSpawnedRef.current) {
      spawnTimerRef.current = 0;
      const r = Math.random();
      let type = EnemyType.DRONE;
      let width = 45;
      let hp = 20; 
      let color = COLORS.ENEMY_DRONE;
      let scoreVal = 100;
      
      const isElite = Math.random() < 0.1; 
      const hpMult = isElite ? 3 : 1;

      if (r > 0.95) {
         type = EnemyType.SNIPER; width = 40; hp = 30 * hpMult; color = COLORS.ENEMY_SNIPER; scoreVal = 500;
      } else if (r > 0.9) {
         type = EnemyType.MINE; width = 50; hp = 9999; color = COLORS.ENEMY_MINE; scoreVal = 0;
      } else if (r > 0.8) {
        type = EnemyType.CHASER; width = 35; hp = 15 * hpMult; color = COLORS.ENEMY_CHASER; scoreVal = 400;
      } else if (r > 0.6) {
        type = EnemyType.FIGHTER; width = 65; hp = 60 * hpMult; color = COLORS.ENEMY_FIGHTER; scoreVal = 300;
      }

      enemiesRef.current.push({
        id: Math.random().toString(),
        pos: { x: rand(50, CANVAS_WIDTH - 50), y: -60 },
        velocity: { x: 0, y: 0 },
        width, height: width, color, 
        health: hp, maxHealth: hp, isDead: false,
        type, scoreValue: scoreVal * (isElite ? 2 : 1), timeAlive: 0,
        isElite, aimingTimer: 0, hitFlashTimer: 0
      });
    }

    if (score > 5000 && !bossSpawnedRef.current && enemiesRef.current.length === 0) {
      bossSpawnedRef.current = true;
      generateBossTaunt(score).then(taunt => {
        setBossMessage(taunt);
        setTimeout(() => setBossMessage(null), 4000);
      });
      enemiesRef.current.push({
        id: 'boss',
        pos: { x: CANVAS_WIDTH / 2, y: -200 },
        velocity: { x: 0, y: 1 },
        width: 220, height: 180, color: COLORS.ENEMY_BOSS,
        health: 4000, maxHealth: 4000, isDead: false,
        type: EnemyType.BOSS, scoreValue: 20000, timeAlive: 0,
        bossState: 'IDLE', bossTimer: 0, hitFlashTimer: 0
      });
    }
  };

  const firePlayerWeapon = (player: Player) => {
     const isFever = player.heat >= 100;
     const level = isFever ? 5 : player.weaponLevel;

     if (player.weaponType === WeaponType.BEAM) {
        bulletsRef.current.push({
          id: Math.random().toString(),
          pos: { x: player.pos.x, y: player.pos.y - 40 },
          velocity: { x: 0, y: -BULLET_SPEED * 4 },
          width: 12 + (level * 4), height: 150, color: COLORS.WEAPON_BEAM,
          owner: 'PLAYER', damage: 8 + level * 2,
          health: 5 + level, maxHealth: 10, isDead: false, isBeam: true 
        });
     } else if (player.weaponType === WeaponType.SCATTER) {
        const count = 5 + Math.floor(level);
        const spread = 0.8;
        for(let i=0; i<count; i++) {
           const angle = -Math.PI/2 + (i - (count-1)/2) * (spread / count);
           bulletsRef.current.push({
            id: Math.random().toString(),
            pos: { x: player.pos.x, y: player.pos.y - 30 },
            velocity: { x: Math.cos(angle) * BULLET_SPEED * 1.2, y: Math.sin(angle) * BULLET_SPEED * 1.2 },
            width: 14, height: 14, color: COLORS.WEAPON_SCATTER,
            owner: 'PLAYER', damage: 10, 
            health: 1, maxHealth: 1, isDead: false
           });
        }
     } else {
        // Plasma
        bulletsRef.current.push({
          id: Math.random().toString(),
          pos: { x: player.pos.x, y: player.pos.y - 40 },
          velocity: { x: 0, y: -BULLET_SPEED * 1.5 },
          width: 12, height: 40, color: COLORS.WEAPON_PLASMA,
          owner: 'PLAYER', damage: 20 + level * 5,
          health: 1, maxHealth: 1, isDead: false
        });
        if (level >= 2) {
           bulletsRef.current.push({
             id: Math.random().toString(),
             pos: { x: player.pos.x - 20, y: player.pos.y },
             velocity: { x: -2, y: -BULLET_SPEED * 1.4 },
             width: 8, height: 25, color: COLORS.WEAPON_PLASMA,
             owner: 'PLAYER', damage: 15, health: 1, maxHealth: 1, isDead: false
           });
           bulletsRef.current.push({
             id: Math.random().toString(),
             pos: { x: player.pos.x + 20, y: player.pos.y },
             velocity: { x: 2, y: -BULLET_SPEED * 1.4 },
             width: 8, height: 25, color: COLORS.WEAPON_PLASMA,
             owner: 'PLAYER', damage: 15, health: 1, maxHealth: 1, isDead: false
           });
        }
     }

     if (player.orbitals > 0) {
        const time = Date.now() / 200;
        for(let i=0; i<player.orbitals; i++) {
           const angle = time + (i * Math.PI);
           const ox = player.pos.x + Math.cos(angle) * ORBITAL_RADIUS;
           const oy = player.pos.y + Math.sin(angle) * ORBITAL_RADIUS;
           bulletsRef.current.push({
             id: Math.random().toString(),
             pos: { x: ox, y: oy },
             velocity: { x: 0, y: -BULLET_SPEED * 1.2 },
             width: 6, height: 15, color: '#00ffff',
             owner: 'PLAYER', damage: 10, health: 1, maxHealth: 1, isDead: false
           });
        }
     }
  };

  const fireMissiles = (player: Player) => {
     const targets = enemiesRef.current.filter(e => !e.isDead && e.type !== EnemyType.MINE);
     if (targets.length === 0) return;
     const count = 2 + (player.heat >= 100 ? 2 : 0);
     for(let i=0; i<count; i++) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        bulletsRef.current.push({
          id: Math.random().toString(),
          pos: { x: player.pos.x + (i%2===0?-20:20), y: player.pos.y },
          velocity: { x: i%2===0?-2:2, y: 2 },
          width: 10, height: 20, color: COLORS.WEAPON_MISSILE,
          owner: 'PLAYER', damage: 40, health: 1, maxHealth: 1, isDead: false,
          isMissile: true, targetId: target.id
        });
     }
  };

  const updateGame = (timestamp: number) => {
    if (gameState !== GameState.PLAYING) return;
    
    const isInputActive = keysRef.current[' '] || keysRef.current['ArrowLeft'] || keysRef.current['ArrowRight'] || keysRef.current['ArrowUp'] || keysRef.current['ArrowDown'] || touchPosRef.current !== null;
    isShootingRef.current = isInputActive; 
    
    const timeScale = isInputActive ? 1.0 : 0.4; 
    const dtRaw = (timestamp - lastTimeRef.current) / 1000;
    const dt = Math.min(dtRaw, 0.1) * timeScale; 
    
    lastTimeRef.current = timestamp;

    if (shakeTimerRef.current > 0) shakeTimerRef.current -= dtRaw;

    const player = playerRef.current;

    // --- Shield Regeneration ---
    player.shieldRegenTimer += dt;
    if (player.shieldRegenTimer > SHIELD_REGEN_DELAY && player.shield < player.maxShield) {
       player.shield = Math.min(player.maxShield, player.shield + (20 * dt)); // Regen rate
    }

    // --- Health Regeneration (Paladin or Heat) ---
    if ((player.heat > 50 || player.shipType === PlayerShipType.PALADIN) && player.health < player.maxHealth) {
        regenTimerRef.current += dt;
        const threshold = player.heat > 90 ? 0.2 : 1.0; 
        if (regenTimerRef.current > threshold) {
            player.health = Math.min(player.maxHealth, player.health + 1);
            setHealth((player.health / player.maxHealth) * 100);
            regenTimerRef.current = 0;
        }
    }

    if (player.heat > 0) {
      player.heat = Math.max(0, player.heat - (HEAT_DECAY * dt));
      setHeat(player.heat);
    }

    if (player.missilesUnlocked) {
       player.missileTimer -= dt;
       if (player.missileTimer <= 0) {
          fireMissiles(player);
          player.missileTimer = MISSILE_COOLDOWN;
       }
    }

    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.dashTimer > 0) player.dashTimer -= dt;

    // Background Logic
    themeTimerRef.current += dt;
    if (themeTimerRef.current > THEME_CHANGE_INTERVAL) {
       themeTimerRef.current = 0;
       if (bgThemeRef.current === BackgroundTheme.NEON_CITY) bgThemeRef.current = BackgroundTheme.MATRIX;
       else if (bgThemeRef.current === BackgroundTheme.MATRIX) bgThemeRef.current = BackgroundTheme.VOID;
       else bgThemeRef.current = BackgroundTheme.NEON_CITY;
    }

    // Background Spawners
    if (bgThemeRef.current === BackgroundTheme.NEON_CITY) {
      if (Math.random() < 0.05) spawnCityBlock();
      cityBlocksRef.current.forEach(block => {
        block.y += (100 * block.depth) * dt; 
        if (block.y > CANVAS_HEIGHT) block.y = CANVAS_HEIGHT + 1000; 
      });
      cityBlocksRef.current = cityBlocksRef.current.filter(b => b.y < CANVAS_HEIGHT + 200);
    } else if (bgThemeRef.current === BackgroundTheme.MATRIX) {
       if (Math.random() < 0.1) spawnMatrixChar();
    } else if (bgThemeRef.current === BackgroundTheme.VOID) {
       if (Math.random() < 0.02) spawnVoidParticle();
       if (Math.random() < 0.01) createLightning({x: rand(0, CANVAS_WIDTH), y: 0}, {x: rand(0, CANVAS_WIDTH), y: CANVAS_HEIGHT});
    }

    if (player.combo > 0) {
      player.comboTimer -= dt;
      if (player.comboTimer <= 0) {
        player.combo = 0;
        setCombo(0);
      }
    }

    let dx = 0, dy = 0;
    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) dx = -1;
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) dx = 1;
    if (keysRef.current['ArrowUp'] || keysRef.current['w']) dy = -1;
    if (keysRef.current['ArrowDown'] || keysRef.current['s']) dy = 1;
    if (keysRef.current[' ']) { activateSkill(); keysRef.current[' '] = false; }
    if ((keysRef.current['Shift'] || keysRef.current['Control']) && player.dashCooldown <= 0) triggerDash();

    let currentSpeed = BASE_PLAYER_SPEED * SHIP_STATS[selectedShip].speedMult;
    if (player.dashTimer > 0) {
       currentSpeed = DASH_SPEED;
       if (dx === 0 && dy === 0) dy = -1;
    } else if (touchPosRef.current) {
       const targetX = touchPosRef.current.x;
       const targetY = touchPosRef.current.y;
       dx = (targetX - player.pos.x);
       dy = (targetY - player.pos.y);
       const dist = Math.sqrt(dx*dx + dy*dy);
       if (dist > 5) { dx /= dist; dy /= dist; currentSpeed = dist * 10; } else { dx = 0; dy = 0; }
    }

    if (dx !== 0 || dy !== 0) {
       if (!touchPosRef.current && player.dashTimer <= 0) {
          const len = Math.sqrt(dx*dx + dy*dy);
          dx /= len; dy /= len;
       }
       player.pos.x += dx * currentSpeed * dt;
       player.pos.y += dy * currentSpeed * dt;
    }

    player.pos.x = Math.max(player.width/2, Math.min(CANVAS_WIDTH - player.width/2, player.pos.x));
    player.pos.y = Math.max(player.height/2, Math.min(CANVAS_HEIGHT - player.height/2, player.pos.y));

    if (isShootingRef.current || player.heat >= 100) { 
       const baseRate = player.weaponType === WeaponType.BEAM ? 10 : (player.weaponType === WeaponType.SCATTER ? 20 : 6);
       const fireRate = player.heat >= 80 ? baseRate / 2 : baseRate; 
       if (frameRef.current % Math.floor(fireRate) === 0) firePlayerWeapon(player);
    }

    spawnEnemy(dt, player.score);
    
    enemiesRef.current.forEach(enemy => {
      enemy.timeAlive += dt;
      if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;
      
      // Simple movement logic for demo
      if (enemy.type === EnemyType.CHASER) {
        const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
        enemy.velocity.x = Math.cos(angle) * 250 * dt;
        enemy.velocity.y = Math.sin(angle) * 250 * dt + 100 * dt;
        enemy.pos.x += enemy.velocity.x * 10;
        enemy.pos.y += enemy.velocity.y * 10;
      } else if (enemy.type === EnemyType.SNIPER) {
         if (enemy.pos.y < 200) enemy.pos.y += 100 * dt; 
         else {
            if (enemy.aimingTimer === undefined) enemy.aimingTimer = 0;
            enemy.aimingTimer += dt;
            if (enemy.aimingTimer < SNIPER_AIM_TIME) {
               enemy.lockedPos = { ...player.pos };
            } else if (enemy.aimingTimer >= SNIPER_AIM_TIME && enemy.aimingTimer < SNIPER_AIM_TIME + 0.2) {
               if (!enemy.velocity.x) { 
                  const angle = Math.atan2((enemy.lockedPos?.y || player.pos.y) - enemy.pos.y, (enemy.lockedPos?.x || player.pos.x) - enemy.pos.x);
                  bulletsRef.current.push({
                     id: Math.random().toString(), pos: { x: enemy.pos.x, y: enemy.pos.y },
                     velocity: { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 },
                     width: 10, height: 10, color: '#fff',
                     owner: 'ENEMY', damage: 15, health: 1, maxHealth: 1, isDead: false
                  });
                  enemy.velocity.x = 1; 
               }
            } else if (enemy.aimingTimer > SNIPER_AIM_TIME + 1) {
               enemy.aimingTimer = 0; enemy.velocity.x = 0;
            }
         }
      } else if (enemy.type === EnemyType.MINE) {
         enemy.pos.y += 100 * dt; enemy.pos.x += Math.sin(enemy.timeAlive) * 0.5;
      } else if (enemy.type === EnemyType.BOSS) {
         enemy.bossTimer = (enemy.bossTimer || 0) + dt;
         if (!enemy.bossState) enemy.bossState = 'IDLE';
         if (enemy.bossState === 'IDLE') {
           if (enemy.pos.y < 150) enemy.pos.y += 80 * dt;
           else {
             enemy.pos.x = (CANVAS_WIDTH/2) + Math.sin(enemy.timeAlive * 0.5) * 200;
             enemy.pos.y = 150 + Math.cos(enemy.timeAlive * 1.1) * 40;
           }
           if (Math.floor(enemy.timeAlive * 10) % 5 === 0) {
             bulletsRef.current.push({
                id: Math.random().toString(), pos: { x: enemy.pos.x + rand(-50, 50), y: enemy.pos.y + 60 },
                velocity: { x: rand(-2, 2), y: 6 }, width: 15, height: 15, color: COLORS.ENEMY_BULLET,
                owner: 'ENEMY', damage: 8, health: 1, maxHealth: 1, isDead: false
             });
           }
           if (enemy.bossTimer > 4.0) {
              if (Math.random() > 0.5) {
                  enemy.bossState = 'SPIRAL';
                  setBossMessage("BULLET STORM");
              } else {
                  enemy.bossState = 'CHARGE';
                  setBossMessage("ION CANNON CHARGING...");
              }
              enemy.bossTimer = 0;
           }
        } else if (enemy.bossState === 'SPIRAL') {
            if (Math.floor(enemy.bossTimer * 20) % 2 === 0) {
                const angle = (enemy.bossTimer * 5);
                for(let i=0; i<4; i++) { 
                    const firingAngle = angle + (i * (Math.PI/2));
                    bulletsRef.current.push({
                        id: Math.random().toString(), pos: { x: enemy.pos.x, y: enemy.pos.y },
                        velocity: { x: Math.cos(firingAngle)*6, y: Math.sin(firingAngle)*6 },
                        width: 12, height: 12, color: '#ff00ff',
                        owner: 'ENEMY', damage: 8, health: 1, maxHealth: 1, isDead: false
                    });
                }
            }
            if (enemy.bossTimer > 4.0) {
                enemy.bossState = 'IDLE'; enemy.bossTimer = 0;
            }
        } else if (enemy.bossState === 'CHARGE') {
           enemy.pos.x += rand(-2, 2);
           if (enemy.bossTimer > 2.0) {
              enemy.bossState = 'LASER'; enemy.bossTimer = 0; triggerShake(1.0); setBossMessage("FIRING!");
           }
        } else if (enemy.bossState === 'LASER') {
           if (enemy.bossTimer > 1.5) {
              enemy.bossState = 'IDLE'; enemy.bossTimer = 0; setBossMessage(null);
           }
        }
      } else if (enemy.type === EnemyType.FIGHTER) {
        enemy.pos.y += (200 + (player.score/100)) * dt;
        enemy.pos.x += Math.sin(enemy.timeAlive * 3) * 4; 
        if (Math.abs(player.pos.x - enemy.pos.x) > 50) enemy.pos.x += (player.pos.x > enemy.pos.x ? 1 : -1) * 80 * dt;
        if (Math.random() < 0.02) {
           bulletsRef.current.push({
              id: Math.random().toString(), pos: { x: enemy.pos.x, y: enemy.pos.y + 30 },
              velocity: { x: 0, y: 10 }, width: 12, height: 12, color: COLORS.ENEMY_BULLET,
              owner: 'ENEMY', damage: 8, health: 1, maxHealth: 1, isDead: false
           });
        }
      } else {
        enemy.pos.y += (150 + (player.score/200)) * dt;
        enemy.pos.x += Math.sin(enemy.timeAlive * 2 + Number(enemy.id)) * 2; 
        if (Math.random() < 0.005) {
           bulletsRef.current.push({
              id: Math.random().toString(), pos: { x: enemy.pos.x, y: enemy.pos.y + 20 },
              velocity: { x: 0, y: 7 }, width: 10, height: 10, color: COLORS.ENEMY_BULLET,
              owner: 'ENEMY', damage: 5, health: 1, maxHealth: 1, isDead: false
           });
        }
      }
      if (enemy.pos.y > CANVAS_HEIGHT + 100) enemy.isDead = true;
      enemy.pos.x = Math.max(0, Math.min(CANVAS_WIDTH, enemy.pos.x));
    });

    bulletsRef.current.forEach(bullet => {
       if (bullet.isMissile && bullet.targetId) {
          const target = enemiesRef.current.find(e => e.id === bullet.targetId);
          if (target && !target.isDead) {
             const angle = Math.atan2(target.pos.y - bullet.pos.y, target.pos.x - bullet.pos.x);
             bullet.velocity.x += Math.cos(angle) * 1; bullet.velocity.y += Math.sin(angle) * 1;
             const speed = Math.sqrt(bullet.velocity.x*bullet.velocity.x + bullet.velocity.y*bullet.velocity.y);
             if (speed > 15) { bullet.velocity.x = (bullet.velocity.x / speed) * 15; bullet.velocity.y = (bullet.velocity.y / speed) * 15; }
          }
       }
      bullet.pos.x += bullet.velocity.x; bullet.pos.y += bullet.velocity.y;
      if (bullet.pos.y < -100 || bullet.pos.y > CANVAS_HEIGHT + 100 || bullet.pos.x < -100 || bullet.pos.x > CANVAS_WIDTH + 100) bullet.isDead = true;
    });

    enemiesRef.current.forEach(enemy => {
       if (enemy.type === EnemyType.BOSS && enemy.bossState === 'LASER') {
          if (Math.abs(player.pos.x - enemy.pos.x) < (40 + CORE_HITBOX_SIZE/2) && player.invincibleTimer <= 0) takeDamage(1);
       }
    });

    bulletsRef.current.filter(b => b.owner === 'ENEMY').forEach(bullet => {
       const playerCoreRadius = CORE_HITBOX_SIZE / 2;
       const bulletRadius = bullet.width / 2;
       const dx = bullet.pos.x - player.pos.x;
       const dy = bullet.pos.y - player.pos.y;
       const dist = Math.sqrt(dx*dx + dy*dy);

       if (dist < (playerCoreRadius + bulletRadius) && player.invincibleTimer <= 0) {
          bullet.isDead = true; takeDamage(bullet.damage);
       } else if (!bullet.grazed && !bullet.isDead) {
          if (dist < GRAZE_DISTANCE + bulletRadius + playerCoreRadius) {
             bullet.grazed = true; player.score += 50; setScore(player.score);
             player.skillCharge = Math.min(100, player.skillCharge + 2.5); setSkillCharge(player.skillCharge);
             player.heat = Math.min(100, player.heat + 1); setHeat(player.heat);
             createGrazeEffect(player.pos);
          }
       }
    });

    bulletsRef.current.filter(b => b.owner === 'PLAYER').forEach(bullet => {
      enemiesRef.current.forEach(enemy => {
        if (!bullet.isDead && !enemy.isDead && checkCollision(bullet, enemy)) {
          if (!bullet.isBeam) bullet.isDead = true;
          if (enemy.type === EnemyType.MINE) { createExplosion(bullet.pos, 1, '#333'); return; }
          
          enemy.health -= bullet.damage;
          enemy.hitFlashTimer = 0.1; 
          
          if (player.weaponType === WeaponType.PLASMA) {
             const nearby = enemiesRef.current.find(e => e.id !== enemy.id && !e.isDead && 
                 Math.sqrt(Math.pow(e.pos.x - enemy.pos.x, 2) + Math.pow(e.pos.y - enemy.pos.y, 2)) < 250
             );
             if (nearby) {
                 nearby.health -= bullet.damage * 0.5; 
                 nearby.hitFlashTimer = 0.1;
                 createLightning(enemy.pos, nearby.pos);
             }
          }

          const isCrit = Math.random() < 0.1 || player.heat > 80;
          const dmg = Math.floor(bullet.damage * (isCrit ? 1.5 : 1));
          spawnFloatingText(enemy.pos, dmg.toString(), isCrit ? COLORS.TEXT_DAMAGE_CRIT : COLORS.TEXT_DAMAGE_NORMAL, isCrit ? 24 : 16);
          
          createExplosion(bullet.pos, 3, bullet.color);
          if (enemy.health <= 0) {
            enemy.isDead = true;
            player.combo += 1; player.comboTimer = 3.0; setCombo(player.combo);
            
            const heatMult = 1 + (player.heat / 100);
            const scoreGain = Math.floor(enemy.scoreValue * (1 + player.combo * 0.1) * heatMult);
            player.score += scoreGain; setScore(player.score);
            player.skillCharge = Math.min(100, player.skillCharge + (2 + player.combo * 0.2)); setSkillCharge(player.skillCharge);
            player.heat = Math.min(100, player.heat + 3); setHeat(player.heat);

            createExplosion(enemy.pos, 15, enemy.color);
            triggerShake(0.1);
            
            if (enemy.isElite) {
               triggerShake(0.5);
               triggerBulletClear(enemy.pos, 400); 
               spawnFloatingText(enemy.pos, "BULLET CANCEL!", '#ffffff', 30);
            }

            if (enemy.isElite || Math.random() < 0.35) {
               const r = Math.random();
               let pType: PowerUp['type'] = 'DATA_CHIP';
               if (enemy.isElite) pType = Math.random() > 0.5 ? 'WEAPON_UP' : 'ORBITAL';
               else {
                  if (r > 0.98) pType = 'MEGA_BOMB'; 
                  else if (r > 0.9) pType = 'ORBITAL'; 
                  else if (r > 0.8) pType = 'HEALTH'; 
                  else if (r > 0.7) pType = 'WEAPON_UP'; 
                  else if (r > 0.4) pType = 'DATA_CHIP';
               }
               if (r > 0.85 && r <= 0.9) pType = 'SHIELD';
               let wDrop: WeaponType | undefined;
               if (Math.random() > 0.85) {
                   pType = 'WEAPON_SWAP';
                   const wRand = Math.random();
                   if(wRand < 0.33) wDrop = WeaponType.PLASMA; else if(wRand < 0.66) wDrop = WeaponType.SCATTER; else wDrop = WeaponType.BEAM;
               }
               powerUpsRef.current.push({
                  id: Math.random().toString(), pos: { ...enemy.pos }, velocity: { x: 0, y: 3 },
                  width: 40, height: 40, color: '#fff', type: pType, weaponDrop: wDrop, health: 1, maxHealth: 1, isDead: false
               });
            }
            if (enemy.type === EnemyType.BOSS) {
               bossSpawnedRef.current = false; setBossMessage("THREAT ELIMINATED."); triggerShake(2.0); setTimeout(() => setGameState(GameState.GAME_OVER), 4000);
            }
          }
        }
      });
    });

    if (player.invincibleTimer <= 0) {
      enemiesRef.current.forEach(enemy => {
         if (!enemy.isDead && checkCollision(enemy, player, 1.0, 0.4)) { 
           if (enemy.type !== EnemyType.BOSS) { enemy.health -= 100; if (enemy.health <= 0) enemy.isDead = true; }
           takeDamage(20);
         }
      });
    } else player.invincibleTimer -= dt;

    powerUpsRef.current.forEach(p => {
      const distToPlayer = Math.sqrt(Math.pow(p.pos.x - player.pos.x, 2) + Math.pow(p.pos.y - player.pos.y, 2));
      const magnetThreshold = player.heat > 50 ? 300 : 100;
      if (distToPlayer < magnetThreshold) {
         const angle = Math.atan2(player.pos.y - p.pos.y, player.pos.x - p.pos.x);
         p.pos.x += Math.cos(angle) * 500 * dt; p.pos.y += Math.sin(angle) * 500 * dt;
      } else p.pos.y += p.velocity.y;

      if (checkCollision(p, player)) {
        p.isDead = true;
        if (p.type === 'HEALTH') { player.health = Math.min(player.maxHealth, player.health + 30); setHealth((player.health / player.maxHealth) * 100); spawnFloatingText(player.pos, "+HP", COLORS.TEXT_HEAL); }
        else if (p.type === 'WEAPON_UP') { player.weaponLevel = Math.min(5, player.weaponLevel + 1); spawnFloatingText(player.pos, "UPGRADE!", COLORS.POWERUP_WEAPON); }
        else if (p.type === 'SHIELD') { player.shield = player.maxShield; spawnFloatingText(player.pos, "SHIELD RECHARGE", '#fff'); }
        else if (p.type === 'WEAPON_SWAP' && p.weaponDrop) { player.weaponType = p.weaponDrop; spawnFloatingText(player.pos, p.weaponDrop, '#fff'); }
        else if (p.type === 'ORBITAL') { player.orbitals = Math.min(4, player.orbitals + 1); spawnFloatingText(player.pos, "DRONE", COLORS.POWERUP_ORBITAL); }
        else if (p.type === 'DATA_CHIP') { player.score += 500; setScore(player.score); player.heat = Math.min(100, player.heat + 5); setHeat(player.heat); }
        else if (p.type === 'MEGA_BOMB') { triggerEMP(); spawnFloatingText(player.pos, "NUKE!!!", '#ff0000', 50); }
      }
      if (p.pos.y > CANVAS_HEIGHT + 50) p.isDead = true;
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);
    bulletsRef.current = bulletsRef.current.filter(b => !b.isDead);
    powerUpsRef.current = powerUpsRef.current.filter(p => !p.isDead);
    
    particlesRef.current.forEach(p => { 
        p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; 
        if (p.isLightning) p.life -= 10.0 * dt; 
        else if (p.isMatrixChar) p.life -= 0.5 * dt;
        else p.life -= 2.5 * dt; 
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    floatingTextsRef.current.forEach(t => { t.pos.y += t.velocity.y; t.life -= 2.0 * dt; });
    floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);
  };

  const takeDamage = (amount: number) => {
    const player = playerRef.current;
    player.shieldRegenTimer = 0; // Reset regen timer

    // Shield absorbs damage first
    if (player.shield > 0) {
       player.shield -= amount;
       createExplosion(player.pos, 5, '#00ffff'); // Blue shield sparks
       if (player.shield < 0) {
           // Bleed through to health
           player.health += player.shield; // shield is negative here
           player.shield = 0;
           createExplosion(player.pos, 5, '#ff0000');
       }
    } else {
       player.health -= amount;
       createExplosion(player.pos, 5, '#ff0000');
    }
    
    // Only reset combo/heat if actual health damage was taken or shield broke hard
    if (player.shield <= 0) {
       player.combo = 0; setCombo(0); player.heat = 0; setHeat(0);
    }

    setHealth((player.health / player.maxHealth) * 100);
    createShieldPulse(player.pos);
    triggerShake(0.4);
    player.invincibleTimer = 1.5;
    if (player.health <= 0) setGameState(GameState.GAME_OVER);
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);

      // Shield Bar (Visual under ship)
      if (p.shield > 0) {
         ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
         const sPct = p.shield / p.maxShield;
         ctx.beginPath();
         ctx.arc(0, 0, 40 + (sPct * 10), 0, Math.PI * 2);
         ctx.fill();
         ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
         ctx.lineWidth = 1;
         ctx.stroke();
      }

      const color = p.color;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;

      if (p.shipType === PlayerShipType.WRAITH) {
         // Classic forward swept
         ctx.beginPath();
         ctx.moveTo(0, -40);
         ctx.lineTo(15, 10);
         ctx.lineTo(35, 30);
         ctx.lineTo(10, 25);
         ctx.lineTo(0, 35);
         ctx.lineTo(-10, 25);
         ctx.lineTo(-35, 30);
         ctx.lineTo(-15, 10);
         ctx.closePath();
         ctx.fill();
         // Cockpit
         ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(5, 0); ctx.lineTo(0, 10); ctx.lineTo(-5, 0); ctx.fill();
      } else if (p.shipType === PlayerShipType.TITAN) {
         // Bulky, heavy
         ctx.beginPath();
         ctx.moveTo(0, -35);
         ctx.lineTo(20, -20);
         ctx.lineTo(30, 10);
         ctx.lineTo(45, 25);
         ctx.lineTo(20, 35);
         ctx.lineTo(0, 25);
         ctx.lineTo(-20, 35);
         ctx.lineTo(-45, 25);
         ctx.lineTo(-30, 10);
         ctx.lineTo(-20, -20);
         ctx.closePath();
         ctx.fill();
         // Armor Plates
         ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      } else if (p.shipType === PlayerShipType.VIPER) {
         // Needle, fast
         ctx.beginPath();
         ctx.moveTo(0, -50);
         ctx.lineTo(10, 0);
         ctx.lineTo(25, 25); // Reverse wing tip
         ctx.lineTo(5, 35);
         ctx.lineTo(0, 45);
         ctx.lineTo(-5, 35);
         ctx.lineTo(-25, 25);
         ctx.lineTo(-10, 0);
         ctx.closePath();
         ctx.fill();
      } else if (p.shipType === PlayerShipType.GHOST) {
         // Split design
         ctx.beginPath();
         // Left wing
         ctx.moveTo(-10, -30); ctx.lineTo(-30, 0); ctx.lineTo(-20, 30); ctx.lineTo(-5, 20);
         // Right wing
         ctx.moveTo(10, -30); ctx.lineTo(30, 0); ctx.lineTo(20, 30); ctx.lineTo(5, 20);
         // Center
         ctx.moveTo(0, -20); ctx.lineTo(3, 30); ctx.lineTo(-3, 30);
         ctx.fill();
         ctx.shadowBlur = 30; // Extra glow
      } else if (p.shipType === PlayerShipType.PALADIN) {
         // Circular / Halo
         ctx.beginPath();
         ctx.arc(0, 0, 20, 0, Math.PI*2);
         ctx.fill();
         ctx.beginPath();
         ctx.arc(0, 0, 35, 0, Math.PI*2); // Ring
         ctx.strokeStyle = color;
         ctx.lineWidth = 3;
         ctx.stroke();
         // Spikes
         ctx.beginPath(); ctx.moveTo(0, -45); ctx.lineTo(5, -35); ctx.lineTo(-5, -35); ctx.fill();
      }

      // Core Hitbox debug
      // ctx.fillStyle = 'white'; ctx.fillRect(-CORE_HITBOX_SIZE/2, -CORE_HITBOX_SIZE/2, CORE_HITBOX_SIZE, CORE_HITBOX_SIZE);

      ctx.restore();
  };

  const drawGame = (ctx: CanvasRenderingContext2D) => {
    const player = playerRef.current;
    
    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (bgThemeRef.current === BackgroundTheme.MATRIX) {
       ctx.fillStyle = 'rgba(0, 20, 0, 0.9)'; // Darker green tint
       ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (bgThemeRef.current === BackgroundTheme.VOID) {
       const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 100, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 800);
       grad.addColorStop(0, '#1a0033');
       grad.addColorStop(1, '#050010');
       ctx.fillStyle = grad;
       ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (player.heat >= 90) {
        const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH/3, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.save();
    if (shakeTimerRef.current > 0) {
      const mag = shakeTimerRef.current * 20;
      ctx.translate(rand(-mag, mag), rand(-mag, mag));
    }

    // Draw City Blocks (Only in Neon City)
    if (bgThemeRef.current === BackgroundTheme.NEON_CITY) {
       ctx.lineWidth = 2;
       cityBlocksRef.current.forEach(block => {
         ctx.strokeStyle = block.color; ctx.fillStyle = block.color.replace('0.1', '0.05'); 
         const perspective = 0.2; const wTop = block.width * (1 - perspective); const xOffset = (block.width - wTop) / 2;
         ctx.beginPath(); ctx.moveTo(block.x + xOffset, block.y); ctx.lineTo(block.x + block.width - xOffset, block.y);
         ctx.lineTo(block.x + block.width, block.y + block.height); ctx.lineTo(block.x, block.y + block.height); ctx.closePath();
         ctx.stroke(); ctx.fill();
         if (block.hasNeon && block.neonColor) {
            ctx.shadowColor = block.neonColor; ctx.shadowBlur = 20; ctx.fillStyle = block.neonColor;
            ctx.fillRect(block.x + 10, block.y + 20, block.width - 20, 10); ctx.shadowBlur = 0;
         }
       });
    }

    enemiesRef.current.forEach(e => {
      ctx.save();
      ctx.translate(e.pos.x, e.pos.y);
      
      if (e.hitFlashTimer && e.hitFlashTimer > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ffffff';
      } else {
          ctx.shadowBlur = e.isElite ? 20 : 10;
          ctx.shadowColor = e.isElite ? COLORS.ENEMY_ELITE_GLOW : e.color;
          ctx.fillStyle = e.color;
      }

      if (e.isElite) { ctx.strokeStyle = COLORS.ENEMY_ELITE_GLOW; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, e.width/1.5, 0, Math.PI*2); ctx.stroke(); }

      if (e.type === EnemyType.BOSS) {
         if (e.bossState === 'CHARGE') { ctx.strokeStyle = 'red'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rand(-200, 200), 800); ctx.stroke(); }
         else if (e.bossState === 'LASER') { ctx.fillStyle = '#fff'; ctx.shadowBlur = 30; ctx.shadowColor = '#00ffff'; ctx.fillRect(-40, 50, 80, CANVAS_HEIGHT); ctx.fillStyle = '#00ffff'; ctx.fillRect(-10, 50, 20, CANVAS_HEIGHT); }
         ctx.fillStyle = (e.hitFlashTimer && e.hitFlashTimer > 0) ? '#fff' : e.color;
         ctx.beginPath(); ctx.moveTo(0, 80); ctx.lineTo(60, 20); ctx.lineTo(90, -40); ctx.lineTo(50, -90); ctx.lineTo(0, -60); ctx.lineTo(-50, -90); ctx.lineTo(-90, -40); ctx.lineTo(-60, 20); ctx.closePath(); ctx.fill();
      } else if (e.type === EnemyType.SNIPER) {
         ctx.fillRect(-20, -20, 40, 40);
         if (e.aimingTimer && e.aimingTimer < SNIPER_AIM_TIME) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0);
            if (e.lockedPos) ctx.lineTo(e.lockedPos.x - e.pos.x, e.lockedPos.y - e.pos.y); else ctx.lineTo(playerRef.current.pos.x - e.pos.x, playerRef.current.pos.y - e.pos.y);
            ctx.stroke();
         }
      } else if (e.type === EnemyType.MINE) {
         ctx.fillStyle = '#222'; ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0, 25, 0, Math.PI*2); ctx.fill(); ctx.stroke();
         for(let i=0; i<8; i++) { const ang = (i * Math.PI / 4) + (e.timeAlive || 0); ctx.moveTo(Math.cos(ang)*25, Math.sin(ang)*25); ctx.lineTo(Math.cos(ang)*40, Math.sin(ang)*40); ctx.stroke(); }
      } else if (e.type === EnemyType.CHASER) {
         const time = e.timeAlive * 10; ctx.rotate(time); ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(12, 10); ctx.lineTo(0, 5); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill();
      } else if (e.type === EnemyType.FIGHTER) {
         ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(20, -10); ctx.lineTo(30, -25); ctx.lineTo(0, -15); ctx.lineTo(-30, -25); ctx.lineTo(-20, -10); ctx.closePath(); ctx.fill();
      } else {
         ctx.rotate(e.timeAlive * 2); ctx.strokeStyle = (e.hitFlashTimer && e.hitFlashTimer > 0) ? '#fff' : e.color; ctx.lineWidth = 2; ctx.strokeRect(-15, -15, 30, 30); ctx.fillStyle = '#000'; ctx.fillRect(-10, -10, 20, 20);
      }
      ctx.restore();
    });

    bulletsRef.current.forEach(b => {
       ctx.save();
       ctx.translate(b.pos.x, b.pos.y);
       ctx.fillStyle = b.color;
       ctx.shadowBlur = 10;
       ctx.shadowColor = b.color;
       if (b.owner === 'PLAYER') {
         if (b.isBeam) {
            ctx.shadowBlur = 25;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-b.width/2, -b.height/2, b.width, b.height);
            ctx.fillStyle = COLORS.WEAPON_BEAM; ctx.globalAlpha = 0.5; ctx.fillRect(-b.width, -b.height/2, b.width*2, b.height); ctx.globalAlpha = 1.0;
         } else if (b.isMissile) {
            const angle = Math.atan2(b.velocity.y, b.velocity.x) + Math.PI/2; ctx.rotate(angle);
            ctx.fillStyle = COLORS.WEAPON_MISSILE; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 15); ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.stroke();
         } else {
            ctx.fillRect(-b.width/2, -b.height/2, b.width, b.height);
         }
       } else {
         ctx.beginPath(); ctx.arc(0, 0, b.width/2, 0, Math.PI*2); ctx.fill();
       }
       ctx.restore();
    });

    powerUpsRef.current.forEach(p => {
       ctx.save(); ctx.translate(p.pos.x, p.pos.y);
       const color = p.type === 'WEAPON_SWAP' ? '#fff' : (p.type === 'DATA_CHIP' ? COLORS.POWERUP_CHIP : (p.type === 'MEGA_BOMB' ? COLORS.POWERUP_BOMB : p.color));
       ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.fillStyle = color;
       if (p.type === 'DATA_CHIP') { ctx.rotate(Date.now() / 500); ctx.fillRect(-10, -10, 20, 20); ctx.strokeStyle = '#fff'; ctx.strokeRect(-10, -10, 20, 20); } 
       else {
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(20,20,20,0.8)';
          ctx.beginPath(); for(let i=0; i<8; i++) { const ang = i * Math.PI/4 + Date.now()/500; ctx.lineTo(Math.cos(ang)*20, Math.sin(ang)*20); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          let symbol = '?';
          if (p.type === 'HEALTH') symbol = '+'; else if (p.type === 'WEAPON_UP') symbol = 'UP'; else if (p.type === 'SHIELD') symbol = 'SH'; else if (p.type === 'ORBITAL') symbol = 'O'; else if (p.type === 'MEGA_BOMB') symbol = '☢';
          else if (p.type === 'WEAPON_SWAP') { if (p.weaponDrop === WeaponType.PLASMA) symbol = 'P'; if (p.weaponDrop === WeaponType.SCATTER) symbol = 'S'; if (p.weaponDrop === WeaponType.BEAM) symbol = 'B'; }
          ctx.fillText(symbol, 0, 0);
       }
       ctx.restore();
    });

    floatingTextsRef.current.forEach(t => {
       ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.globalAlpha = t.life;
       ctx.fillStyle = t.color; ctx.font = `bold ${t.size}px Courier New`;
       ctx.strokeStyle = 'black'; ctx.lineWidth = 2; ctx.strokeText(t.text, 0, 0); ctx.fillText(t.text, 0, 0);
       ctx.restore();
    });

    particlesRef.current.forEach(p => {
       ctx.globalAlpha = p.life; 
       ctx.fillStyle = p.color; 
       if (p.isLightning && p.targetPos) {
          ctx.beginPath(); ctx.moveTo(0,0);
          const midX = (p.targetPos.x - p.pos.x) / 2 + rand(-10, 10);
          const midY = (p.targetPos.y - p.pos.y) / 2 + rand(-10, 10);
          ctx.lineTo(midX, midY); ctx.lineTo(p.targetPos.x - p.pos.x, p.targetPos.y - p.pos.y);
          ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke();
       } else if (p.isMatrixChar && p.char) {
           ctx.font = `${p.size}px monospace`;
           ctx.fillText(p.char, p.pos.x, p.pos.y);
       } else {
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill(); 
       }
       ctx.globalAlpha = 1.0;
    });

    const p = playerRef.current;
    if (p.invincibleTimer <= 0 || Math.floor(Date.now() / 50) % 2 === 0) {
      drawPlayer(ctx, p);
    }
    
    // Orbitals
    if (p.orbitals > 0) {
        ctx.save(); ctx.translate(p.pos.x, p.pos.y);
        const t = Date.now() / 200;
        for(let i=0; i<p.orbitals; i++) {
        const ang = t + (i * Math.PI); const ox = Math.cos(ang) * ORBITAL_RADIUS; const oy = Math.sin(ang) * ORBITAL_RADIUS;
        ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI*2); ctx.fillStyle = '#00ffff'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(ox, oy); ctx.strokeStyle = 'rgba(0,255,255,0.3)'; ctx.stroke();
        }
        ctx.restore();
    }

    if (p.dashTimer > 0) {
        ctx.save(); ctx.translate(p.pos.x, p.pos.y);
        ctx.shadowBlur = 30; ctx.shadowColor = COLORS.DASH_TRAIL; ctx.globalAlpha = 0.5; ctx.fillStyle = COLORS.DASH_TRAIL;
        ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(20, 30); ctx.lineTo(-20, 30); ctx.fill(); ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    ctx.restore();
  };

  const render = (timestamp: number) => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) { updateGame(timestamp); drawGame(ctx); }
    }
    frameRef.current = requestAnimationFrame(render);
  };

  useEffect(() => { frameRef.current = requestAnimationFrame(render); return () => cancelAnimationFrame(frameRef.current); }, [gameState, missionActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
    const handleTouch = (e: TouchEvent) => {
       e.preventDefault(); const touch = e.touches[0]; const canvas = canvasRef.current;
       if (canvas) {
          const rect = canvas.getBoundingClientRect(); const scaleX = CANVAS_WIDTH / rect.width; const scaleY = CANVAS_HEIGHT / rect.height;
          touchPosRef.current = { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
       }
    };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    const canvas = canvasRef.current;
    if(canvas) { canvas.addEventListener('touchstart', handleTouch, {passive: false}); canvas.addEventListener('touchmove', handleTouch, {passive: false}); canvas.addEventListener('touchend', () => touchPosRef.current = null); }
    return () => {
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
      if(canvas) { canvas.removeEventListener('touchstart', handleTouch); canvas.removeEventListener('touchmove', handleTouch); canvas.removeEventListener('touchend', () => {}); }
    };
  }, []);

  return (
    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain bg-black" />
  );
};

export default GameCanvas;
