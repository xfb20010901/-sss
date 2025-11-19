
export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  PAUSED
}

export interface Vector2D {
  x: number;
  y: number;
}

export enum WeaponType {
  PLASMA = 'PLASMA',
  SCATTER = 'SCATTER',
  BEAM = 'BEAM'
}

export enum PlayerShipType {
  WRAITH = 'WRAITH', // Balanced
  TITAN = 'TITAN',   // Tank / Scatter
  VIPER = 'VIPER',   // Speed / Fire rate
  GHOST = 'GHOST',   // Dash / Beam
  PALADIN = 'PALADIN' // Shield / Regen
}

export enum BackgroundTheme {
  NEON_CITY = 'NEON_CITY',
  MATRIX = 'MATRIX',
  VOID = 'VOID'
}

export enum EnemyType {
  DRONE = 'DRONE',
  FIGHTER = 'FIGHTER',
  CHASER = 'CHASER',
  SNIPER = 'SNIPER',
  MINE = 'MINE',
  BOSS = 'BOSS'
}

export interface Entity {
  id: string;
  pos: Vector2D;
  velocity: Vector2D;
  width: number;
  height: number;
  color: string;
  health: number;
  maxHealth: number;
  isDead: boolean;
  isElite?: boolean;
  hitFlashTimer?: number; 
}

export interface Player extends Entity {
  shipType: PlayerShipType;
  weaponLevel: number;
  weaponType: WeaponType;
  // Defensive
  shield: number;
  maxShield: number;
  shieldRegenTimer: number; // Time since last damage
  score: number;
  invincibleTimer: number;
  // Gameplay mechanics
  combo: number;
  comboTimer: number;
  skillCharge: number; 
  // Dash mechanics
  dashCooldown: number;
  dashTimer: number;
  
  // New Mechanics
  heat: number; 
  orbitals: number;
  missilesUnlocked: boolean;
  missileTimer: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  scoreValue: number;
  timeAlive: number;
  bossState?: 'IDLE' | 'CHARGE' | 'LASER' | 'SPIRAL';
  bossTimer?: number;
  aimingTimer?: number;
  lockedPos?: Vector2D; 
}

export interface Bullet extends Entity {
  owner: 'PLAYER' | 'ENEMY';
  damage: number;
  isBeam?: boolean; 
  isMissile?: boolean;
  targetId?: string;
  grazed?: boolean; 
}

export interface Particle {
  id: string;
  pos: Vector2D;
  velocity: Vector2D;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isLightning?: boolean;
  targetPos?: Vector2D;
  isMatrixChar?: boolean; // Visual flair for matrix bg
  char?: string;
}

export interface FloatingText {
  id: string;
  pos: Vector2D;
  velocity: Vector2D;
  text: string;
  color: string;
  life: number;
  size: number;
}

export interface PowerUp extends Entity {
  type: 'HEALTH' | 'WEAPON_UP' | 'SHIELD' | 'WEAPON_SWAP' | 'ORBITAL' | 'DATA_CHIP' | 'MEGA_BOMB';
  weaponDrop?: WeaponType;
}

export interface MissionData {
  title: string;
  description: string;
  objective: string;
}

export interface CityBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number; // 1 to 3, 3 is closest
  color: string;
  hasNeon?: boolean; 
  neonColor?: string;
}
