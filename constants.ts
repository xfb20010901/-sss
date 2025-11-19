
import { PlayerShipType, WeaponType } from './types';

export const CANVAS_WIDTH = 800; 
export const CANVAS_HEIGHT = 1200; 

// Core Gameplay
export const BASE_PLAYER_SPEED = 500;
export const DASH_SPEED = 1500; 
export const DASH_DURATION = 0.2;
export const DASH_COOLDOWN = 0.8; 

export const BULLET_SPEED = 12;
export const ENEMY_BASE_SPEED = 3;
export const GRAZE_DISTANCE = 40; 
export const CORE_HITBOX_SIZE = 6; // Even smaller for better survival

// Mechanics
export const HEAT_DECAY = 5; 
export const ORBITAL_RADIUS = 60;
export const MISSILE_COOLDOWN = 1.5;
export const SNIPER_AIM_TIME = 1.5;
export const SHIELD_REGEN_DELAY = 3.0; // Seconds without damage to regen shield

// Background
export const THEME_CHANGE_INTERVAL = 30; // Seconds

export const SHIP_STATS: Record<PlayerShipType, {
  name: string;
  description: string;
  maxHealth: number;
  maxShield: number;
  speedMult: number;
  startWeapon: WeaponType;
  color: string;
}> = {
  [PlayerShipType.WRAITH]: {
    name: 'WRAITH',
    description: 'Balanced tactical fighter.',
    maxHealth: 100,
    maxShield: 50,
    speedMult: 1.0,
    startWeapon: WeaponType.PLASMA,
    color: '#00ffff' // Cyan
  },
  [PlayerShipType.TITAN]: {
    name: 'TITAN',
    description: 'Heavy armor. Starts with Scatter.',
    maxHealth: 150,
    maxShield: 80,
    speedMult: 0.8,
    startWeapon: WeaponType.SCATTER,
    color: '#ff3333' // Red
  },
  [PlayerShipType.VIPER]: {
    name: 'VIPER',
    description: 'High speed interceptor. Low Defense.',
    maxHealth: 60,
    maxShield: 40,
    speedMult: 1.3,
    startWeapon: WeaponType.PLASMA,
    color: '#00ff00' // Green
  },
  [PlayerShipType.GHOST]: {
    name: 'GHOST',
    description: 'Evasive ops. Fast Dash recharge.',
    maxHealth: 80,
    maxShield: 40,
    speedMult: 1.1,
    startWeapon: WeaponType.BEAM,
    color: '#aa00ff' // Purple
  },
  [PlayerShipType.PALADIN]: {
    name: 'PALADIN',
    description: 'Prototype Shield Tech. Auto-Repair.',
    maxHealth: 120,
    maxShield: 100,
    speedMult: 0.9,
    startWeapon: WeaponType.PLASMA,
    color: '#ffaa00' // Gold
  }
};

export const COLORS = {
  PLAYER: '#00ffff',
  PLAYER_BULLET: '#ffff00',
  
  WEAPON_PLASMA: '#00ffff',
  WEAPON_SCATTER: '#ff00ff',
  WEAPON_BEAM: '#ffff00',
  WEAPON_MISSILE: '#ff8800', 

  ENEMY_DRONE: '#ff00ff',
  ENEMY_FIGHTER: '#ff3333',
  ENEMY_CHASER: '#ff8800', 
  ENEMY_SNIPER: '#00ffaa', 
  ENEMY_MINE: '#333333',   
  ENEMY_BOSS: '#ffffff',
  ENEMY_BULLET: '#ff0055',
  ENEMY_ELITE_GLOW: '#ffaa00', 

  POWERUP_HEALTH: '#00ff00',
  POWERUP_WEAPON: '#0088ff',
  POWERUP_SWAP: '#ffffff',
  POWERUP_ORBITAL: '#00ffff',
  POWERUP_CHIP: '#0000ff', 
  POWERUP_BOMB: '#ff0000', 

  GRAZE_SPARK: '#ffffff',
  DASH_TRAIL: '#00ffff',
  HEAT_BAR: '#ff3300',
  SNIPER_LINE: '#ff0000',
  LIGHTNING: '#00ffff',
  
  TEXT_DAMAGE_NORMAL: '#ffffff',
  TEXT_DAMAGE_CRIT: '#ffff00',
  TEXT_HEAL: '#00ff00'
};

export const API_KEY = process.env.API_KEY || '';
