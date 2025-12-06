import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_HEIGHT, CANVAS_WIDTH, PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_SPEED,
  BALL_RADIUS, BALL_SPEED_BASE, BALL_SPEED_MAX, COLORS, 
  POWERUP_RADIUS, POWERUP_COLORS, POWERUP_ICONS, POWERUP_LIFETIME, 
  AI_SPEED_FACTORS 
} from '../utils/constants';
import { Ball, GameConfig, Paddle, Particle, PowerUp, PowerUpType, Vector2, WallEntity, PortalEntity, Projectile } from '../types';
import { sounds } from '../utils/sound';

interface PongGameProps {
  config: GameConfig;
  onGameOver: (winner: 'left' | 'right', score: { left: number; right: number }) => void;
  onExit: () => void;
}

interface GameNotification {
    id: string;
    text: string;
    icon: string;
    life: number;
    maxLife: number;
    color: string;
    y?: number; // Current Y for animation
}

const PongGame: React.FC<PongGameProps> = ({ config, onGameOver, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs (Mutable for 60fps loop)
  const ballsRef = useRef<Ball[]>([]);
  
  const createPaddle = (x: number): Paddle => ({
      pos: { x, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      score: 0,
      hasShield: false,
      baseHeight: PADDLE_HEIGHT,
      frozenUntil: 0,
      reversedUntil: 0,
      blindedUntil: 0,
      stickyUntil: 0,
      doublePaddleUntil: 0,
      magnetUntil: 0,
      laserUntil: 0,
      lastLaserTime: 0,
      aiOffset: 0
  });

  const leftPaddleRef = useRef<Paddle>(createPaddle(20));
  const rightPaddleRef = useRef<Paddle>(createPaddle(CANVAS_WIDTH - 20 - PADDLE_WIDTH));

  const powerUpsRef = useRef<PowerUp[]>([]);
  const wallsRef = useRef<WallEntity[]>([]);
  const portalsRef = useRef<PortalEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  
  // Changed to array to stack notifications
  const notificationsRef = useRef<GameNotification[]>([]);
  
  const windRef = useRef<Vector2>({ x: 0, y: 0 });
  const windTimerRef = useRef<number>(0);
  const timeScaleRef = useRef<number>(1.0);
  const timeWarpTimerRef = useRef<number>(0);
  
  const lastTimeRef = useRef<number>(0);
  const powerUpTimerRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePos = useRef<number>(CANVAS_HEIGHT / 2);

  // React state for HUD only
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [isPaused, setIsPaused] = useState(false);

  // --- Helpers ---

  const spawnBall = (direction: 1 | -1 = 1, pos?: Vector2, speedMult = 1, radius = BALL_RADIUS): Ball => {
    const startY = pos ? pos.y : CANVAS_HEIGHT / 2 + (Math.random() * 100 - 50);
    const startX = pos ? pos.x : CANVAS_WIDTH / 2;
    const angle = (Math.random() * Math.PI / 3) - Math.PI / 6; // +/- 30 degrees
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      pos: { x: startX, y: startY },
      vel: { 
        x: direction * BALL_SPEED_BASE * speedMult * Math.cos(angle), 
        y: BALL_SPEED_BASE * speedMult * Math.sin(angle) 
      },
      radius: radius,
      speed: BALL_SPEED_BASE * speedMult,
      lastHitBy: null,
      attachedTo: null
    };
  };

  const spawnParticle = (pos: Vector2, color: string, count = 5) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { ...pos },
        vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
        life: 1.0,
        color
      });
    }
  };

  const showNotification = (text: string, color: string, icon: string) => {
      // Add new notification to start of array (top of stack)
      notificationsRef.current.unshift({
          id: Math.random().toString(),
          text,
          icon,
          life: 2.0, // seconds
          maxLife: 2.0,
          color,
          y: 80 // Start slightly above
      });
      
      // Keep only last 5 notifications to avoid clutter
      if (notificationsRef.current.length > 5) {
          notificationsRef.current.pop();
      }
  };

  const spawnPowerUp = (time: number) => {
    if (!config.enablePowerups || powerUpsRef.current.length >= config.maxPowerUps) return;
    
    const types = config.enabledPowerUpTypes.length > 0 
        ? config.enabledPowerUpTypes 
        : Object.values(PowerUpType);

    const type = types[Math.floor(Math.random() * types.length)];
    const margin = 100;
    
    powerUpsRef.current.push({
      id: Math.random().toString(),
      pos: { 
        x: margin + Math.random() * (CANVAS_WIDTH - margin * 2), 
        y: margin + Math.random() * (CANVAS_HEIGHT - margin * 2) 
      },
      type,
      radius: POWERUP_RADIUS,
      active: true,
      spawnTime: time
    });
    sounds.powerUpSpawn();
  };

  const resetRound = (winner: 'left' | 'right') => {
    ballsRef.current = [spawnBall(winner === 'left' ? 1 : -1)];
    // Reset paddle temporary states but keep score
    leftPaddleRef.current.height = leftPaddleRef.current.baseHeight;
    rightPaddleRef.current.height = rightPaddleRef.current.baseHeight;
    
    // Clear effects
    [leftPaddleRef.current, rightPaddleRef.current].forEach(p => {
        p.frozenUntil = 0;
        p.reversedUntil = 0;
        p.blindedUntil = 0;
        p.stickyUntil = 0;
        p.doublePaddleUntil = 0;
        p.magnetUntil = 0;
        p.laserUntil = 0;
    });

    windRef.current = { x: 0, y: 0 };
    windTimerRef.current = 0;
    timeScaleRef.current = 1.0;
    timeWarpTimerRef.current = 0;
    projectilesRef.current = [];
  };

  const checkCollision = (circle: {pos: Vector2, radius: number}, rect: {pos: Vector2, width: number, height: number}) => {
    const distX = Math.abs(circle.pos.x - rect.pos.x - rect.width / 2);
    const distY = Math.abs(circle.pos.y - rect.pos.y - rect.height / 2);

    if (distX > (rect.width / 2 + circle.radius)) return false;
    if (distY > (rect.height / 2 + circle.radius)) return false;

    if (distX <= (rect.width / 2)) return true; 
    if (distY <= (rect.height / 2)) return true;

    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
  };

  // Separating Axis Theorem-lite for Point inside Polygon (or close enough for small balls)
  const checkPolyCollision = (ball: Ball, wall: WallEntity): boolean => {
      if (!wall.vertices) return false;
      // Simple bounding box check first
      const minX = Math.min(...wall.vertices.map(v => v.x)) - ball.radius;
      const maxX = Math.max(...wall.vertices.map(v => v.x)) + ball.radius;
      const minY = Math.min(...wall.vertices.map(v => v.y)) - ball.radius;
      const maxY = Math.max(...wall.vertices.map(v => v.y)) + ball.radius;
      
      if (ball.pos.x < minX || ball.pos.x > maxX || ball.pos.y < minY || ball.pos.y > maxY) return false;

      // Check distance to edges
      let collision = false;
      for (let i = 0; i < wall.vertices.length; i++) {
          const p1 = wall.vertices[i];
          const p2 = wall.vertices[(i + 1) % wall.vertices.length];
          
          // Project ball center onto line segment p1-p2
          const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
          if (l2 == 0) continue;
          let t = ((ball.pos.x - p1.x) * (p2.x - p1.x) + (ball.pos.y - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = p1.x + t * (p2.x - p1.x);
          const projY = p1.y + t * (p2.y - p1.y);
          
          const dist = Math.hypot(ball.pos.x - projX, ball.pos.y - projY);
          if (dist < ball.radius) {
              // Reflect velocity based on normal
              const normalAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2;
              // Add some randomness to poly bounce
              const speed = Math.hypot(ball.vel.x, ball.vel.y);
              ball.vel.x = Math.cos(normalAngle) * speed + (Math.random() - 0.5);
              ball.vel.y = Math.sin(normalAngle) * speed + (Math.random() - 0.5);
              
              // Push out
              const pushX = (ball.pos.x - projX) / dist;
              const pushY = (ball.pos.y - projY) / dist;
              ball.pos.x += pushX * (ball.radius - dist + 2);
              ball.pos.y += pushY * (ball.radius - dist + 2);
              
              collision = true;
          }
      }
      return collision;
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  };

  // --- Game Loop ---

  const update = (dt: number, time: number) => {
    if (isPaused) return;

    // Time Warp Logic
    let gameDt = dt * timeScaleRef.current;
    if (timeWarpTimerRef.current > 0) {
        timeWarpTimerRef.current -= dt;
        if (timeWarpTimerRef.current <= 0) timeScaleRef.current = 1.0;
    }

    // Wind Logic
    if (windTimerRef.current > 0) {
        windTimerRef.current -= gameDt;
        if (windTimerRef.current <= 0) windRef.current = {x: 0, y: 0};
    }

    // 1. Paddle Movement
    const movePaddle = (paddle: Paddle, controlType: 'ai' | 'mouse' | 'wasd' | 'arrows', isLeft: boolean) => {
        
        // Laser Logic
        if (time < paddle.laserUntil) {
            if (time - paddle.lastLaserTime > 1000) { // Shoot every second
                paddle.lastLaserTime = time;
                projectilesRef.current.push({
                    id: Math.random().toString(),
                    pos: { x: paddle.pos.x + (isLeft ? paddle.width + 5 : -5), y: paddle.pos.y + paddle.height / 2 },
                    vel: { x: (isLeft ? 1 : -1) * 12, y: 0 },
                    owner: isLeft ? 'left' : 'right',
                    life: 2000
                });
                sounds.paddleHit(); // Reuse sound for shoot
            }
        }

        if (time < paddle.frozenUntil) return; // Stunned

        const isReversed = time < paddle.reversedUntil;
        const speed = PADDLE_SPEED;
        let moveY = 0;

        if (controlType === 'ai') {
             const targetBall = ballsRef.current
               .filter(b => !b.attachedTo && (isLeft ? b.vel.x < 0 : b.vel.x > 0))
               .sort((a, b) => {
                   const distA = Math.abs(a.pos.x - paddle.pos.x);
                   const distB = Math.abs(b.pos.x - paddle.pos.x);
                   return distA - distB;
               })[0];

             let targetY = CANVAS_HEIGHT / 2 - paddle.height / 2;
             if (targetBall) {
                 targetY = targetBall.pos.y - paddle.height / 2 + paddle.aiOffset;
             }
             
             const diff = targetY - paddle.pos.y;
             const factor = AI_SPEED_FACTORS[config.aiDifficulty];
             let moveAmount = diff * factor * (gameDt / 16); 
             const maxMovePerFrame = (speed * 1.5) * (gameDt / 16);
             if (Math.abs(moveAmount) > maxMovePerFrame) {
                 moveAmount = Math.sign(moveAmount) * maxMovePerFrame;
             }

             if (isReversed) moveAmount *= -1;
             paddle.pos.y += moveAmount;

        } else if (controlType === 'mouse') {
            let target = mousePos.current - paddle.height / 2;
            if (isReversed) {
                target = CANVAS_HEIGHT - target - paddle.height; 
            }
            paddle.pos.y = target;

        } else {
            let up = false;
            let down = false;
            if (controlType === 'wasd') {
                up = keysPressed.current.has('w');
                down = keysPressed.current.has('s');
            } else if (controlType === 'arrows') {
                up = keysPressed.current.has('ArrowUp');
                down = keysPressed.current.has('ArrowDown');
            }
            if (up) moveY -= speed;
            if (down) moveY += speed;
            if (isReversed) moveY *= -1;
            paddle.pos.y += moveY * (gameDt / 16); // Scale manual input by gameDt
        }

        paddle.pos.y = Math.max(0, Math.min(CANVAS_HEIGHT - paddle.height, paddle.pos.y));
    };

    movePaddle(leftPaddleRef.current, config.leftControl, true);
    movePaddle(rightPaddleRef.current, config.rightControl, false);

    // 2. PowerUp Spawning
    powerUpTimerRef.current += gameDt;
    if (powerUpTimerRef.current > config.powerUpSpawnRate) {
        spawnPowerUp(time);
        powerUpTimerRef.current = 0;
    }

    // PowerUp Expiry
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
        const pu = powerUpsRef.current[i];
        if (time - pu.spawnTime > POWERUP_LIFETIME) {
            powerUpsRef.current.splice(i, 1);
            spawnParticle(pu.pos, '#555', 5);
        }
    }
    
    // Entity Expiry & Update
    wallsRef.current = wallsRef.current.filter(w => {
        w.life -= gameDt;
        
        // Rotate polygons
        if (w.isPoly && w.vertices && w.rotationSpeed) {
            w.rotation = (w.rotation || 0) + w.rotationSpeed * (gameDt / 16);
            // Recalculate vertices based on rotation
            const cx = w.pos.x;
            const cy = w.pos.y;
            const radius = w.width; // Use width as radius
            const sides = w.vertices.length;
            
            w.vertices = [];
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI / sides) + w.rotation;
                w.vertices.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
        }
        
        return w.life > 0;
    });
    portalsRef.current = portalsRef.current.filter(p => {
        p.life -= gameDt;
        return p.life > 0;
    });
    
    // Projectiles Update
    projectilesRef.current.forEach(p => {
        p.pos.x += p.vel.x * (gameDt / 16);
        p.pos.y += p.vel.y * (gameDt / 16);
        p.life -= gameDt;
        
        // Check collision with paddles
        const target = p.owner === 'left' ? rightPaddleRef.current : leftPaddleRef.current;
        if (checkCollision({pos: p.pos, radius: 4}, target)) {
             target.frozenUntil = time + 2000; // Stun
             p.life = 0;
             spawnParticle(p.pos, '#ff0000', 10);
             sounds.shieldHit();
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.life > 0 && p.pos.x > 0 && p.pos.x < CANVAS_WIDTH);

    // 3. Notification Update
    notificationsRef.current = notificationsRef.current.filter(n => {
        n.life -= dt / 1000; // Notifications use REAL time, not gameDt
        return n.life > 0;
    });

    // 4. Ball Logic
    for (let i = ballsRef.current.length - 1; i >= 0; i--) {
        const b = ballsRef.current[i];
        
        // Sticky Ball
        if (b.attachedTo) {
            const owner = b.attachedTo === 'left' ? leftPaddleRef.current : rightPaddleRef.current;
            if (b.attachTime && time - b.attachTime > 1500) {
                 b.attachedTo = null;
                 b.vel.x = (b.attachedTo === 'left' ? 1 : -1) * b.speed;
                 b.vel.y = 0;
            } else {
                b.pos.y = owner.pos.y + (b.attachOffset || 0);
                b.pos.x = b.attachedTo === 'left' ? owner.pos.x + owner.width + b.radius : owner.pos.x - b.radius;
            }
            continue;
        }

        // Apply Wind
        if (windRef.current.x !== 0 || windRef.current.y !== 0) {
            b.vel.x += windRef.current.x * 0.05 * (gameDt / 16);
            b.vel.y += windRef.current.y * 0.05 * (gameDt / 16);
        }

        // Gravity Well Effect (from uncollected powerups)
        const gravityWells = powerUpsRef.current.filter(p => p.type === PowerUpType.GravityWell && p.active);
        gravityWells.forEach(well => {
           const dx = well.pos.x - b.pos.x;
           const dy = well.pos.y - b.pos.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < 250) { // Range
               const force = (250 - dist) / 250; // Stronger closer
               b.vel.x += (dx / dist) * 0.5 * force * (gameDt / 16);
               b.vel.y += (dy / dist) * 0.5 * force * (gameDt / 16);
           }
        });

        // Magnet Effect
        const magnets = [
            { paddle: leftPaddleRef.current, active: time < leftPaddleRef.current.magnetUntil },
            { paddle: rightPaddleRef.current, active: time < rightPaddleRef.current.magnetUntil }
        ];
        magnets.forEach(({paddle, active}) => {
            if (active) {
                const dx = (paddle.pos.x + paddle.width/2) - b.pos.x;
                const dy = (paddle.pos.y + paddle.height/2) - b.pos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 400) {
                     b.vel.y += (dy / dist) * 0.8 * (gameDt / 16);
                     // Slight x pull too but mostly y
                     b.vel.x += (dx / dist) * 0.2 * (gameDt / 16);
                }
            }
        });

        // Movement
        b.pos.x += b.vel.x * (gameDt / 16);
        b.pos.y += b.vel.y * (gameDt / 16);

        // Wall (World Bounds)
        if (b.pos.y - b.radius < 0) {
            b.vel.y = Math.abs(b.vel.y); 
            b.pos.y = b.radius; 
            sounds.wallHit();
            spawnParticle(b.pos, '#fff', 3);
        } else if (b.pos.y + b.radius > CANVAS_HEIGHT) {
            b.vel.y = -Math.abs(b.vel.y);
            b.pos.y = CANVAS_HEIGHT - b.radius;
            sounds.wallHit();
            spawnParticle(b.pos, '#fff', 3);
        }

        // Entity Collisions
        wallsRef.current.forEach(w => {
            if (w.isPoly) {
                if (checkPolyCollision(b, w)) sounds.wallHit();
            } else {
                if (checkCollision(b, w)) {
                    // Determine bounce side
                    const overlapX = (w.width / 2 + b.radius) - Math.abs(b.pos.x - w.pos.x - w.width / 2);
                    const overlapY = (w.height / 2 + b.radius) - Math.abs(b.pos.y - w.pos.y - w.height / 2);
                    
                    if (overlapX < overlapY) {
                        b.vel.x *= -1;
                        b.pos.x += (b.vel.x > 0 ? 1 : -1) * overlapX;
                    } else {
                        b.vel.y *= -1;
                        b.pos.y += (b.vel.y > 0 ? 1 : -1) * overlapY;
                    }
                    sounds.wallHit();
                }
            }
        });

        // Portals
        let teleported = false;
        if (!b.lastPortalId) {
             portalsRef.current.forEach(p => {
                 if (teleported) return;
                 const dist = Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y);
                 if (dist < p.radius + b.radius) {
                     // Teleport
                     b.pos.x = p.targetPos.x;
                     b.pos.y = p.targetPos.y;
                     b.lastPortalId = p.id;
                     teleported = true;
                     sounds.powerUpCollect(); // Portal sound
                     spawnParticle(p.pos, p.color, 10);
                     spawnParticle(p.targetPos, p.color, 10);
                     // Add slight velocity boost out
                     b.vel.x *= 1.1;
                     b.vel.y *= 1.1;
                 }
             });
        } else {
            // Check if left portal area to reset flag
             const inAnyPortal = portalsRef.current.some(p => Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y) < p.radius + b.radius + 10);
             if (!inAnyPortal) {
                 b.lastPortalId = undefined;
             }
        }

        // Paddle Collision Function
        const handlePaddleHit = (paddle: Paddle, isLeft: boolean) => {
             paddle.aiOffset = (Math.random() - 0.5) * (paddle.height * 0.8);
             const isSticky = time < paddle.stickyUntil;

            if (isSticky) {
                b.attachedTo = isLeft ? 'left' : 'right';
                b.attachTime = time;
                b.attachOffset = b.pos.y - paddle.pos.y;
                b.lastHitBy = isLeft ? 'left' : 'right';
                spawnParticle(b.pos, '#00ff00', 10);
            } else {
                const relativeIntersectY = (paddle.pos.y + (paddle.height / 2)) - b.pos.y;
                const normalizedRelativeIntersectionY = (relativeIntersectY / (paddle.height / 2));
                const bounceAngle = normalizedRelativeIntersectionY * (Math.PI / 4);
                const dir = isLeft ? 1 : -1;
                b.speed = Math.min(b.speed * 1.05, BALL_SPEED_MAX);
                b.vel.x = b.speed * Math.cos(bounceAngle) * dir;
                b.vel.y = b.speed * -Math.sin(bounceAngle);
                b.pos.x = isLeft ? paddle.pos.x + paddle.width + b.radius + 1 : paddle.pos.x - b.radius - 1;
                b.lastHitBy = isLeft ? 'left' : 'right';
                sounds.paddleHit();
                spawnParticle(b.pos, isLeft ? COLORS.paddleLeft : COLORS.paddleRight, 8);
            }
        }

        // Main Paddle Collision
        const hitLeft = checkCollision(b, leftPaddleRef.current);
        const hitRight = checkCollision(b, rightPaddleRef.current);

        // Double Paddle Collision (Shadow Clones)
        // Clone positions: offset vertically by 150px (looping around canvas)
        const leftDoubleY = (leftPaddleRef.current.pos.y + 150) % (CANVAS_HEIGHT - leftPaddleRef.current.height);
        const rightDoubleY = (rightPaddleRef.current.pos.y + 150) % (CANVAS_HEIGHT - rightPaddleRef.current.height);
        
        const leftClone = { ...leftPaddleRef.current, pos: { x: leftPaddleRef.current.pos.x, y: leftDoubleY }};
        const rightClone = { ...rightPaddleRef.current, pos: { x: rightPaddleRef.current.pos.x, y: rightDoubleY }};

        const hitLeftClone = time < leftPaddleRef.current.doublePaddleUntil && checkCollision(b, leftClone);
        const hitRightClone = time < rightPaddleRef.current.doublePaddleUntil && checkCollision(b, rightClone);

        if (hitLeft) handlePaddleHit(leftPaddleRef.current, true);
        else if (hitRight) handlePaddleHit(rightPaddleRef.current, false);
        else if (hitLeftClone) handlePaddleHit(leftPaddleRef.current, true);
        else if (hitRightClone) handlePaddleHit(rightPaddleRef.current, false);

        // Scoring
        if (b.pos.x + b.radius < 0) {
            if (leftPaddleRef.current.hasShield) {
                leftPaddleRef.current.hasShield = false;
                b.vel.x *= -1;
                b.pos.x = b.radius + 10;
                sounds.shieldHit();
            } else {
                rightPaddleRef.current.score += 1;
                setScores({ left: leftPaddleRef.current.score, right: rightPaddleRef.current.score });
                ballsRef.current.splice(i, 1);
                sounds.score();
                if (ballsRef.current.length === 0) {
                    if (checkWinCondition()) return; 
                    resetRound('left');
                }
            }
        } else if (b.pos.x - b.radius > CANVAS_WIDTH) {
            if (rightPaddleRef.current.hasShield) {
                rightPaddleRef.current.hasShield = false;
                b.vel.x *= -1;
                b.pos.x = CANVAS_WIDTH - b.radius - 10;
                sounds.shieldHit();
            } else {
                leftPaddleRef.current.score += 1;
                setScores({ left: leftPaddleRef.current.score, right: rightPaddleRef.current.score });
                ballsRef.current.splice(i, 1);
                sounds.score();
                if (ballsRef.current.length === 0) {
                    if (checkWinCondition()) return; 
                    resetRound('right');
                }
            }
        }

        // PowerUp Collection
        for (let pIndex = powerUpsRef.current.length - 1; pIndex >= 0; pIndex--) {
            const pu = powerUpsRef.current[pIndex];
            const dist = Math.hypot(b.pos.x - pu.pos.x, b.pos.y - pu.pos.y);
            if (dist < b.radius + pu.radius && b.lastHitBy) {
                applyPowerUp(pu.type, b.lastHitBy === 'left' ? leftPaddleRef.current : rightPaddleRef.current, b, time);
                powerUpsRef.current.splice(pIndex, 1);
                sounds.powerUpCollect();
                spawnParticle(pu.pos, POWERUP_COLORS[pu.type], 10);
            }
        }
    }

    // 5. Particles
    particlesRef.current.forEach(p => {
        p.pos.x += p.vel.x * (gameDt / 16);
        p.pos.y += p.vel.y * (gameDt / 16);
        if (windRef.current.x !== 0) {
            p.vel.x += windRef.current.x * 0.1 * (gameDt / 16);
            p.vel.y += windRef.current.y * 0.1 * (gameDt / 16);
        }
        p.life -= 0.02 * (gameDt / 16);
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  const applyPowerUp = (type: PowerUpType, beneficiary: Paddle, hitBall: Ball, time: number) => {
    const opponent = beneficiary === leftPaddleRef.current ? rightPaddleRef.current : leftPaddleRef.current;
    
    const name = type.replace(/_/g, ' ');
    const icon = POWERUP_ICONS[type] || '';
    showNotification(name, POWERUP_COLORS[type], icon);

    switch (type) {
        case PowerUpType.Expand:
            beneficiary.height = Math.min(CANVAS_HEIGHT / 2, beneficiary.height * 1.5);
            setTimeout(() => beneficiary.height = beneficiary.baseHeight, 10000);
            break;
        case PowerUpType.Shrink:
            opponent.height = Math.max(20, opponent.height * 0.7);
            setTimeout(() => opponent.height = opponent.baseHeight, 10000);
            break;
        case PowerUpType.FastBall:
            hitBall.speed *= 1.5;
            hitBall.vel.x *= 1.5;
            hitBall.vel.y *= 1.5;
            break;
        case PowerUpType.SlowBall:
            hitBall.speed *= 0.5;
            hitBall.vel.x *= 0.5;
            hitBall.vel.y *= 0.5;
            break;
        case PowerUpType.MultiBall:
            ballsRef.current.push(spawnBall(hitBall.vel.x > 0 ? 1 : -1, hitBall.pos));
            break;
        case PowerUpType.Shield:
            beneficiary.hasShield = true;
            break;
        case PowerUpType.GravityWell:
            ballsRef.current.push(spawnBall(hitBall.vel.x > 0 ? -1 : 1, {x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2}));
            break;
        case PowerUpType.GhostBall:
             hitBall.isGhost = true;
             setTimeout(() => hitBall.isGhost = false, 5000);
             break;
        case PowerUpType.Reverse:
             opponent.reversedUntil = time + 5000;
             break;
        case PowerUpType.Stun:
             opponent.frozenUntil = time + 2000;
             break;
        case PowerUpType.Blindness:
             opponent.blindedUntil = time + 5000;
             break;
        case PowerUpType.Sticky:
             beneficiary.stickyUntil = time + 10000;
             break;
        case PowerUpType.Wall:
             wallsRef.current.push({
                 id: Math.random().toString(),
                 pos: { x: CANVAS_WIDTH / 2 - 10, y: Math.random() * (CANVAS_HEIGHT - 200) + 50 },
                 width: 20,
                 height: 100,
                 life: 15000
             });
             break;
        case PowerUpType.Portal:
             const idA = Math.random().toString();
             const idB = Math.random().toString();
             const posA = { x: CANVAS_WIDTH * 0.25, y: Math.random() * (CANVAS_HEIGHT - 100) + 50 };
             const posB = { x: CANVAS_WIDTH * 0.75, y: Math.random() * (CANVAS_HEIGHT - 100) + 50 };
             portalsRef.current.push({
                 id: idA, pairId: idB, pos: posA, targetPos: posB, radius: 25, life: 15000, color: '#00ccff', maxLife: 15000
             });
             portalsRef.current.push({
                 id: idB, pairId: idA, pos: posB, targetPos: posA, radius: 25, life: 15000, color: '#ffaa00', maxLife: 15000
             });
             break;
        case PowerUpType.Wind:
             windRef.current = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
             windTimerRef.current = 10000;
             break;
        case PowerUpType.DoublePaddle:
             beneficiary.doublePaddleUntil = time + 15000;
             break;
        case PowerUpType.MachineGun:
             for(let i=0; i<10; i++) {
                 setTimeout(() => {
                    const b = spawnBall(hitBall.vel.x > 0 ? 1 : -1, {x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2}, 1.5, 4); // Fast, small
                    b.vel.y += (Math.random() - 0.5) * 5; // Spread
                    ballsRef.current.push(b);
                 }, i * 100);
             }
             break;
        case PowerUpType.Polymorph:
             const sides = Math.floor(Math.random() * 3) + 3; // 3 to 5 sides
             const radius = 40;
             const vertices = [];
             const cx = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 200;
             const cy = CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 200;
             for (let i = 0; i < sides; i++) {
                 vertices.push({
                     x: cx + radius * Math.cos(i * 2 * Math.PI / sides),
                     y: cy + radius * Math.sin(i * 2 * Math.PI / sides)
                 });
             }
             wallsRef.current.push({
                 id: Math.random().toString(),
                 pos: { x: cx, y: cy },
                 width: radius,
                 height: radius,
                 life: 15000,
                 isPoly: true,
                 vertices,
                 rotation: 0,
                 rotationSpeed: 0.02
             });
             break;
        case PowerUpType.Magnet:
             beneficiary.magnetUntil = time + 10000;
             break;
        case PowerUpType.TimeWarp:
             timeScaleRef.current = 0.5;
             timeWarpTimerRef.current = 5000;
             break;
        case PowerUpType.Gigantism:
             hitBall.radius = 25;
             setTimeout(() => hitBall.radius = BALL_RADIUS, 10000);
             break;
        case PowerUpType.Tiny:
             hitBall.radius = 4;
             setTimeout(() => hitBall.radius = BALL_RADIUS, 10000);
             break;
        case PowerUpType.Laser:
             beneficiary.laserUntil = time + 10000;
             break;
    }
  };

  const checkWinCondition = () => {
      if (config.targetScore === 0) return false;
      const lp = leftPaddleRef.current;
      const rp = rightPaddleRef.current;
      if (lp.score >= config.targetScore) {
          onGameOver('left', { left: lp.score, right: rp.score });
          sounds.gameOver();
          return true;
      }
      if (rp.score >= config.targetScore) {
          onGameOver('right', { left: lp.score, right: rp.score });
          sounds.gameOver();
          return true;
      }
      return false;
  };

  const draw = (ctx: CanvasRenderingContext2D, time: number) => {
    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Wind Visuals
    if (windRef.current.x !== 0 || windRef.current.y !== 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<20; i++) {
             const startX = (time * 0.5 + i * 50) % CANVAS_WIDTH;
             const startY = (time * 0.2 + i * 40) % CANVAS_HEIGHT;
             ctx.moveTo(startX, startY);
             ctx.lineTo(startX + windRef.current.x * 50, startY + windRef.current.y * 50);
        }
        ctx.stroke();
    }
    
    // Time Warp Visuals (Chromatic Aberration style effect for background)
    if (timeScaleRef.current < 1.0) {
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Entities (Walls / Polygons)
    wallsRef.current.forEach(w => {
        ctx.fillStyle = w.isPoly ? POWERUP_COLORS[PowerUpType.Polymorph] : POWERUP_COLORS[PowerUpType.Wall];
        
        if (w.isPoly && w.vertices) {
            ctx.beginPath();
            ctx.moveTo(w.vertices[0].x, w.vertices[0].y);
            for(let i=1; i<w.vertices.length; i++) ctx.lineTo(w.vertices[i].x, w.vertices[i].y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.fillRect(w.pos.x, w.pos.y, w.width, w.height);
            // Stripe effect
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w.pos.x, w.pos.y);
            ctx.lineTo(w.pos.x + w.width, w.pos.y + w.height);
            ctx.stroke();
        }
    });

    // Draw Portals and Connections
    // Link pairs first
    const pairsDrawn = new Set<string>();
    portalsRef.current.forEach(p => {
        if (!pairsDrawn.has(p.id) && !pairsDrawn.has(p.pairId)) {
            const pair = portalsRef.current.find(other => other.id === p.pairId);
            if (pair) {
                // Draw connection
                ctx.beginPath();
                ctx.moveTo(p.pos.x, p.pos.y);
                ctx.lineTo(pair.pos.x, pair.pos.y);
                ctx.strokeStyle = `rgba(0, 200, 255, ${0.2 + Math.sin(time / 200) * 0.1})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                pairsDrawn.add(p.id);
                pairsDrawn.add(pair.id);
            }
        }
    });

    portalsRef.current.forEach(p => {
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(time / 500); // Spin
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = p.color + '44'; // Transparent fill
        ctx.fill();
        // Inner swirl
        ctx.beginPath();
        ctx.arc(5, 5, p.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    });

    // Draw Paddle Helper
    const drawSinglePaddle = (paddle: Paddle, yPos: number, color: string) => {
        if (time < paddle.blindedUntil && Math.random() > 0.1) return;
        ctx.fillStyle = color;
        if (time < paddle.frozenUntil) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = '#ccffff';
        } else if (time < paddle.reversedUntil) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff00ff';
            ctx.fillStyle = '#ffccff';
        } else if (time < paddle.stickyUntil) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff00';
            ctx.fillStyle = '#55ff55';
        } else if (time < paddle.magnetUntil) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0044';
            ctx.fillStyle = '#ff3366';
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fillRect(paddle.pos.x, yPos, paddle.width, paddle.height);
        
        // Ice effect
        if (time < paddle.frozenUntil) {
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(paddle.pos.x, yPos);
             ctx.lineTo(paddle.pos.x + paddle.width, yPos + paddle.height);
             ctx.moveTo(paddle.pos.x + paddle.width, yPos);
             ctx.lineTo(paddle.pos.x, yPos + paddle.height);
             ctx.stroke();
        }
        ctx.shadowBlur = 0;
        
        // Magnet effect waves
        if (time < paddle.magnetUntil) {
            ctx.strokeStyle = 'rgba(255, 0, 68, 0.3)';
            ctx.lineWidth = 2;
            const wave = (time / 100) % 20;
            ctx.beginPath();
            ctx.arc(paddle.pos.x + paddle.width/2, yPos + paddle.height/2, 30 + wave, 0, Math.PI*2);
            ctx.stroke();
        }

        // Shield
        if (paddle.hasShield) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            const shieldX = paddle === leftPaddleRef.current ? paddle.pos.x + paddle.width + 10 : paddle.pos.x - 10;
            ctx.beginPath();
            ctx.moveTo(shieldX, yPos - 10);
            ctx.quadraticCurveTo(
                paddle === leftPaddleRef.current ? shieldX + 15 : shieldX - 15, 
                yPos + paddle.height / 2, 
                shieldX, 
                yPos + paddle.height + 10
            );
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    };

    // Draw Paddles
    drawSinglePaddle(leftPaddleRef.current, leftPaddleRef.current.pos.y, COLORS.paddleLeft);
    if (time < leftPaddleRef.current.doublePaddleUntil) {
        const leftDoubleY = (leftPaddleRef.current.pos.y + 150) % (CANVAS_HEIGHT - leftPaddleRef.current.height);
        ctx.globalAlpha = 0.6;
        drawSinglePaddle(leftPaddleRef.current, leftDoubleY, COLORS.paddleLeft);
        ctx.globalAlpha = 1;
    }

    drawSinglePaddle(rightPaddleRef.current, rightPaddleRef.current.pos.y, COLORS.paddleRight);
    if (time < rightPaddleRef.current.doublePaddleUntil) {
        const rightDoubleY = (rightPaddleRef.current.pos.y + 150) % (CANVAS_HEIGHT - rightPaddleRef.current.height);
        ctx.globalAlpha = 0.6;
        drawSinglePaddle(rightPaddleRef.current, rightDoubleY, COLORS.paddleRight);
        ctx.globalAlpha = 1;
    }
    
    // Draw Projectiles (Lasers)
    projectilesRef.current.forEach(p => {
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Trail
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(p.pos.x, p.pos.y);
        ctx.lineTo(p.pos.x - p.vel.x * 3, p.pos.y);
        ctx.stroke();
    });

    // Balls
    ballsRef.current.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.isGhost ? 'rgba(255,255,255,0.2)' : COLORS.ball;
        ctx.fill();
        ctx.closePath();
    });

    // PowerUps
    powerUpsRef.current.forEach(p => {
        // Visualize Gravity Well Zone
        if (p.type === PowerUpType.GravityWell) {
             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, 250, 0, Math.PI * 2);
             ctx.fillStyle = 'rgba(100, 0, 255, 0.05)';
             ctx.fill();
             
             // Swirl lines
             ctx.strokeStyle = 'rgba(100, 0, 255, 0.2)';
             ctx.lineWidth = 2;
             const swirlOffset = (time / 100) % (Math.PI * 2);
             for(let r=50; r<250; r+=50) {
                 ctx.beginPath();
                 ctx.arc(p.pos.x, p.pos.y, r, swirlOffset + r, swirlOffset + r + Math.PI);
                 ctx.stroke();
             }
        }

        const pulse = 1 + Math.sin(time / 200) * 0.1;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = POWERUP_COLORS[p.type];
        ctx.fill();
        
        if (p.spawnTime) {
            const age = time - p.spawnTime;
            const remaining = Math.max(0, 1 - (age / POWERUP_LIFETIME));
            ctx.strokeStyle = `rgba(255,255,255,${remaining})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, (p.radius + 2) * pulse, 0, Math.PI * 2 * remaining);
            ctx.stroke();
        } 
        
        // Icon
        ctx.font = '20px Arial'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = POWERUP_ICONS[p.type] || '?';
        ctx.fillText(icon, p.pos.x, p.pos.y);

        // Name right below icon
        ctx.font = 'bold 10px sans-serif'; 
        ctx.fillStyle = 'white';
        ctx.fillText(p.type.replace(/_/g, ' '), p.pos.x, p.pos.y + p.radius + 10);
    });

    // Notifications (Stacked & Transparent)
    notificationsRef.current.forEach((notif, index) => {
        const targetY = 120 + index * 50; // Stack vertically from top
        
        // Initialize or lerp Y position
        if (notif.y === undefined) notif.y = targetY - 20;
        notif.y += (targetY - notif.y) * 0.2;

        const lifeRatio = notif.life / notif.maxLife;
        const elapsed = 1 - lifeRatio; // 0 -> 1

        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, notif.y);
        
        // Animation
        let alpha = 1;
        let scale = 1;

        if (elapsed < 0.15) {
             // Pop in (0.3s)
             const t = elapsed / 0.15; // 0 -> 1
             alpha = t;
             // Elastic scale: 0.5 -> 1.1
             scale = 0.5 + 0.6 * Math.sin(t * Math.PI / 2); 
        } else if (elapsed < 0.25) {
             // Settle (0.2s)
             const t = (elapsed - 0.15) / 0.1; // 0 -> 1
             scale = 1.1 - 0.1 * t; // 1.1 -> 1.0
        } else if (lifeRatio < 0.2) {
             // Fade out
             alpha = lifeRatio * 5;
             scale = 1.0;
        }
        
        ctx.scale(scale, scale);
        ctx.globalAlpha = Math.min(0.8, alpha);

        const fullText = `${notif.icon} ${notif.text}`;
        ctx.font = 'bold 24px "Arial Black", sans-serif';
        const textMetrics = ctx.measureText(fullText);
        const textWidth = textMetrics.width;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
        roundRect(ctx, -textWidth/2 - 20, -25, textWidth + 40, 50, 10);
        
        // Text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Outline
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(fullText, 0, 0);
        
        // Fill
        ctx.fillStyle = notif.color;
        ctx.fillText(fullText, 0, 0);
        
        ctx.restore();
    });

    // Particles
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.pos.x, p.pos.y, 4, 4);
        ctx.globalAlpha = 1;
    });
  };

  const gameLoop = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        update(dt, time);
        draw(ctx, time);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [isPaused, config]);

  useEffect(() => {
    ballsRef.current = [spawnBall()];
    requestRef.current = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    const handleMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mousePos.current = e.clientY - rect.top;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameLoop]);

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* HUD */}
      <div className="absolute top-8 left-0 right-0 flex justify-between px-20 w-full max-w-4xl text-6xl font-bold font-mono text-white pointer-events-none select-none opacity-50">
          <span style={{ color: COLORS.paddleLeft }}>{scores.left}</span>
          <span style={{ color: COLORS.paddleRight }}>{scores.right}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-gray-700 rounded-lg shadow-2xl bg-black cursor-none"
        style={{ maxWidth: '100%', maxHeight: '80vh' }}
      />
      
      <div className="mt-4 flex gap-4">
          <button 
             onClick={() => setIsPaused(!isPaused)}
             className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
              {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          <button 
             onClick={onExit}
             className="px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800"
          >
              EXIT
          </button>
      </div>

      {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-4xl font-bold">
              PAUSED
          </div>
      )}
    </div>
  );
};

export default PongGame;
