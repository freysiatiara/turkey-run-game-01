// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (run right, jump fences, dash when the farmer closes in,
// grab nearby corn), so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_ESCAPED } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 16;
const CHASE_SECONDS = 3;
const END_LIMIT_SECONDS = 600;

/** Autopilot: run right, jump when a fence is close, dash when chased. */
function autopilot(state) {
  const turkey = state.turkey;
  const farmer = state.farmer;
  let direction = 1;
  let jump = false;
  let dash = false;
  for (const item of state.obstacles) {
    if (!item.active || item.kind !== 2) continue;
    const gap = item.x - (turkey.x + turkey.width);
    // Jump while approaching — and while pressed against it, to climb over.
    if (gap < 150 && turkey.onGround) jump = true;
  }
  // Jump a carving knife flying at the turkey's chest height, from either
  // side. Late jump: the turkey is highest just as the knife passes.
  for (const knife of state.knives) {
    if (!knife.active) continue;
    const approaching = (knife.vx > 0 && knife.x < turkey.x) || (knife.vx < 0 && knife.x > turkey.x);
    const gap = Math.abs(knife.x - turkey.x);
    if (approaching && gap < 100 && turkey.onGround) jump = true;
  }
  const farmerGap = turkey.x - farmer.x;
  if ((farmer.mode === 2 || farmer.mode === 4) && farmerGap < 320 && turkey.dashCooldown <= 0) dash = true;
  // Slow down for corn just ahead at ground level.
  for (const item of state.pickups) {
    if (!item.active) continue;
    if (item.x > turkey.x + turkey.width + 10 && item.x < turkey.x + 260 && item.y > 480) {
      direction = 1;
      break;
    }
  }
  return { direction, jump, dash, hide: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'chase') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, 0, false, false, false, true);
    }
    return { screen: SCREEN_TITLE, best: 1240 };
  }
  // The chase scene catches the farmer seconds after he spots the turkey:
  // close behind, knife in the air, alert banner up.
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'chase' ? CHASE_SECONDS : PLAY_SECONDS;
  // The end scene's pilot is careless: it never jumps and never dashes.
  const careless = name === 'end';
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = careless
      ? { direction: 1, jump: false, dash: false, hide: false }
      : autopilot(world.state);
    const events = world.step(STEP, move.direction, move.jump, move.dash, move.hide, false);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.max(1240, world.state.score) };
}
