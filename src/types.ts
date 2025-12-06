export type Vector2 = { x: number; y: number };

export enum PowerUpType {
  Expand = 'EXPAND',
  Shrink = 'SHRINK',
  FastBall = 'FAST_BALL',
  SlowBall = 'SLOW_BALL',
  MultiBall = 'MULTI_BALL',
  Shield = 'SHIELD',
  GravityWell = 'GRAVITY_WELL',
  GhostBall = 'GHOST_BALL',
  Reverse = 'REVERSE_CONTROLS',
  Stun = 'STUN',
  Blindness = 'BLINDNESS',
  Sticky = 'STICKY_PADDLE',
  Wall = 'WALL',
  Portal = 'PORTAL',
  Wind = 'WIND',
  DoublePaddle = 'DOUBLE_PADDLE',
  MachineGun = 'MACHINE_GUN',
  Polymorph = 'POLYMORPH',
  Magnet = 'MAGNET',
  TimeWarp = 'TIME_WARP',
  Gigantism = 'GIGANTISM',
  Tiny = 'TINY',
  Laser = 'LASER',
}

export type PowerUpCategory = 'Paddle' | 'Ball' | 'Environment' | 'Hostile';

export interface Ball {
  id: string;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  speed: number;
  lastHitBy: 'left' | 'right' | null;
  isGhost?: boolean;
  attachedTo?: 'left' | 'right' | null;
  attachTime?: number;
  attachOffset?: number;
  lastPortalId?: string; // To prevent immediate reentry
}

export interface Paddle {
  pos: Vector2; // Top-left position
  width: number;
  height: number;
  score: number;
  hasShield: boolean;
  baseHeight: number;
  // Status Effects (timestamps)
  frozenUntil: number;
  reversedUntil: number;
  blindedUntil: number;
  stickyUntil: number;
  doublePaddleUntil: number;
  magnetUntil: number;
  laserUntil: number;
  lastLaserTime: number;
  // AI State
  aiOffset: number;
}

export interface PowerUp {
  id: string;
  pos: Vector2;
  type: PowerUpType;
  radius: number;
  active: boolean;
  spawnTime: number;
}

export interface Particle {
  id: string;
  pos: Vector2;
  vel: Vector2;
  life: number;
  color: string;
}

export interface WallEntity {
  id: string;
  pos: Vector2;
  width: number;
  height: number;
  life: number;
  // Polymorph properties
  isPoly?: boolean;
  vertices?: Vector2[];
  rotation?: number;
  rotationSpeed?: number;
}

export interface PortalEntity {
  id: string;
  pairId: string;
  pos: Vector2;
  targetPos: Vector2;
  radius: number;
  life: number;
  color: string;
  maxLife: number;
}

export interface Projectile {
    id: string;
    pos: Vector2;
    vel: Vector2;
    owner: 'left' | 'right';
    life: number;
}

export interface GameConfig {
  // Split controls
  leftControl: 'ai' | 'wasd' | 'mouse';
  rightControl: 'ai' | 'arrows' | 'mouse';
  
  aiDifficulty: 'easy' | 'medium' | 'hard' | 'impossible';
  targetScore: number;
  
  // Powerup Settings
  enablePowerups: boolean;
  enabledPowerUpTypes: PowerUpType[];
  powerUpSpawnRate: number; // ms
  maxPowerUps: number;
}
