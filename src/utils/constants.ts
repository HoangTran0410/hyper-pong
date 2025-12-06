import { PowerUpType, PowerUpCategory } from '../types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PADDLE_WIDTH = 15;
export const PADDLE_HEIGHT = 80;
export const PADDLE_SPEED = 8;
export const BALL_RADIUS = 8;
export const BALL_SPEED_BASE = 5;
export const BALL_SPEED_MAX = 15;

export const POWERUP_RADIUS = 15;
export const POWERUP_SPAWN_INTERVAL = 4000; // Default faster
export const POWERUP_LIFETIME = 12000; // 12 seconds

export const COLORS = {
  background: '#1a1a1a',
  foreground: '#eeeeee',
  accent: '#00ffcc',
  paddleLeft: '#ff0055',
  paddleRight: '#00ccff',
  ball: '#ffffff',
  grid: '#333333',
};

export const POWERUP_COLORS: Record<PowerUpType, string> = {
  [PowerUpType.Expand]: '#00ff00',
  [PowerUpType.Shrink]: '#ff0000',
  [PowerUpType.FastBall]: '#ffaa00',
  [PowerUpType.SlowBall]: '#00aaff',
  [PowerUpType.MultiBall]: '#ffff00',
  [PowerUpType.Shield]: '#ff00ff',
  [PowerUpType.GravityWell]: '#9900ff',
  [PowerUpType.GhostBall]: '#aaaaaa',
  [PowerUpType.Reverse]: '#e600ff',
  [PowerUpType.Stun]: '#00ffff',
  [PowerUpType.Blindness]: '#333333',
  [PowerUpType.Sticky]: '#008800',
  [PowerUpType.Wall]: '#885522',
  [PowerUpType.Portal]: '#2255ff',
  [PowerUpType.Wind]: '#ccffff',
  [PowerUpType.DoublePaddle]: '#ff66aa',
  [PowerUpType.MachineGun]: '#ff4400',
  [PowerUpType.Polymorph]: '#aaff00',
  [PowerUpType.Magnet]: '#ff0044',
  [PowerUpType.TimeWarp]: '#8888ff',
  [PowerUpType.Gigantism]: '#ffdd00',
  [PowerUpType.Tiny]: '#00ddff',
  [PowerUpType.Laser]: '#ff0000',
};

export const POWERUP_ICONS: Record<PowerUpType, string> = {
  [PowerUpType.Expand]: '⬆️',
  [PowerUpType.Shrink]: '⬇️',
  [PowerUpType.FastBall]: '🔥',
  [PowerUpType.SlowBall]: '🧊',
  [PowerUpType.MultiBall]: '🎱',
  [PowerUpType.Shield]: '🛡️',
  [PowerUpType.GravityWell]: '🕳️',
  [PowerUpType.GhostBall]: '👻',
  [PowerUpType.Reverse]: '🔀',
  [PowerUpType.Stun]: '⚡',
  [PowerUpType.Blindness]: '🌫️',
  [PowerUpType.Sticky]: '🕸️',
  [PowerUpType.Wall]: '🧱',
  [PowerUpType.Portal]: '🌀',
  [PowerUpType.Wind]: '💨',
  [PowerUpType.DoublePaddle]: '👯',
  [PowerUpType.MachineGun]: '🔫',
  [PowerUpType.Polymorph]: '🔶',
  [PowerUpType.Magnet]: '🧲',
  [PowerUpType.TimeWarp]: '⏳',
  [PowerUpType.Gigantism]: '🐘',
  [PowerUpType.Tiny]: '🐜',
  [PowerUpType.Laser]: '🔦',
};

export const POWERUP_CATEGORIES: Record<PowerUpType, PowerUpCategory> = {
  [PowerUpType.Expand]: 'Paddle',
  [PowerUpType.Shrink]: 'Hostile',
  [PowerUpType.FastBall]: 'Ball',
  [PowerUpType.SlowBall]: 'Ball',
  [PowerUpType.MultiBall]: 'Ball',
  [PowerUpType.Shield]: 'Paddle',
  [PowerUpType.GravityWell]: 'Environment',
  [PowerUpType.GhostBall]: 'Ball',
  [PowerUpType.Reverse]: 'Hostile',
  [PowerUpType.Stun]: 'Hostile',
  [PowerUpType.Blindness]: 'Hostile',
  [PowerUpType.Sticky]: 'Paddle',
  [PowerUpType.Wall]: 'Environment',
  [PowerUpType.Portal]: 'Environment',
  [PowerUpType.Wind]: 'Environment',
  [PowerUpType.DoublePaddle]: 'Paddle',
  [PowerUpType.MachineGun]: 'Ball',
  [PowerUpType.Polymorph]: 'Environment',
  [PowerUpType.Magnet]: 'Paddle',
  [PowerUpType.TimeWarp]: 'Environment',
  [PowerUpType.Gigantism]: 'Ball',
  [PowerUpType.Tiny]: 'Ball',
  [PowerUpType.Laser]: 'Paddle',
};

export const POWERUP_DESCRIPTIONS: Record<PowerUpType, string> = {
  [PowerUpType.Expand]: "Increases your paddle size.",
  [PowerUpType.Shrink]: "Shrinks the opponent's paddle.",
  [PowerUpType.FastBall]: "Significantly increases ball speed.",
  [PowerUpType.SlowBall]: "Slows the ball down momentarily.",
  [PowerUpType.MultiBall]: "Spawns an additional ball into play.",
  [PowerUpType.Shield]: "Protects your goal from one missed ball.",
  [PowerUpType.GravityWell]: "Creates a gravity field that curves the ball's path.",
  [PowerUpType.GhostBall]: "Makes the ball partially invisible.",
  [PowerUpType.Reverse]: "Reverses the opponent's controls.",
  [PowerUpType.Stun]: "Freezes the opponent's paddle.",
  [PowerUpType.Blindness]: "Temporarily hides the opponent's paddle.",
  [PowerUpType.Sticky]: "Catches the ball, letting you launch it again.",
  [PowerUpType.Wall]: "Spawns a temporary defensive wall.",
  [PowerUpType.Portal]: "Creates linked portals that transport the ball.",
  [PowerUpType.Wind]: "Blows the ball in random directions.",
  [PowerUpType.DoublePaddle]: "Creates a shadow clone of your paddle.",
  [PowerUpType.MachineGun]: "Fires a barrage of mini-balls.",
  [PowerUpType.Polymorph]: "Spawns a spinning polygonal obstacle.",
  [PowerUpType.Magnet]: "Your paddle attracts the ball.",
  [PowerUpType.TimeWarp]: "Slows down time for everyone.",
  [PowerUpType.Gigantism]: "Makes the ball gigantic and easier to hit.",
  [PowerUpType.Tiny]: "Makes the ball tiny and hard to see.",
  [PowerUpType.Laser]: "Paddle shoots lasers that stun the opponent.",
};

export const AI_SPEED_FACTORS = {
  easy: 0.04,
  medium: 0.08,
  hard: 0.12,
  impossible: 0.35,
};
