// The game's rules and state, with no drawing and no browser in it: the
// turkey (run, jump, dash, hide), the farmer AI (patrol, suspicion, chase,
// search, cornering), thrown carving knives, hot ovens, fences, haystacks,
// corn, stages from farmyard to kitchen, distance, score and lives.
// step() advances one fixed step and returns what happened as bit flags.
import {
  CORN, ESCAPE_DISTANCE, FARMER, FIELD, KNIFE, LIVES, METRES_PER_PIXEL,
  OVEN, STAGES, TURKEY,
} from './config.js';
import { range } from './random.js';

export const KIND_CORN = 0;
export const KIND_KNIFE = 1;
export const KIND_FENCE = 2;
export const KIND_HAY = 3;
export const KIND_OVEN = 4;

export const FARMER_PATROL = 0;
export const FARMER_SUSPICIOUS = 1;
export const FARMER_CHASE = 2;
export const FARMER_SEARCH = 3;
export const FARMER_THROW = 4;

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_OVER = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_LOST = 32;
export const EVENT_THROW = 64;
export const EVENT_STAGE = 128;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function stageOf(distance) {
  for (let i = 0; i < STAGES.length; i += 1) {
    if (distance < STAGES[i].until) return i;
  }
  return STAGES.length - 1;
}

export function createWorld(random) {
  const turkey = {
    x: 200, y: FIELD.groundY - TURKEY.height, width: TURKEY.width, height: TURKEY.height,
    vx: 0, vy: 0, onGround: true, facing: 1, hidden: false, hideTimer: 0,
    dashTimer: 0, dashCooldown: 0, invulnerable: 0, running: false,
  };
  const farmer = {
    x: 900, y: FIELD.groundY - FARMER.height, width: FARMER.width, height: FARMER.height,
    vx: 0, facing: -1, mode: FARMER_PATROL, alert: 0, throwTimer: FARMER.throwInterval,
    windup: 0, searchTimer: 0, patrolTarget: 700, lastSeenX: 0, cornered: false,
  };
  const obstacles = [];
  const pickups = [];
  const knives = [];
  for (let i = 0; i < 48; i += 1) {
    obstacles.push({ active: false, kind: KIND_FENCE, x: 0, y: 0, width: 0, height: 0, passed: false });
  }
  for (let i = 0; i < 32; i += 1) {
    pickups.push({ active: false, x: 0, y: 0, width: CORN.size, height: CORN.size, bob: 0 });
  }
  for (let i = 0; i < 12; i += 1) {
    knives.push({ active: false, x: 0, y: 0, width: KNIFE.width, height: KNIFE.height, vx: 0, spin: 0 });
  }

  const state = {
    turkey, farmer, obstacles, pickups, knives,
    score: 0, lives: LIVES, distance: 0, stage: 0, elapsed: 0,
    cameraX: 0, spawnX: 1400, cornTimer: 1.2, over: false, escaped: false,
    nearOven: false, best: 0,
  };

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function spawnObstacle(kind, x) {
    const item = free(obstacles);
    if (!item) return;
    item.active = true;
    item.kind = kind;
    item.passed = false;
    item.x = x;
    if (kind === KIND_FENCE) { item.width = 26; item.height = 54; item.y = FIELD.groundY - 54; }
    else if (kind === KIND_HAY) { item.width = 110; item.height = 64; item.y = FIELD.groundY - 64; }
    else { item.width = OVEN.width; item.height = OVEN.height; item.y = FIELD.groundY - OVEN.height; }
  }

  function spawnCorn(x, y) {
    const item = free(pickups);
    if (!item) return;
    item.active = true;
    item.x = x;
    item.y = y;
    item.bob = random() * Math.PI * 2;
  }

  function seedAhead() {
    // Lay out the next stretch of the farm ahead of the camera.
    while (state.spawnX < state.cameraX + FIELD.width + 600) {
      const stage = stageOf(state.distance + (state.spawnX - state.cameraX) * METRES_PER_PIXEL);
      const roll = random();
      if (stage === 2) {
        if (roll < 0.34) spawnObstacle(KIND_OVEN, state.spawnX);
        else if (roll < 0.55) spawnObstacle(KIND_FENCE, state.spawnX);
        else if (roll < 0.72) spawnObstacle(KIND_HAY, state.spawnX);
      } else if (stage === 1) {
        if (roll < 0.4) spawnObstacle(KIND_FENCE, state.spawnX);
        else if (roll < 0.68) spawnObstacle(KIND_HAY, state.spawnX);
      } else if (roll < 0.32) spawnObstacle(KIND_FENCE, state.spawnX);
      else if (roll < 0.6) spawnObstacle(KIND_HAY, state.spawnX);
      if (random() < 0.55) {
        const n = 1 + Math.floor(random() * 3);
        for (let i = 0; i < n; i += 1) {
          spawnCorn(state.spawnX + 40 + i * 46, FIELD.groundY - 90 - random() * 130);
        }
      }
      state.spawnX += range(random, 260, 520);
    }
  }

  function reset() {
    turkey.x = 200;
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vx = 0; turkey.vy = 0; turkey.onGround = true; turkey.facing = 1;
    turkey.hidden = false; turkey.hideTimer = 0; turkey.dashTimer = 0;
    turkey.dashCooldown = 0;
    // Start grace: the farmer is right behind the turkey when the run begins,
    // so the turkey cannot be hurt for the first 2.5 s — time to react.
    turkey.invulnerable = 2.5; turkey.running = false;
    farmer.x = 60;
    farmer.y = FIELD.groundY - FARMER.height;
    farmer.vx = 0; farmer.facing = 1; farmer.mode = FARMER_PATROL; farmer.alert = 0;
    farmer.throwTimer = FARMER.throwInterval; farmer.windup = 0; farmer.searchTimer = 0;
    farmer.patrolTarget = 170; farmer.lastSeenX = 0; farmer.cornered = false;
    for (const item of obstacles) item.active = false;
    for (const item of pickups) item.active = false;
    for (const item of knives) item.active = false;
    state.score = 0; state.lives = LIVES; state.distance = 0; state.stage = 0;
    state.elapsed = 0; state.cameraX = 0; state.spawnX = 1400; state.cornTimer = 1.2;
    state.over = false; state.escaped = false; state.nearOven = false;
    seedAhead();
  }

  function throwKnife() {
    const knife = free(knives);
    if (!knife) return;
    knife.active = true;
    knife.x = farmer.x + (farmer.facing > 0 ? farmer.width : -KNIFE.width);
    knife.y = farmer.y + 30;
    knife.vx = farmer.facing * KNIFE.speed;
    knife.spin = 0;
  }

  function hurtTurkey(events) {
    if (turkey.invulnerable > 0 || turkey.hidden) return events;
    turkey.invulnerable = TURKEY.invulnerable;
    state.lives -= 1;
    events |= EVENT_HIT;
    if (state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function turkeySeesFarmer() {
    return false;
  }

  /** Can the farmer see the turkey right now? Hidden turkeys and haystacks block sight. */
  function farmerCanSee() {
    if (turkey.hidden) return false;
    const dx = (turkey.x + turkey.width / 2) - (farmer.x + farmer.width / 2);
    const dy = (turkey.y + turkey.height / 2) - (farmer.y + 34);
    const dist = Math.hypot(dx, dy);
    if (dist > FARMER.visionRange) return false;
    const facing = farmer.facing;
    const angle = Math.atan2(dy, dx);
    const forward = facing > 0 ? 0 : Math.PI;
    let diff = Math.abs(angle - forward);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > FARMER.visionHalfAngle + 0.35) return false;
    // A haystack between them blocks the farmer's view.
    for (const item of obstacles) {
      if (!item.active || item.kind !== KIND_HAY) continue;
      const hx0 = item.x;
      const hx1 = item.x + item.width;
      const fx = farmer.x + farmer.width / 2;
      const tx = turkey.x + turkey.width / 2;
      if ((fx < hx0 && tx > hx1) || (fx > hx1 && tx < hx0)) return false;
    }
    return true;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1; `jump`, `dash` and `hide` are
   * one-shot presses. With `harmless` set (the title screen's backdrop) the
   * turkey idles and nothing can hurt it.
   */
  function step(dt, direction, jump, dash, hide, harmless) {
    let events = 0;
    if (state.over || state.escaped) return events;
    state.elapsed += dt;

    // --- Turkey movement ---
    if (harmless) {
      turkey.x = 140;
      turkey.y = FIELD.groundY - TURKEY.height;
      turkey.vy = 0; turkey.onGround = true;
    } else {
      const speed = turkey.dashTimer > 0 ? TURKEY.dashSpeed : TURKEY.walkSpeed;
      turkey.vx = direction * speed;
      if (direction !== 0) turkey.facing = direction;
      turkey.running = direction !== 0;
      if (dash && turkey.dashCooldown <= 0 && direction !== 0) {
        turkey.dashTimer = TURKEY.dashTime;
        turkey.dashCooldown = TURKEY.dashCooldown;
      }
      if (jump && turkey.onGround && !turkey.hidden) {
        turkey.vy = -TURKEY.jumpSpeed;
        turkey.onGround = false;
        turkey.hidden = false;
      }
      if (hide && turkey.onGround) {
        // Hiding only works inside a haystack's shadow.
        for (const item of obstacles) {
          if (item.active && item.kind === KIND_HAY && overlaps(turkey, item)) {
            turkey.hidden = true;
            turkey.hideTimer = TURKEY.hideTime;
            break;
          }
        }
      }
      if (turkey.hideTimer > 0) {
        turkey.hideTimer -= dt;
        if (turkey.hideTimer <= 0) turkey.hidden = false;
      }
      if (turkey.dashTimer > 0) turkey.dashTimer -= dt;
      if (turkey.dashCooldown > 0) turkey.dashCooldown -= dt;
      if (turkey.invulnerable > 0) turkey.invulnerable -= dt;

      turkey.vy += TURKEY.gravity * dt;
      turkey.x += turkey.vx * dt;
      turkey.y += turkey.vy * dt;
      if (turkey.y >= FIELD.groundY - TURKEY.height) {
        turkey.y = FIELD.groundY - TURKEY.height;
        turkey.vy = 0;
        turkey.onGround = true;
      }
      turkey.x = Math.max(0, turkey.x);
      if (turkey.hidden && direction !== 0) turkey.hidden = false;

      // Distance and score grow with forward running. The turkey rides at
      // screen x 420 so a farmer closing in from behind stays visible.
      if (turkey.x > state.cameraX + 420) {
        const gained = (turkey.x - (state.cameraX + 420)) * METRES_PER_PIXEL;
        state.distance += gained;
        state.score += Math.floor(gained * 10);
        state.cameraX = turkey.x - 420;
      }
      const newStage = stageOf(state.distance);
      if (newStage !== state.stage) {
        state.stage = newStage;
        events |= EVENT_STAGE;
      }
      if (state.distance >= ESCAPE_DISTANCE) {
        state.escaped = true;
        events |= EVENT_ESCAPED;
        return events;
      }
    }

    // --- Farmer AI (skipped on the title backdrop: he just idles there) ---
    if (!harmless) {
    const sees = farmerCanSee();
    const prevMode = farmer.mode;
    if (sees) {
      farmer.lastSeenX = turkey.x;
      farmer.alert = Math.min(1, farmer.alert + FARMER.alertPerSecond * dt);
      if (farmer.alert >= 1 && farmer.mode !== FARMER_CHASE && farmer.mode !== FARMER_THROW) {
        farmer.mode = FARMER_CHASE;
        events |= EVENT_SPOTTED;
      } else if (farmer.mode === FARMER_PATROL) {
        farmer.mode = FARMER_SUSPICIOUS;
      }
    } else {
      farmer.alert = Math.max(0, farmer.alert - FARMER.calmPerSecond * dt);
      if (farmer.mode === FARMER_SUSPICIOUS && farmer.alert <= 0.15) farmer.mode = FARMER_PATROL;
      if (farmer.mode === FARMER_CHASE) {
        farmer.mode = FARMER_SEARCH;
        farmer.searchTimer = 3.5;
        events |= EVENT_LOST;
      }
    }

    // Farmer movement by mode.
    let targetSpeed = 0;
    let targetX = farmer.x;
    if (farmer.mode === FARMER_PATROL) {
      targetSpeed = FARMER.patrolSpeed;
      targetX = farmer.patrolTarget;
      if (Math.abs(farmer.x - farmer.patrolTarget) < 12) {
        // Patrol near the camera: wander a little ahead or behind the turkey's path.
        const lo = state.cameraX + 60;
        const hi = state.cameraX + 900;
        farmer.patrolTarget = Math.max(lo, Math.min(hi, farmer.x + (random() < 0.5 ? -1 : 1) * range(random, 150, 380)));
      }
    } else if (farmer.mode === FARMER_SUSPICIOUS) {
      targetSpeed = FARMER.searchSpeed;
      targetX = farmer.lastSeenX;
      if (Math.abs(farmer.x - farmer.lastSeenX) < 20) farmer.mode = FARMER_PATROL;
    } else if (farmer.mode === FARMER_CHASE) {
      targetSpeed = FARMER.chaseSpeed + state.stage * 14;
      targetX = turkey.x;
      // Cornering: when close behind, the farmer cuts toward the turkey's
      // escape side instead of just following.
      const gap = turkey.x - farmer.x;
      if (Math.abs(gap) < 260) {
        farmer.cornered = true;
        targetX = turkey.x + turkey.facing * 60;
      } else farmer.cornered = false;
      farmer.throwTimer -= dt;
      if (farmer.throwTimer <= 0 && Math.abs(gap) > 200 && Math.abs(gap) < 520) {
        farmer.mode = FARMER_THROW;
        farmer.windup = FARMER.throwWindup;
      }
    } else if (farmer.mode === FARMER_SEARCH) {
      targetSpeed = FARMER.searchSpeed;
      targetX = farmer.lastSeenX + Math.sin(state.elapsed * 1.4) * 130;
      farmer.searchTimer -= dt;
      if (farmer.searchTimer <= 0) farmer.mode = FARMER_PATROL;
      if (sees && farmer.alert >= 1) farmer.mode = FARMER_CHASE;
    } else if (farmer.mode === FARMER_THROW) {
      farmer.windup -= dt;
      if (farmer.windup <= 0) {
        farmer.facing = turkey.x >= farmer.x ? 1 : -1;
        throwKnife();
        events |= EVENT_THROW;
        farmer.throwTimer = FARMER.throwInterval + random() * 0.8;
        farmer.mode = FARMER_CHASE;
      }
    }
    if (targetX !== farmer.x) {
      const dir = targetX > farmer.x ? 1 : -1;
      farmer.facing = dir;
      farmer.x += dir * targetSpeed * dt;
      if ((dir > 0 && farmer.x > targetX) || (dir < 0 && farmer.x < targetX)) farmer.x = targetX;
    }
    farmer.x = Math.max(40, farmer.x);
    // The farmer walks the same ground as the turkey: keep him in view.
    if (farmer.x < state.cameraX - 300) farmer.x = state.cameraX - 300;
    if (farmer.x > state.cameraX + FIELD.width + 300) farmer.x = state.cameraX + FIELD.width + 300;
    if (prevMode === FARMER_CHASE && farmer.mode !== FARMER_CHASE && farmer.mode !== FARMER_THROW) {
      // already reported EVENT_LOST above when sight was lost
    }
    void turkeySeesFarmer;
    } // end farmer AI (skipped while harmless)

    // --- Knives ---
    for (const knife of knives) {
      if (!knife.active) continue;
      knife.x += knife.vx * dt;
      knife.spin += KNIFE.spin * dt;
      if (knife.x < state.cameraX - 200 || knife.x > state.cameraX + FIELD.width + 200) {
        knife.active = false;
        continue;
      }
      if (!harmless && overlaps(knife, turkey)) {
        knife.active = false;
        events = hurtTurkey(events);
        if (state.over) return events;
      }
    }

    // --- Obstacles, pickups, ovens ---
    state.nearOven = false;
    for (const item of obstacles) {
      if (!item.active) continue;
      if (item.x + item.width < state.cameraX - 200) { item.active = false; continue; }
      if (harmless) continue;
      if (item.kind === KIND_FENCE) {
        // A fence blocks running on the ground; jump over it.
        if (turkey.onGround && overlaps(turkey, item) && turkey.y + turkey.height > item.y + 8) {
          if (turkey.facing > 0) turkey.x = Math.min(turkey.x, item.x - turkey.width + 2);
          else turkey.x = Math.max(turkey.x, item.x + item.width - 2);
        }
      } else if (item.kind === KIND_OVEN) {
        const cx = turkey.x + turkey.width / 2;
        const ox = item.x + item.width / 2;
        if (Math.abs(cx - ox) < OVEN.heatRadius && turkey.onGround) {
          state.nearOven = true;
          if (turkey.invulnerable <= 0) {
            state.lives -= 1;
            turkey.invulnerable = TURKEY.invulnerable;
            events |= EVENT_HIT;
            if (state.lives <= 0) { state.over = true; events |= EVENT_OVER; return events; }
          }
        }
      }
      if (!item.passed && item.x + item.width < turkey.x) {
        item.passed = true;
        state.score += 5;
      }
    }
    for (const item of pickups) {
      if (!item.active) continue;
      item.bob += dt * 3;
      if (item.x < state.cameraX - 200) { item.active = false; continue; }
      if (!harmless && overlaps(turkey, { x: item.x, y: item.y + Math.sin(item.bob) * 4, width: item.width, height: item.height })) {
        item.active = false;
        state.score += CORN.points;
        events |= EVENT_CORN;
      }
    }

    // --- Farmer catches the turkey ---
    if (!harmless && overlaps(turkey, farmer)) {
      events = hurtTurkey(events);
      if (state.over) return events;
      // Shove the turkey away so one touch is not an instant chain of hits.
      turkey.x = farmer.x + (turkey.x >= farmer.x ? farmer.width + 10 : -turkey.width - 10);
      turkey.y = FIELD.groundY - TURKEY.height;
      turkey.vy = -320;
      turkey.onGround = false;
    }

    seedAhead();
    return events;
  }

  reset();
  return { state, reset, step };
}
