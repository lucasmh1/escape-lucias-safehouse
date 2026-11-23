/**
 * SINGLE SOURCE OF TRUTH for the entire Lucia's Safehouse penthouse floorplan.
 * Units: meters. Y is up. North = -Z, South = +Z, West = -X, East = +X.
 *
 * Floorplan overview (X: -9..13.5, Z: -11.5..9.5):
 *
 *               [-9..1, -11.5..-7.5]
 *                     BALCONY
 *          ====== sliding glass door ======
 *   [-9..1, -7.5..2.5]  |  [1..10, -7.5..2.5]  | [10..13.5, -3.5..1.5]
 *     LIVING ROOM       (open)   KITCHEN       (open)  MAIN ENTRANCE
 *   ====== bed door ======= bath door ======= sec door (locked) ======
 *   [-9..-2.5, 2.5..9.5]|[-2.5..2.5,2.5..9.5]  | [2.5..10, 2.5..9.5]
 *        BEDROOM        |      BATHROOM        |    SECURITY ROOM
 */

export const WALL_THICKNESS = 0.24;
export const PLAYER_EYE_HEIGHT = 1.65;
export const PLAYER_RADIUS = 0.34;

export const PLAYER_SPAWN = Object.freeze({
  x: -1.5,
  y: PLAYER_EYE_HEIGHT,
  z: -0.6,
  yaw: 0.65, // Facing West-North-West toward the curved sofa, panoramic rain windows & mezzanine
  pitch: -0.04,
});

export const ROOMS = Object.freeze({
  balcony: {
    id: 'balcony',
    name: 'Penthouse Balcony',
    minX: -9.0,
    maxX: 1.0,
    minZ: -11.5,
    maxZ: -7.5,
    floorY: 0,
    ceilingY: 4.5,
    openAir: true,
    surface: 'balcony',
  },
  living_room: {
    id: 'living_room',
    name: 'Living Room & Entertainment Area',
    minX: -9.0,
    maxX: 1.0,
    minZ: -7.5,
    maxZ: 2.5,
    floorY: 0,
    ceilingY: 4.8,
    surface: 'wood',
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen & Dining Area',
    minX: 1.0,
    maxX: 10.0,
    minZ: -7.5,
    maxZ: 2.5,
    floorY: 0,
    ceilingY: 3.6,
    surface: 'marble',
  },
  foyer: {
    id: 'foyer',
    name: 'Main Entrance Foyer',
    minX: 10.0,
    maxX: 13.5,
    minZ: -3.5,
    maxZ: 1.5,
    floorY: 0,
    ceilingY: 3.6,
    surface: 'marble',
  },
  bedroom: {
    id: 'bedroom',
    name: 'Lucia’s Bedroom',
    minX: -9.0,
    maxX: -2.5,
    minZ: 2.5,
    maxZ: 9.5,
    floorY: 0,
    ceilingY: 3.4,
    surface: 'carpet',
  },
  bathroom: {
    id: 'bathroom',
    name: 'Luxury Bathroom',
    minX: -2.5,
    maxX: 2.5,
    minZ: 2.5,
    maxZ: 9.5,
    floorY: 0,
    ceilingY: 3.4,
    surface: 'marble',
  },
  security_room: {
    id: 'security_room',
    name: 'Security & Comms Room',
    minX: 2.5,
    maxX: 10.0,
    minZ: 2.5,
    maxZ: 9.5,
    floorY: 0,
    ceilingY: 3.4,
    surface: 'wood',
  },
});

/**
 * Doorways and open archways.
 * orientation: 'x' means wall runs along X (door faces North/South),
 *              'z' means wall runs along Z (door faces East/West).
 */
export const DOORS = Object.freeze({
  door_balcony: {
    id: 'door_balcony',
    label: 'Sliding Balcony Doors',
    type: 'sliding',
    orientation: 'x',
    x: -4.0,
    z: -7.5,
    width: 3.0,
    height: 2.7,
    locked: false,
    roomA: 'living_room',
    roomB: 'balcony',
  },
  door_bedroom: {
    id: 'door_bedroom',
    label: 'Bedroom Door',
    type: 'hinged',
    orientation: 'x',
    x: -6.4,
    z: 2.5,
    width: 1.5,
    height: 2.45,
    locked: false,
    hingeSide: 'left',
    swingDir: 1, // swings south into bedroom
    roomA: 'living_room',
    roomB: 'bedroom',
  },
  door_bathroom: {
    id: 'door_bathroom',
    label: 'Bathroom Door',
    type: 'hinged',
    orientation: 'x',
    x: 0.0,
    z: 2.5,
    width: 1.4,
    height: 2.45,
    locked: false,
    hingeSide: 'left',
    swingDir: 1,
    roomA: 'living_room',
    roomB: 'bathroom',
  },
  door_security: {
    id: 'door_security',
    label: 'Security Room Door',
    type: 'hinged',
    orientation: 'x',
    x: 5.0,
    z: 2.5,
    width: 1.5,
    height: 2.45,
    locked: true,
    requiresItem: 'security_keycard',
    hingeSide: 'left',
    swingDir: 1,
    roomA: 'kitchen',
    roomB: 'security_room',
  },
  door_main_entrance: {
    id: 'door_main_entrance',
    label: 'Reinforced Main Entrance',
    type: 'exit',
    orientation: 'z',
    x: 13.5,
    z: -1.0,
    width: 1.6,
    height: 2.55,
    locked: true,
    requiresItem: 'master_exit_key',
    roomA: 'foyer',
    roomB: 'outside',
  },
});

/**
 * Exact wall segments: each segment is an axis-aligned box { id, x1, z1, x2, z2, height, kind }
 * kind: 'solid' | 'window' | 'railing'
 * Environment builds visuals from these AND registers their AABBs for collision.
 */
export const WALL_SEGMENTS = Object.freeze([
  // --- Balcony Glass Railings (North, West, East) ---
  { id: 'balcony_rail_n', x1: -9.0, z1: -11.5, x2: 1.0, z2: -11.5, height: 1.25, kind: 'railing' },
  { id: 'balcony_rail_w', x1: -9.0, z1: -11.5, x2: -9.0, z2: -7.5, height: 1.25, kind: 'railing' },
  { id: 'balcony_rail_e', x1: 1.0, z1: -11.5, x2: 1.0, z2: -7.5, height: 1.25, kind: 'railing' },

  // --- North Exterior Wall (z = -7.5) ---
  // Living room panoramic glass flanking balcony door [-5.5, -2.5]
  { id: 'living_north_w', x1: -9.0, z1: -7.5, x2: -5.5, z2: -7.5, height: 4.8, kind: 'window' },
  { id: 'living_north_e', x1: -2.5, z1: -7.5, x2: 1.0, z2: -7.5, height: 4.8, kind: 'window' },
  // Kitchen north wall (solid backing for oven, sink, fridge)
  { id: 'kitchen_north', x1: 1.0, z1: -7.5, x2: 10.0, z2: -7.5, height: 3.6, kind: 'solid' },

  // --- West Exterior Wall (x = -9.0) ---
  // Living room panoramic rainy city window
  { id: 'living_west_win', x1: -9.0, z1: -7.5, x2: -9.0, z2: 2.5, height: 4.8, kind: 'window' },
  // Bedroom west wall
  { id: 'bedroom_west', x1: -9.0, z1: 2.5, x2: -9.0, z2: 9.5, height: 3.4, kind: 'solid' },

  // --- South Exterior Wall (z = 9.5) ---
  // Bedroom 4-panel bay window overlooking dark ocean & neon palms
  { id: 'bedroom_south_w', x1: -9.0, z1: 9.5, x2: -8.0, z2: 9.5, height: 3.4, kind: 'solid' },
  { id: 'bedroom_south_bay', x1: -8.0, z1: 9.5, x2: -3.5, z2: 9.5, height: 3.4, kind: 'window' },
  { id: 'bedroom_south_e', x1: -3.5, z1: 9.5, x2: -2.5, z2: 9.5, height: 3.4, kind: 'solid' },
  // Bathroom & Security south walls
  { id: 'bathroom_south', x1: -2.5, z1: 9.5, x2: 2.5, z2: 9.5, height: 3.4, kind: 'solid' },
  { id: 'security_south', x1: 2.5, z1: 9.5, x2: 10.0, z2: 9.5, height: 3.4, kind: 'solid' },

  // --- East Exterior Walls ---
  // Kitchen east wall with open archway to Foyer at z: [-2.2, 0.2]
  { id: 'kitchen_east_n', x1: 10.0, z1: -7.5, x2: 10.0, z2: -2.2, height: 3.6, kind: 'solid' },
  { id: 'kitchen_east_s', x1: 10.0, z1: 0.2, x2: 10.0, z2: 2.5, height: 3.6, kind: 'solid' },
  // Security room east wall
  { id: 'security_east', x1: 10.0, z1: 2.5, x2: 10.0, z2: 9.5, height: 3.4, kind: 'solid' },
  // Foyer perimeter
  { id: 'foyer_north', x1: 10.0, z1: -3.5, x2: 13.5, z2: -3.5, height: 3.6, kind: 'solid' },
  { id: 'foyer_south', x1: 10.0, z1: 1.5, x2: 13.5, z2: 1.5, height: 3.6, kind: 'solid' },
  // Foyer east wall flanking Main Entrance door z: [-1.8, -0.2]
  { id: 'foyer_east_n', x1: 13.5, z1: -3.5, x2: 13.5, z2: -1.8, height: 3.6, kind: 'solid' },
  { id: 'foyer_east_s', x1: 13.5, z1: -0.2, x2: 13.5, z2: 1.5, height: 3.6, kind: 'solid' },

  // --- Interior Partition: North-South divider at z = 2.5 ---
  // Bedroom door opening: x [-7.15, -5.65]
  { id: 'part_z25_1', x1: -9.0, z1: 2.5, x2: -7.15, z2: 2.5, height: 3.4, kind: 'solid' },
  // TV feature wall between Bedroom door and Bathroom door
  { id: 'part_z25_2', x1: -5.65, z1: 2.5, x2: -0.7, z2: 2.5, height: 3.4, kind: 'solid' },
  // Bathroom door opening: x [-0.7, 0.7]
  { id: 'part_z25_3', x1: 0.7, z1: 2.5, x2: 4.25, z2: 2.5, height: 3.4, kind: 'solid' },
  // Security door opening: x [4.25, 5.75]
  { id: 'part_z25_4', x1: 5.75, z1: 2.5, x2: 10.0, z2: 2.5, height: 3.4, kind: 'solid' },

  // --- Interior Partitions between South Rooms ---
  // Bedroom <-> Bathroom at x = -2.5
  { id: 'part_bed_bath', x1: -2.5, z1: 2.5, x2: -2.5, z2: 9.5, height: 3.4, kind: 'solid' },
  // Bathroom <-> Security Room at x = 2.5
  { id: 'part_bath_sec', x1: 2.5, z1: 2.5, x2: 2.5, z2: 9.5, height: 3.4, kind: 'solid' },

  // --- Living <-> Kitchen subtle column piers (open archway z: [-6.5, 1.5]) ---
  { id: 'pier_lk_n', x1: 1.0, z1: -7.5, x2: 1.0, z2: -6.5, height: 3.6, kind: 'solid' },
  { id: 'pier_lk_s', x1: 1.0, z1: 1.5, x2: 1.0, z2: 2.5, height: 3.6, kind: 'solid' },
]);

/**
 * Named anchor coordinates for hero furniture, puzzle stations, clues, and chaos props.
 * Environment places objects at these exact coordinates; puzzles & hints can reference them.
 */
export const ANCHORS = Object.freeze({
  // Living Room
  lounge_nook: { x: -7.6, y: 0, z: -5.6, room: 'living_room' },
  coffee_mug: { x: -7.2, y: 0.35, z: -5.2, room: 'living_room' },
  headphones: { x: -7.8, y: 0.32, z: -6.0, room: 'living_room' },
  curved_sofa: { x: -4.4, y: 0, z: -2.2, room: 'living_room' },
  coffee_table: { x: -3.5, y: 0, z: -0.6, room: 'living_room' },
  tv_remote: { x: -3.3, y: 0.48, z: -0.55, room: 'living_room' },
  tv_console: { x: -3.2, y: 0, z: 2.02, room: 'living_room' },
  living_tv: { x: -3.2, y: 1.38, z: 2.22, room: 'living_room' },
  gaming_console: { x: -2.2, y: 0.58, z: 2.02, room: 'living_room' },
  spiral_stair: { x: -7.6, y: 0, z: 0.8, room: 'living_room' },

  // Kitchen
  marble_island: { x: 5.5, y: 0, z: -3.0, room: 'kitchen' },
  recipe_card: { x: 5.1, y: 0.96, z: -3.05, room: 'kitchen' },
  kitchen_drawer: { x: 6.3, y: 0.72, z: -2.55, room: 'kitchen' },
  kitchen_oven: { x: 5.5, y: 0, z: -6.9, room: 'kitchen' },
  kitchen_fridge: { x: 8.7, y: 0, z: -6.8, room: 'kitchen' },
  fridge_note: { x: 8.7, y: 1.52, z: -6.32, room: 'kitchen' },
  kitchen_sink: { x: 3.1, y: 0, z: -6.9, room: 'kitchen' },

  // Foyer
  foyer_console: { x: 11.7, y: 0, z: -3.0, room: 'foyer' },
  main_entrance_door: { x: 13.5, y: 0, z: -1.0, room: 'foyer' },

  // Balcony
  balcony_lounge: { x: -7.2, y: 0, z: -9.6, room: 'balcony' },
  balcony_escape_ledge: { x: -4.0, y: 0, z: -11.1, room: 'balcony' },
  crowbar: { x: -0.6, y: 0.42, z: -10.4, room: 'balcony' },

  // Bedroom
  bed: { x: -6.9, y: 0, z: 5.8, room: 'bedroom' },
  nightstand: { x: -4.5, y: 0, z: 5.2, room: 'bedroom' },
  voicemail_dock: { x: -4.5, y: 0.64, z: 5.15, room: 'bedroom' },
  nightstand_drawer: { x: -4.5, y: 0.42, z: 4.82, room: 'bedroom' },
  bedroom_coral_sofa: { x: -5.6, y: 0, z: 8.4, room: 'bedroom' },
  bedroom_lamp: { x: -3.4, y: 0.65, z: 8.3, room: 'bedroom' },

  // Bathroom
  bathroom_vanity: { x: 1.85, y: 0, z: 5.5, room: 'bathroom' },
  bathroom_mirror: { x: 2.34, y: 1.55, z: 5.5, room: 'bathroom' },
  bathroom_shower: { x: -1.25, y: 0, z: 7.9, room: 'bathroom' },

  // Security Room
  cctv_desk: { x: 6.3, y: 0, z: 8.45, room: 'security_room' },
  radio_desk: { x: 9.0, y: 0, z: 5.5, room: 'security_room' },
  wall_safe: { x: 2.74, y: 1.35, z: 6.0, room: 'security_room' },
  heist_board: { x: 7.9, y: 1.55, z: 2.74, room: 'security_room' },
});

/**
 * Convert WALL_SEGMENTS into static AABB colliders `{ id, minX, maxX, minY, maxY, minZ, maxZ, tag }`.
 * Doors register their own dynamic colliders that toggle when open/closed.
 */
export function buildWallColliders() {
  const halfT = WALL_THICKNESS * 0.5;
  return WALL_SEGMENTS.map((seg) => {
    const minX = Math.min(seg.x1, seg.x2) - halfT;
    const maxX = Math.max(seg.x1, seg.x2) + halfT;
    const minZ = Math.min(seg.z1, seg.z2) - halfT;
    const maxZ = Math.max(seg.z1, seg.z2) + halfT;
    return {
      id: `wall_${seg.id}`,
      minX,
      maxX,
      minY: 0,
      maxY: seg.height,
      minZ,
      maxZ,
      tag: seg.kind,
      active: true,
    };
  });
}

/**
 * Build a door's closed AABB collider from a DOORS entry.
 */
export function buildDoorCollider(doorDef) {
  const halfT = WALL_THICKNESS * 0.55;
  const halfW = doorDef.width * 0.5;
  if (doorDef.orientation === 'x') {
    return {
      id: `collider_${doorDef.id}`,
      doorId: doorDef.id,
      minX: doorDef.x - halfW,
      maxX: doorDef.x + halfW,
      minY: 0,
      maxY: doorDef.height,
      minZ: doorDef.z - halfT,
      maxZ: doorDef.z + halfT,
      tag: 'door',
      active: true,
    };
  }
  return {
    id: `collider_${doorDef.id}`,
    doorId: doorDef.id,
    minX: doorDef.x - halfT,
    maxX: doorDef.x + halfT,
    minY: 0,
    maxY: doorDef.height,
    minZ: doorDef.z - halfW,
    maxZ: doorDef.z + halfW,
    tag: 'door',
    active: true,
  };
}

/**
 * Determine which room contains world position (x, z).
 */
export function getRoomAt(x, z) {
  for (const room of Object.values(ROOMS)) {
    if (x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ) {
      return room;
    }
  }
  return ROOMS.living_room;
}

export default {
  WALL_THICKNESS,
  PLAYER_EYE_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPAWN,
  ROOMS,
  DOORS,
  WALL_SEGMENTS,
  ANCHORS,
  buildWallColliders,
  buildDoorCollider,
  getRoomAt,
};
