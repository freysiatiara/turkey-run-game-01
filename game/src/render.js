// Everything the player sees, drawn on one 2D canvas: the autumn farmyard,
// the barn, the kitchen, the turkey, the farmer, the HUD and every screen.
// The world is drawn in world coordinates shifted by the camera; the HUD and
// the screens are drawn in screen coordinates on top.
import { FIELD, PALETTE, FONT, STAGES, ESCAPE_DISTANCE } from './config.js';
import {
  FARMER_CHASE, FARMER_PATROL, FARMER_SEARCH, FARMER_SUSPICIOUS, FARMER_THROW,
  KIND_CORN, KIND_FENCE, KIND_HAY, KIND_OVEN,
} from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_ESCAPED = 4;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTurkey(ctx, x, y, w, h, facing, running, time, hidden, invulnerable) {
  if (invulnerable > 0 && Math.floor(time * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.scale(facing, 1);
  const bob = running ? Math.sin(time * 14) * 3 : Math.sin(time * 2) * 1.5;
  // Tail feathers, fanned.
  for (let i = 0; i < 5; i += 1) {
    const angle = (-0.9 + i * 0.45);
    ctx.save();
    ctx.translate(-w * 0.32, -h * 0.55 + bob);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.turkeyTail[i % PALETTE.turkeyTail.length];
    ctx.beginPath();
    ctx.ellipse(-14, -16, 9, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = PALETTE.turkeyBody;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.42 + bob, w * 0.42, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wing.
  ctx.fillStyle = PALETTE.turkeyWing;
  ctx.beginPath();
  ctx.ellipse(-2, -h * 0.42 + bob, w * 0.26, h * 0.26, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.strokeStyle = '#f2a541';
  ctx.lineWidth = 4;
  const step = running ? Math.sin(time * 14) * 8 : 0;
  ctx.beginPath();
  ctx.moveTo(-8, -6); ctx.lineTo(-8 + step, 0);
  ctx.moveTo(8, -6); ctx.lineTo(8 - step, 0);
  ctx.stroke();
  // Neck and head.
  ctx.strokeStyle = PALETTE.turkeyBody;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, -h * 0.7 + bob);
  ctx.quadraticCurveTo(w * 0.42, -h * 0.95 + bob, w * 0.34, -h * 1.05 + bob);
  ctx.stroke();
  ctx.fillStyle = PALETTE.turkeyHead;
  ctx.beginPath();
  ctx.arc(w * 0.34, -h * 1.08 + bob, 11, 0, Math.PI * 2);
  ctx.fill();
  // Wattle and beak.
  ctx.fillStyle = PALETTE.turkeyWattle;
  ctx.beginPath();
  ctx.arc(w * 0.38, -h * 0.98 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.turkeyBeak;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, -h * 1.1 + bob);
  ctx.lineTo(w * 0.34 + 14, -h * 1.05 + bob);
  ctx.lineTo(w * 0.34, -h * 1.0 + bob);
  ctx.closePath();
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(w * 0.38, -h * 1.1 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (hidden) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#e3c25a';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', x + w / 2, y - 8);
    ctx.restore();
  }
}

function drawFarmer(ctx, x, y, w, h, facing, mode, time, windup) {
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.scale(facing, 1);
  const walk = mode === FARMER_PATROL || mode === FARMER_SEARCH ? Math.sin(time * 8) * 5 : 0;
  const run = mode === FARMER_CHASE ? Math.sin(time * 16) * 7 : 0;
  // Legs (overalls).
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-8, -34); ctx.lineTo(-8 + walk + run, 0);
  ctx.moveTo(8, -34); ctx.lineTo(8 - walk - run, 0);
  ctx.stroke();
  // Body: shirt + overalls.
  ctx.fillStyle = PALETTE.farmerShirt;
  roundRect(ctx, -w * 0.42, -h * 0.72, w * 0.84, h * 0.42, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(-w * 0.42, -h * 0.42, w * 0.84, h * 0.14);
  // Arm, raised with a knife while winding up a throw.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, -h * 0.62);
  if (windup > 0) ctx.lineTo(w * 0.55, -h * 0.95);
  else ctx.lineTo(w * 0.5, -h * 0.45);
  ctx.stroke();
  if (windup > 0) {
    ctx.fillStyle = PALETTE.knife;
    ctx.fillRect(w * 0.5, -h * 1.05, 26, 5);
  }
  // Head and hat.
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(0, -h * 0.82, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.9, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -h * 0.9 - 12, 26, 13);
  // Moustache.
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(-9, -h * 0.78, 18, 4);
  // Eyes: angry dots while chasing.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(5, -h * 0.84, 2, 0, Math.PI * 2);
  ctx.arc(11, -h * 0.84, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Alert mark above the farmer.
  if (mode === FARMER_CHASE || mode === FARMER_THROW) {
    ctx.save();
    ctx.fillStyle = PALETTE.alert;
    ctx.font = `bold 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', x + w / 2, y - 12);
    ctx.restore();
  } else if (mode === FARMER_SUSPICIOUS) {
    ctx.save();
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('?', x + w / 2, y - 12);
    ctx.restore();
  }
}

function drawFence(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.fence;
  ctx.fillRect(x, y + 8, w, 10);
  ctx.fillRect(x, y + h - 18, w, 10);
  ctx.fillRect(x + 2, y, 6, h);
  ctx.fillRect(x + w - 8, y, 6, h);
  ctx.fillStyle = '#8f6238';
  ctx.beginPath();
  ctx.moveTo(x + 2, y); ctx.lineTo(x + 8, y - 8); ctx.lineTo(x + 8, y);
  ctx.closePath(); ctx.fill();
}

function drawHay(ctx, x, y, w, h, time) {
  ctx.fillStyle = PALETTE.hay;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h, w / 2, h, Math.PI, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c9a13a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + 12 + i * 20, y + h - 8);
    ctx.quadraticCurveTo(x + 16 + i * 20, y + h * 0.45, x + 10 + i * 20, y + 10);
    ctx.stroke();
  }
  void time;
}

function drawOven(ctx, x, y, w, h, time) {
  ctx.fillStyle = PALETTE.oven;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  const flicker = 0.6 + Math.sin(time * 9) * 0.25;
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.fillStyle = PALETTE.ovenGlow;
  roundRect(ctx, x + 16, y + 18, w - 32, 34, 6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#22222a';
  ctx.fillRect(x + 16, y + 62, w - 32, 20);
  ctx.fillStyle = '#cfd4de';
  ctx.fillRect(x + 20, y + 68, 26, 4);
  ctx.fillRect(x + w - 46, y + 68, 26, 4);
  ctx.fillStyle = '#ff5340';
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('HOT!', x + w / 2, y - 8);
}

function drawKnife(ctx, x, y, spin) {
  ctx.save();
  ctx.translate(x + 17, y + 6);
  ctx.rotate(spin);
  ctx.fillStyle = PALETTE.knife;
  ctx.beginPath();
  ctx.moveTo(-17, -4); ctx.lineTo(8, -4); ctx.lineTo(17, 0); ctx.lineTo(8, 4); ctx.lineTo(-17, 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = PALETTE.knifeHandle;
  ctx.fillRect(-17, -5, 9, 10);
  ctx.restore();
}

function drawCorn(ctx, x, y, size, bob) {
  const yy = y + Math.sin(bob) * 4;
  ctx.fillStyle = '#7fae4e';
  ctx.beginPath();
  ctx.moveTo(x + size / 2, yy - 6);
  ctx.lineTo(x + size / 2 + 8, yy - 16);
  ctx.lineTo(x + size / 2, yy - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.corn;
  ctx.beginPath();
  ctx.ellipse(x + size / 2, yy + size / 2, size * 0.42, size * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9a521';
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.arc(x + size / 2 + i * 6, yy + size / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackground(ctx, stage, cameraX, time) {
  const palette = STAGES[stage];
  // Sky gradient.
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, palette.sky);
  sky.addColorStop(0.7, '#f2d8a0');
  sky.addColorStop(1, palette.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Sun.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(1080, 110, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
  ctx.beginPath();
  ctx.arc(1080, 110, 66, 0, Math.PI * 2);
  ctx.fill();
  // Drifting clouds.
  ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 340 - cameraX * 0.2) % 1500 + 1500) % 1500 - 100;
    const cy = 70 + i * 42;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 62, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34, cy + 6, 44, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Distant barn / farmhouse silhouettes, sitting on the ground.
  ctx.fillStyle = stage === 2 ? '#5a3a30' : '#8a4a2a';
  const bx = 240 - (cameraX * 0.35 % 1280);
  ctx.fillRect(bx, FIELD.groundY - 120, 180, 120);
  ctx.beginPath();
  ctx.moveTo(bx - 14, FIELD.groundY - 120); ctx.lineTo(bx + 90, FIELD.groundY - 180); ctx.lineTo(bx + 194, FIELD.groundY - 120);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a3a24';
  ctx.fillRect(760 - (cameraX * 0.3 % 1280), FIELD.groundY - 90, 120, 90);
  // Falling leaves.
  ctx.fillStyle = 'rgba(214, 105, 30, 0.8)';
  for (let i = 0; i < 12; i += 1) {
    const lx = ((i * 173 + time * 22) % 1320) - 20;
    const ly = ((i * 97 + time * 34) % 560) + 20;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(Math.sin(time * 2 + i) * 0.6);
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }
  // Ground.
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
  ctx.fillStyle = palette.grass;
  ctx.fillRect(0, FIELD.groundY, FIELD.width, 14);
  // Fence posts marching along the ground, parallax.
  ctx.fillStyle = 'rgba(122, 82, 48, 0.55)';
  const offset = -(cameraX % 90);
  for (let x = offset; x < FIELD.width; x += 90) {
    ctx.fillRect(x, FIELD.groundY - 26, 8, 26);
  }
}

function drawEscapeDoor(ctx, cameraX, time) {
  const doorX = 420 + 1400 / 0.12 - cameraX;
  if (doorX < -200 || doorX > FIELD.width + 200) return;
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(doorX, FIELD.groundY - 190, 130, 190);
  ctx.fillStyle = '#7fd67a';
  ctx.fillRect(doorX + 12, FIELD.groundY - 178, 106, 166);
  ctx.fillStyle = '#2b1d12';
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('FREEDOM', doorX + 65, FIELD.groundY - 200);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(time * 4) * 0.25})`;
  ctx.beginPath();
  ctx.arc(doorX + 65, FIELD.groundY - 95, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(43, 29, 18, 0.82)';
  roundRect(ctx, 16, 14, 560, 64, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${state.score}`, 34, 42);
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`${Math.floor(state.distance)} m`, 300, 40);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `16px ${FONT}`;
  ctx.fillText(`BEST ${Math.max(best, state.score)}`, 430, 40);
  // Lives as hearts.
  for (let i = 0; i < 3; i += 1) {
    const hx = 34 + i * 34;
    const hy = 66;
    ctx.fillStyle = i < state.lives ? '#ff5a6e' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(hx, hy - 4, 7, 0, Math.PI * 2);
    ctx.arc(hx + 12, hy - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 4, hy + 1); ctx.lineTo(hx + 16, hy + 1); ctx.lineTo(hx + 6, hy + 12);
    ctx.closePath(); ctx.fill();
  }
  // Stage label + progress bar to the kitchen door.
  ctx.fillStyle = 'rgba(43, 29, 18, 0.82)';
  roundRect(ctx, FIELD.width - 340, 14, 324, 64, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(STAGES[state.stage].name.toUpperCase(), FIELD.width - 322, 42);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(FIELD.width - 322, 54, 288, 8);
  ctx.fillStyle = PALETTE.safe;
  ctx.fillRect(FIELD.width - 322, 54, 288 * Math.min(1, state.distance / ESCAPE_DISTANCE), 8);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('ESCAPE', FIELD.width - 322, 74);
  // Alert meter when the farmer is suspicious or chasing.
  if (state.farmer.mode !== FARMER_PATROL) {
    const label = state.farmer.mode === FARMER_CHASE || state.farmer.mode === FARMER_THROW
      ? 'SPOTTED! RUN!' : state.farmer.mode === FARMER_SEARCH ? 'SEARCHING…' : 'SUSPICIOUS…';
    ctx.fillStyle = state.farmer.mode === FARMER_CHASE || state.farmer.mode === FARMER_THROW
      ? PALETTE.alert : '#ffd23e';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, FIELD.width / 2, 108);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(FIELD.width / 2 - 110, 118, 220, 10);
    ctx.fillStyle = state.farmer.mode === FARMER_CHASE || state.farmer.mode === FARMER_THROW
      ? PALETTE.alert : '#ffd23e';
    ctx.fillRect(FIELD.width / 2 - 110, 118, 220 * state.farmer.alert, 10);
  }
  // Oven warning.
  if (state.nearOven) {
    ctx.fillStyle = PALETTE.alert;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('TOO HOT — MOVE!', FIELD.width / 2, 150);
  }
  ctx.restore();
}

function drawPanel(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 290, 110, 700, 470, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 290, 110, 700, 470, 18);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, 180);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 232 + i * 34);
  });
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let time = 0;

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }

  function draw(state, screen, best) {
    time += 1 / 60;
    fit();
    const cam = state.cameraX;
    drawBackground(ctx, state.stage, cam, time);
    ctx.save();
    ctx.translate(-cam, 0);
    drawEscapeDoor(ctx, cam, time);
    for (const item of state.obstacles) {
      if (!item.active) continue;
      if (item.kind === KIND_FENCE) drawFence(ctx, item.x, item.y, item.width, item.height);
      else if (item.kind === KIND_HAY) drawHay(ctx, item.x, item.y, item.width, item.height, time);
      else if (item.kind === KIND_OVEN) drawOven(ctx, item.x, item.y, item.width, item.height, time);
    }
    for (const item of state.pickups) {
      if (item.active) drawCorn(ctx, item.x, item.y, item.width, item.bob);
    }
    for (const knife of state.knives) {
      if (knife.active) drawKnife(ctx, knife.x, knife.y, knife.spin);
    }
    const turkey = state.turkey;
    if (turkey.hidden) {
      // Hidden turkey peeks out of the haystack.
      drawTurkey(ctx, turkey.x, turkey.y + 18, turkey.width, turkey.height * 0.7, turkey.facing, false, time, true, turkey.invulnerable);
    } else {
      drawTurkey(ctx, turkey.x, turkey.y, turkey.width, turkey.height, turkey.facing, turkey.running, time, false, turkey.invulnerable);
    }
    const farmer = state.farmer;
    drawFarmer(ctx, farmer.x, farmer.y, farmer.width, farmer.height, farmer.facing, farmer.mode, time, farmer.mode === FARMER_THROW ? farmer.windup : 0);
    ctx.restore();

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(ctx, state, best);
      if (screen === SCREEN_PAUSED) {
        drawPanel(ctx, 'PAUSED', ['Take a breath, gobbler.', 'Press P or click to keep running.', 'M toggles sound.'], '#ffd23e');
      }
    } else if (screen === SCREEN_TITLE) {
      drawHud(ctx, state, best);
      drawPanel(ctx, 'GOBBLE RUN', [
        'Thanksgiving is coming — and YOU are the dinner.',
        'Outrun the farmer from the farmyard to the kitchen door.',
        'Dodge his carving knives. Jump the fences. Hide in the hay.',
        'Grab corn for points. Reach 1400 m to escape!',
        '',
        '← → / A D move   •   SPACE jump   •   SHIFT dash',
        'S / ↓ hide in hay   •   Click / drag also steers   •   M mute',
        '',
        'Press SPACE or click to start',
      ], '#e8a33c');
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 560);
    } else if (screen === SCREEN_OVER) {
      drawPanel(ctx, 'CAUGHT!', [
        `The farmer got you at ${Math.floor(state.distance)} m.`,
        `Score ${state.score}   •   Best ${Math.max(best, state.score)}`,
        'Thanksgiving dinner is served… unless you run again.',
        '',
        'Press SPACE or click to run again',
      ], PALETTE.alert);
    } else if (screen === SCREEN_ESCAPED) {
      drawPanel(ctx, 'ESCAPED!', [
        'You slipped out the kitchen door — no turkey dinner today!',
        `You ran ${Math.floor(state.distance)} m and scored ${state.score}.`,
        `Best ${Math.max(best, state.score)}`,
        '',
        'Press SPACE or click to run again',
      ], PALETTE.safe);
    }
  }

  return { draw };
}
