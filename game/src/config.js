// Every tuning number and colour for Gobble Run in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const TURKEY = {
  width: 64,
  height: 56,
  walkSpeed: 300,
  dashSpeed: 520,
  dashTime: 0.35,
  dashCooldown: 1.1,
  jumpSpeed: 640,
  gravity: 1700,
  invulnerable: 1.6,
  hideTime: 0.4,
};

export const FARMER = {
  width: 58,
  height: 92,
  patrolSpeed: 120,
  chaseSpeed: 305,
  searchSpeed: 170,
  visionRange: 420,
  visionHalfAngle: 0.55,
  alertPerSecond: 1.4,
  calmPerSecond: 1.2,
  throwInterval: 3.4,
  throwWindup: 0.5,
};

export const KNIFE = { width: 34, height: 12, speed: 460, spin: 9 };

export const CORN = { size: 26, points: 25 };

export const OVEN = { width: 120, height: 96, heatRadius: 90, tickDamage: 1 };

export const LIVES = 3;

/** Distance in metres per stage; the kitchen door opens at the end of stage 3. */
export const STAGES = [
  { name: 'Farmyard', until: 400, sky: '#f7c873', ground: '#c98f4e', grass: '#7fae4e' },
  { name: 'The Barn', until: 900, sky: '#e8a35c', ground: '#8a5a34', grass: '#a8813f' },
  { name: 'The Kitchen', until: 1400, sky: '#d97b4f', ground: '#6e4a3a', grass: '#b0703f' },
];
export const ESCAPE_DISTANCE = 1400;
export const METRES_PER_PIXEL = 0.12;

export const PALETTE = {
  turkeyBody: '#8a5a2b',
  turkeyWing: '#6e4420',
  turkeyTail: ['#b5651d', '#d2691e', '#e8a33c', '#a0522d'],
  turkeyHead: '#e8e0d0',
  turkeyWattle: '#d9382b',
  turkeyBeak: '#f2a541',
  farmerShirt: '#3e6fb0',
  farmerOveralls: '#2f4d6e',
  farmerSkin: '#e8b98a',
  farmerHat: '#d9b64a',
  hay: '#e3c25a',
  fence: '#7a5230',
  oven: '#4a4a52',
  ovenGlow: '#ff7a2a',
  knife: '#d7dde6',
  knifeHandle: '#5a2d1a',
  corn: '#f2c94c',
  panel: '#2b1d12',
  text: '#fff6e8',
  muted: '#d8b98a',
  alert: '#ff5340',
  safe: '#7fd67a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-run.best';
