/**
 * 100% original neo-noir Vice City / Miami satirical narrative, clues,
 * TV broadcasts, radio transcripts, environmental inspect lines, and endings.
 */

export const VOICEMAIL = {
  id: 'voicemail_dock',
  speaker: 'LUCIA',
  timestamp: '03:17 AM — 1 NEW MESSAGE',
  duration: '0:42',
  lines: [
    "Hey. If you're hearing this, you finally woke up on the leather couch with a lukewarm espresso and zero situational awareness.",
    "The overnight job went sideways at 02:14 AM. Jason bolted to stash the van, and I had to trigger the penthouse lockdown before the local precinct's favorite drone squad swept the bay.",
    "The Master Exit Key is locked inside the Security Room wall safe. No, I didn't write the four digits on a sticky note — I'm a professional, not a sitcom dad.",
    "I split the code across four systems in order: TV, Oven, CCTV, Radio. Start with the TV remote — I left it by the curved sofa. And please, do NOT get sucked into the comment section on Channel 1.",
    "Also, don't burn the decoy turkey in the kitchen unless you want to owe the landlord thirty grand. Move fast. Sunrise is in an hour."
  ],
};

export const TV_CHANNELS = [
  {
    number: 1,
    callSign: 'FPS-TV',
    name: 'FRAME RATE CIVIL WAR',
    accent: '#ff2a85',
    badge: 'LIVE DEBATE',
    headline: 'EXPERTS AGREE: 30 FPS IS "CINEMATIC" — COMMENT SECTION DECLARES MARTIAL LAW',
    body: 'Panelist #1 insists the human eye cannot see past 24 frames. Panelist #2 just threw a mechanical keyboard through the studio drywall. Moderators have fled the building.',
    ticker: 'BREAKING: 14,000 GAMERS SIGN PETITION TO BAN MOTION BLUR • NEXT UP: IS RAY-TRACING A GOVERNMENT PSYOP? •',
    clueHint: null,
  },
  {
    number: 2,
    callSign: 'MNN-2',
    name: 'BLACK FRIDAY STAMPEDE WATCH',
    accent: '#00f0ff',
    badge: 'BREAKING NEWS',
    headline: 'SHOPPERS TRAMPLE MALL FOUNTAIN FOR $89 SMART TOASTER WITH BLUETOOTH',
    body: 'Live chopper footage shows three uncles negotiating a peace treaty over the last air fryer in aisle 7. Local police advise staying indoors until the doorbuster fog clears.',
    ticker: 'SECOND SIGNAL CONFIRMED: TUNE CH 02 AFTER THE AI PODCAST • DOORBUSTER CASUALTIES: 4 SHOPPING CARTS •',
    clueHint: 'SECOND in sequence (Ch 02)',
  },
  {
    number: 3,
    callSign: 'CHEF-X',
    name: 'HOLIDAY KITCHEN DISASTERS',
    accent: '#ffb020',
    badge: 'COOKING SPECIAL',
    headline: 'DEEP-FRYING A FROZEN TURKEY INSIDE A LUXURY HIGH-RISE: A CAUTIONARY TALE',
    body: 'Chef Marco demonstrates why 550°F for 90 minutes turns poultry into orbital rocket fuel. "Low and steady wins the holiday," he warns while holding a fire extinguisher.',
    ticker: 'PRO TIP: CHECK YOUR KITCHEN RECIPE CARD BEFORE TOUCHING THE OVEN • FIRE MARSHALS ON STANDBY •',
    clueHint: null,
  },
  {
    number: 4,
    callSign: 'ALGO-4',
    name: 'THE ALGORITHM OUTRAGE PODCAST',
    accent: '#a855f7',
    badge: 'LIVE PODCAST',
    headline: 'HOST WITH THREE MICROPHONES ARGUES WITH HIS OWN AI CLONE FOR SIX HOURS',
    body: '"Bro, you literally have to start here," says the host, pointing at a whiteboard that just says "STEP 1: CHANNEL FOUR -> THEN BLACK FRIDAY NEWS -> THEN HURRICANE WATCH."',
    ticker: 'START THE EMERGENCY OVERRIDE HERE: 04 -> 02 -> 06 • SPONSORED BY CRYPTO-ENERGY WATER •',
    clueHint: 'FIRST in sequence (Ch 04)',
  },
  {
    number: 5,
    callSign: 'COIN-5',
    name: 'BRO-CHAIN HEIST TONIGHT',
    accent: '#00f59b',
    badge: 'FINANCE',
    headline: 'MIAMI CRYPTO FOUNDER ACCIDENTALLY LEAKS SEED PHRASE ON LIVESTREAM, BLAMES MERCURY',
    body: '"It\'s not a rug-pull, it\'s a decentralized liquidity relocation," insists Chad V. from a rented yacht that is actively being repossessed behind him.',
    ticker: 'PALMCOIN DOWN 99.8% • "STILL EARLY" SAYS MAN LIVING IN A JET SKI TRAILER •',
    clueHint: null,
  },
  {
    number: 6,
    callSign: 'STORM-6',
    name: 'VICE BAY HURRICANE WATCH',
    accent: '#38bdf8',
    badge: 'WEATHER ALERT',
    headline: 'CATEGORY 3 NEON SQUALL HITS THE COAST — RESIDENTS ADVISED TO LOCK PENTHOUSE BALCONIES',
    body: 'Wind gusts at 70 mph over Ocean Boulevard. Meteorologist warns that anyone trying to zipline off a high-rise balcony tonight will definitely void their security deposit.',
    ticker: 'FINAL OVERRIDE NODE: CH 06 COMPLETES THE 04-02-06 BROADCAST LOCK • STAY DRY, MIAMI •',
    clueHint: 'THIRD in sequence (Ch 06)',
  },
];

export const TV_SECRET_BROADCAST = {
  callSign: 'LUCIA-ENC',
  headline: 'OVERRIDE ACCEPTED — SAFE DIGIT #1 UNLOCKED',
  digit: '7',
  body: 'Nice channel surfing. First digit of the Security Room safe is [ 7 ]. Next step: thaw the decoy turkey in the kitchen — check my stained recipe card on the marble island before you touch the dials.',
  ticker: 'ENCRYPTED DROP: DIGIT #1 = [ 7 ] • PROCEED TO KITCHEN OVEN • DO NOT BURN THE PENTHOUSE •',
};

export const TV_HOT_TAKES = [
  {
    buttonLabel: 'Post: "30 FPS is literally unplayable"',
    playerPost: 'If your game runs at 30 FPS in this economy, you should be tried at The Hague.',
    replyUser: '@CinemaPurist_99',
    replyText: 'Ratio + you clearly never calibrated your OLED + touch neon grass.',
  },
  {
    buttonLabel: 'Reply: "Actually, my nephew works at GPU Corp"',
    playerPost: 'Nice try buddy, I have a spreadsheet of frame-time graphs proving you wrong.',
    replyUser: '@FrameGoblin305',
    replyText: 'Posting a spreadsheet at 3:30 AM? Bro is trapped in a penthouse arguing with strangers.',
  },
  {
    buttonLabel: 'Double Down: Write a 6-paragraph thread',
    playerPost: 'THREAD (1/6): Why human vision actually evolved specifically to detect 240Hz reflections...',
    replyUser: '@ViceCityMod',
    replyText: '412 people are typing... You just got quote-posted by a verified gaming chair account.',
  },
  {
    buttonLabel: 'Triple Down: Demand a live debate',
    playerPost: 'Hop in voice chat right now coward. I will debate frame pacing until sunrise.',
    replyUser: '@AlgoBot_Official',
    replyText: 'ENGAGEMENT SPIKE DETECTED. Serving you 9,000 more rage-bait replies. Welcome home.',
  },
  {
    buttonLabel: 'Accept Destiny: Become a Reply Guy Forever',
    playerPost: 'Forget the heist. Forget the cops. Someone on the internet is WRONG and I must fix them.',
    replyUser: '@EveryoneOnline',
    replyText: 'Achievement Unlocked: You lost the escape room to a comment section.',
  },
];

export const CLUES = {
  voicemail_dock: {
    id: 'voicemail_dock',
    title: "Lucia's Voicemail Transcript",
    subtitle: 'Bedroom Smart Dock — 03:17 AM',
    room: 'bedroom',
    puzzleId: 'security',
    highlight: 'Job went sideways at 02:14 AM. Safe order: TV -> Oven -> CCTV -> Radio.',
    text: VOICEMAIL.lines.join('\n\n'),
  },
  recipe_card: {
    id: 'recipe_card',
    title: "Lucia's Stained Turkey Recipe Card",
    subtitle: 'Kitchen Marble Island',
    room: 'kitchen',
    puzzleId: 'turkey',
    highlight: 'Thaw Setting: 375°F for 45 minutes. (550°F / 90 min = instant fireball)',
    text: 'DECOY THANKSGIVING TURKEY — SAFEHOUSE EDITION\n\n1. Yes, there is a heat-proof titanium canister inside the stuffing.\n2. Do NOT use the Black Friday "Turbo Char" preset unless you want to melt the ceiling sprinklers.\n3. Set Oven Temperature to 375°F.\n4. Set Timer to 45 minutes.\n5. Grab the canister + Security Room Keycard before the smoke alarm wakes the entire coast.',
  },
  fridge_note: {
    id: 'fridge_note',
    title: 'Fridge Magnet Sticky Note',
    subtitle: 'Kitchen Refrigerator',
    room: 'kitchen',
    puzzleId: 'turkey',
    highlight: 'Reminder: 375°F — NOT 550°F. Jason already owes the HOA $12,000.',
    text: 'JASON:\nStop trying to speedrun Thanksgiving at 550°F.\n375°F for 45 min gets the canister out clean.\nAlso buy more oat milk.\n— L.',
  },
  oven_manual: {
    id: 'oven_manual',
    title: 'Black Friday Smart Oven Manual',
    subtitle: 'Kitchen Drawer',
    room: 'kitchen',
    puzzleId: 'turkey',
    highlight: 'Safety Lock releases at 375°F / 45m. Warning: 550°F / 90m voids warranty & triggers sprinkler fine ($25,000).',
    text: 'VICE-CHEF 9000 SMART OVEN\n• Precision Thaw Mode: 375°F | 45 MIN (Recommended for delicate electronics hidden inside poultry).\n• WARNING: Setting temperature to 550°F and timer to 90 MIN activates "Miami Meltdown" mode, causing $25,000 in kitchen smoke damage.',
  },
  bathroom_mirror: {
    id: 'bathroom_mirror',
    title: 'Steamed Bathroom Mirror Note',
    subtitle: 'Bathroom Vanity Mirror',
    room: 'bathroom',
    puzzleId: 'radio',
    highlight: 'Written in condensation: "VICE PIRATE FM — ___.7 MHz (check bedroom nightstand for the first three digits)"',
    text: 'Through the warm shower steam, a finger-traced message glows under the pink vanity LEDs:\n\n"JASON\'S PIRATE SIGNAL:\n___.7 MHz\n(Left the first half in the bedroom nightstand drawer so the feds need cardio.)"',
  },
  nightstand_note: {
    id: 'nightstand_note',
    title: 'Torn Frequency Napkin',
    subtitle: 'Bedroom Nightstand Drawer',
    room: 'bedroom',
    puzzleId: 'radio',
    highlight: 'Club Neon napkin: "104._ MHz — check the steamed bathroom mirror for the decimal!"',
    text: 'Scrawled in neon-pink sharpie on a Club Vice cocktail napkin:\n\n"Station starts with 104._ MHz!\nCombine with the steamed bathroom mirror decimal (.7) and tune the Security Room analog radio to 104.7 MHz."',
  },
  heist_board: {
    id: 'heist_board',
    title: 'Heist Corkboard Timeline',
    subtitle: 'Security Room Wall',
    room: 'security_room',
    puzzleId: 'security',
    highlight: 'Lockdown engaged at 02:14 AM. Any CCTV camera jumping past 02:14 was tampered with!',
    text: 'PENTHOUSE LOCKDOWN LOG:\n• 02:05 AM — Foyer deadbolt sealed.\n• 02:10 AM — Living room motion sensors armed.\n• 02:14 AM — Lucia initiates full lockdown. NO MOVEMENT POSSIBLE AFTER 02:14.\n• NOTE: Check all 4 CCTV feeds for a corrupted timestamp jump after 02:14 AM and flag the anomaly.',
  },
};

export const CCTV_FEEDS = [
  {
    index: 0,
    id: 'cam_foyer',
    name: 'CAM 01 — MAIN FOYER',
    timestamp: '02:14:08 AM',
    status: 'NORMAL',
    anomaly: false,
    caption: 'Reinforced penthouse door sealed. Deadbolt LED solid red. Zero movement.',
  },
  {
    index: 1,
    id: 'cam_living',
    name: 'CAM 02 — LIVING ROOM',
    timestamp: '02:14:11 AM',
    status: 'NORMAL',
    anomaly: false,
    caption: 'Curved sectional sofa intact. TV glowing softly. Rain streaking panoramic glass.',
  },
  {
    index: 2,
    id: 'cam_kitchen',
    name: 'CAM 03 — KITCHEN ISLAND',
    timestamp: '02:14:14 AM',
    status: 'NORMAL',
    anomaly: false,
    caption: 'Marble bar clear. Oven standby clock blinking 02:14. Decoy turkey undisturbed.',
  },
  {
    index: 3,
    id: 'cam_balcony',
    name: 'CAM 04 — NORTH BALCONY',
    timestamp: '02:14:12 -> 02:19:47 AM [ERR]',
    status: 'CORRUPTED JUMP',
    anomaly: true,
    caption: '5-MINUTE TIMECODE SPLICE DETECTED! Shadowy figure drops an encrypted chip by the glass rail, then vanishes in a lightning flash.',
  },
];

export const RADIO_BROADCAST = {
  targetFreq: 104.7,
  stationName: 'VICE PIRATE FM — 104.7 MHz',
  digit: '2',
  transcript: [
    '[STATIC CLEARS — SYNTHWAVE BASSLINE FADES IN]',
    'LUCIA (ENCRYPTED LOOP): "You found 104.7. Good ears."',
    '"Here is the final piece: Safe Digit #4 is [ 2 ]."',
    '"Put them together in order — TV (7), Oven (4), CCTV (9), Radio (2). Punch 7-4-9-2 into the Security Room safe, grab the Master Exit Key, and meet me at the docks."',
    '"And if you already trashed the penthouse... well, grab the crowbar and take the balcony zipline. Try not to scream."',
  ],
  nearbySnippets: [
    { min: 88.0, max: 93.5, text: '...static... "Miami Late-Night Smooth Jazz, for people who definitely aren\'t hiding from helicopters..."' },
    { min: 93.6, max: 99.0, text: '...crackle... "Caller #4, you\'re on the air! Yes, we also think 30fps should be illegal..."' },
    { min: 99.1, max: 103.8, text: '...hiss... "Vice Traffic Watch: Ocean Blvd is flooded with neon reflections and one loose alligator..."' },
    { min: 105.4, max: 108.0, text: '...buzz... "Numbers station? No, that\'s just my cousin reading his fantasy football picks..."' },
  ],
};

export const INSPECT_LINES = {
  coffee_mug: 'A steaming espresso mug left by the rainy window. Still hot enough to peel paint off a sports car.',
  headphones: 'Studio-grade neon headphones. Currently looping lo-fi rain beats to plan federal felonies to.',
  gaming_console: 'A suspiciously expensive custom gaming rig with RGB fans bright enough to guide incoming planes.',
  crystal_lamp: 'An $8,000 designer pink-quartz table lamp. Looks extremely kickable. [F] to make bad decisions.',
  vase_living: 'Hand-blown Venetian glass vase. Lucia said "do not touch." Your inner chaos gremlin disagrees.',
  champagne_bottles: 'Vintage 1998 Vice Reserve champagne. Worth $4,500 a bottle, or $0 once it hits the marble floor.',
  cash_stack: 'Neatly banded heist bills. Tempting, but you need the Master Exit Key before you can spend a dime.',
  bedroom_lamp: 'Warm amber orb lamp. Peak neo-noir interior design. Also very fragile.',
  cctv_monitor_spare: 'A spare CRT monitor displaying nothing but green scanlines and questionable life choices.',
  curved_sofa: 'Plush white curved sectional sofa. Costs more than a compact sedan. Zero coffee stains... so far.',
  balcony_escape_ledge: '28 stories above rain-slicked Ocean Boulevard. There is an emergency maintenance cable — totally insane, unless you have a Crowbar or $35,000 in penthouse damage.',
  default: 'High-end Vice City decor. Looks expensive enough to ruin someone\'s insurance premium.',
};

export const ENDINGS = {
  CLEAN_GETAWAY: {
    id: 'CLEAN_GETAWAY',
    title: 'CLEAN GETAWAY',
    subtitle: 'GHOST OF OCEAN BOULEVARD',
    badge: 'ENDING 01 / 03 — STEALTH MASTER',
    accent: '#00f0ff',
    secondary: '#ff2a85',
    sfx: 'ending_clean',
    shareTagline: 'Slipped out of Lucia\'s penthouse without waking the coast.',
    beats: [
      {
        heading: '04:02 AM — MAIN ENTRANCE UNLOCKED',
        text: 'The heavy brass deadbolt clicks back with surgical precision. Not a single alarm tripped. The hallway is dead silent.',
      },
      {
        heading: 'PRIVATE ELEVATOR TO GARAGE B2',
        text: 'You step out into the rain-slicked neon night. Lucia\'s midnight-purple coupe idles behind the palm trees, headlights cutting through the mist.',
      },
      {
        heading: 'ZERO TRACE LEFT BEHIND',
        text: 'Lucia glances at the penthouse security tablet. "Wait — you actually didn\'t break the crystal lamp OR burn the turkey? Who are you?"',
      },
    ],
    punchline: 'By sunrise, you\'re fifty miles down the coast with the cash, the key, and your security deposit intact.',
  },
  TOTAL_CHAOS: {
    id: 'TOTAL_CHAOS',
    title: 'TOTAL CHAOS',
    subtitle: 'MIAMI INSURANCE NIGHTMARE',
    badge: 'ENDING 02 / 03 — CERTIFIED MENACE',
    accent: '#ff3b5c',
    secondary: '#ffb020',
    sfx: 'ending_chaos',
    shareTagline: 'Turned a $4M Vice City penthouse into a felony fireworks show.',
    beats: [
      {
        heading: '04:05 AM — SPRINKLERS, SIRENS & SHATTERED GLASS',
        text: 'Smoke billows out of the panoramic windows as every designer lamp, vase, and holiday poultry item in the penthouse meets its tragic end.',
      },
      {
        heading: 'THE BALCONY ZIPLINE MANEUVER',
        text: 'Sirens wail twenty-eight floors below. You hook the neon-pink crowbar onto the maintenance cable and launch straight into the tropical storm.',
      },
      {
        heading: 'NEWS CHOPPER LIVE AT FIVE',
        text: 'Lucia watches you swing past a neon billboard on live television. "Unbelievable. We are NEVER getting our deposit back."',
      },
    ],
    punchline: 'You escaped! Mostly in one piece, definitely on the evening news, and permanently banned from luxury real estate.',
  },
  INTERNET_VICTIM: {
    id: 'INTERNET_VICTIM',
    title: 'INTERNET VICTIM',
    subtitle: 'LOST TO THE COMMENT SECTION',
    badge: 'ENDING 03 / 03 — TERMINALLY ONLINE',
    accent: '#a855f7',
    secondary: '#ff2a85',
    sfx: 'ending_internet',
    shareTagline: 'Forgot to escape the heist because someone was wrong about 30 FPS.',
    beats: [
      {
        heading: '04:18 AM — "JUST ONE MORE REPLY"',
        text: 'You meant to check the TV for a clue. Instead, @CinemaPurist_99 called your take "mid" and now you are twelve paragraphs deep into frame-pacing theory.',
      },
      {
        heading: '06:45 AM — SUNRISE OVER VICE BAY',
        text: 'The storm clears. Lucia texts you 19 times. The police knock politely at the front door. You ask them to hold on while you cite a benchmark chart.',
      },
      {
        heading: 'RATIO\'D BY REALITY',
        text: 'The officers escort you out in handcuffs. On the bright side, your 6-part thread just hit 400 likes and 1,900 angry quote-posts.',
      },
    ],
    punchline: 'You didn\'t escape the safehouse, but you definitely won an argument against a bot account. Worth it?',
  },
};

export function getCurrentObjective(state) {
  const { puzzles, flags, inventory, doors } = state;
  const hasItem = (id) => inventory.some((i) => i.id === id);

  if (flags.endingTriggered) {
    return 'Escape sequence in progress...';
  }
  if (hasItem('master_exit_key') || puzzles.safe.solved) {
    return 'Unlock the Main Entrance door in the East Foyer (or go full chaos on the Balcony).';
  }

  const remainingDigits = [];
  if (!puzzles.tv.solved) {
    remainingDigits.push(hasItem('tv_remote') ? 'Living Room TV (Digit #1)' : 'TV Remote & Living Room TV (Digit #1)');
  }
  if (!puzzles.turkey.solved) {
    remainingDigits.push('Kitchen Oven (Digit #2 + Keycard)');
  }
  if (!puzzles.security.solved) {
    remainingDigits.push('CCTV Terminal (Digit #3)');
  }
  if (!puzzles.radio.solved) {
    remainingDigits.push('Analog Radio (Digit #4)');
  }

  // All 4 code digits discovered -> open the Wall Safe
  if (remainingDigits.length === 0) {
    return 'Combine all 4 digits (TV -> Oven -> CCTV -> Radio) on the Security Room Wall Safe.';
  }

  // Very beginning of a fresh run before any progress
  const anyProgress =
    puzzles.tv.solved ||
    puzzles.turkey.solved ||
    puzzles.security.solved ||
    puzzles.radio.solved ||
    hasItem('tv_remote') ||
    hasItem('security_keycard') ||
    flags.voicemailHeard;

  if (!anyProgress) {
    return 'Check Lucia\'s Voicemail Dock in the Bedroom, or grab the TV Remote in the Living Room.';
  }

  const securityUnlocked = hasItem('security_keycard') || (doors?.door_security && !doors.door_security.locked);

  // If Security Room is still locked and Turkey isn't solved, prioritize accessible puzzles
  if (!securityUnlocked && !puzzles.turkey.solved) {
    if (!puzzles.tv.solved) {
      return hasItem('tv_remote')
        ? 'Use the 4K Smart TV in the Living Room for Digit #1, then thaw the Kitchen Turkey.'
        : 'Grab the TV Remote on the coffee table for Digit #1, or inspect the Kitchen Oven.';
    }
    return 'Inspect the Kitchen clues and set the Oven to thaw the decoy turkey (Digit #2 + Security Keycard).';
  }

  // Otherwise (any order of solved puzzles), list the exact remaining digit puzzles
  if (remainingDigits.length === 1) {
    return `Final digit remaining — solve: ${remainingDigits[0]}.`;
  }
  return `Remaining safe digits (${4 - remainingDigits.length}/4): ${remainingDigits.join(' • ')}.`;
}
