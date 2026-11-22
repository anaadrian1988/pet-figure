export type PackCategory = "heroes" | "fantasy" | "jobs" | "music-sports" | "seasonal";

export const CATEGORIES: { id: PackCategory; label: string }[] = [
  { id: "heroes", label: "Heroes" },
  { id: "fantasy", label: "Fantasy" },
  { id: "jobs", label: "Jobs" },
  { id: "music-sports", label: "Music & Sport" },
  { id: "seasonal", label: "Seasonal" },
];

export type AccessoryPack = {
  /** Stable ID, stored with each figure. Never rename an existing one. */
  id: string;
  label: string;
  emoji: string;
  category: PackCategory;
  /** Shown in the starburst on the card. */
  tagline: string;
  /** Themed backdrop on the backing card behind the figure (details still vary per figure). */
  scene: string;
  /** Describes the outfit and accessories added to the pet figure. */
  prompt: string;
};

export const PRESETS: AccessoryPack[] = [
  // Heroes & Adventure
  {
    id: "superhero",
    label: "Superhero",
    emoji: "🦸",
    category: "heroes",
    tagline: "Super Hero Edition",
    scene: "a comic-book city skyline at sunset with bold rooftops",
    prompt: "wearing a flowing red superhero cape and a small eye mask, with a lightning-bolt chest emblem",
  },
  {
    id: "astronaut",
    label: "Astronaut",
    emoji: "🚀",
    category: "heroes",
    tagline: "Space Explorer",
    scene: "outer space with planets, stars and a distant moon",
    prompt: "wearing a white astronaut suit with a clear bubble helmet, holding a tiny flag, with a mini rocket accessory beside it",
  },
  {
    id: "knight",
    label: "Knight",
    emoji: "🛡️",
    category: "heroes",
    tagline: "Royal Guard",
    scene: "a medieval castle with stone towers and colourful banners",
    prompt: "wearing shiny silver knight armour with a red plume helmet, holding a small sword and a crest shield",
  },
  {
    id: "pirate",
    label: "Pirate",
    emoji: "🏴‍☠️",
    category: "heroes",
    tagline: "Captain of the Seas",
    scene: "a tropical sea with a pirate ship and a treasure island",
    prompt: "wearing a pirate captain's coat and tricorn hat with an eye patch, holding a tiny cutlass, with a mini treasure chest beside it",
  },
  {
    id: "ninja",
    label: "Ninja",
    emoji: "🥷",
    category: "heroes",
    tagline: "Shadow Warrior",
    scene: "a moonlit Japanese temple roof with cherry blossoms",
    prompt: "wearing a black ninja outfit with a red headband, holding tiny throwing stars, with a mini katana on its back",
  },
  {
    id: "cowboy",
    label: "Cowboy",
    emoji: "🤠",
    category: "heroes",
    tagline: "Wild West Sheriff",
    scene: "a desert canyon at sunset with cacti",
    prompt: "wearing a brown cowboy hat, a leather vest with a gold sheriff star and a red bandana, holding a tiny lasso",
  },
  {
    id: "viking",
    label: "Viking",
    emoji: "🪓",
    category: "heroes",
    tagline: "Norse Legend",
    scene: "a snowy fjord with a longship and mountains",
    prompt: "wearing a horned viking helmet and a fur cloak, holding a small round wooden shield and a tiny axe",
  },

  // Fantasy
  {
    id: "wizard",
    label: "Wizard",
    emoji: "🧙",
    category: "fantasy",
    tagline: "Magic Master",
    scene: "a magical castle library with floating candles and starry skies",
    prompt: "wearing a starry purple wizard robe and pointed hat, holding a glowing wand, with a tiny spell book accessory",
  },
  {
    id: "fairy",
    label: "Fairy",
    emoji: "🧚",
    category: "fantasy",
    tagline: "Enchanted Forest",
    scene: "an enchanted forest glade with glowing mushrooms and flowers",
    prompt: "wearing sparkly translucent fairy wings and a flower crown, holding a tiny star-tipped wand",
  },
  {
    id: "dragon-tamer",
    label: "Dragon Tamer",
    emoji: "🐉",
    category: "fantasy",
    tagline: "Dragon Rider",
    scene: "dragon mountains with misty cliffs and a sunset sky",
    prompt: "wearing adventurer leather armour and goggles, with a small friendly green baby dragon perched on its shoulder",
  },
  {
    id: "mermaid",
    label: "Mermaid",
    emoji: "🧜",
    category: "fantasy",
    tagline: "Ocean Royalty",
    scene: "an underwater coral reef with bubbles and tropical fish",
    prompt: "with a shimmering teal mermaid tail and a seashell crown, holding a tiny golden trident",
  },

  // Jobs
  {
    id: "chef",
    label: "Chef",
    emoji: "👨‍🍳",
    category: "jobs",
    tagline: "Master Chef",
    scene: "a bright restaurant kitchen with copper pans",
    prompt: "wearing a white chef's coat and tall chef hat, holding a tiny whisk, with a mini frying pan and cupcake accessories",
  },
  {
    id: "firefighter",
    label: "Firefighter",
    emoji: "🧑‍🚒",
    category: "jobs",
    tagline: "Rescue Hero",
    scene: "a red fire station with a fire truck",
    prompt: "wearing a yellow firefighter jacket and red helmet, holding a small fire hose, with a mini fire extinguisher beside it",
  },
  {
    id: "doctor",
    label: "Doctor",
    emoji: "🩺",
    category: "jobs",
    tagline: "Dr. On Call",
    scene: "a bright, friendly hospital corridor",
    prompt: "wearing a white doctor's coat with a stethoscope around its neck, holding a tiny clipboard, with a mini first-aid kit",
  },
  {
    id: "detective",
    label: "Detective",
    emoji: "🕵️",
    category: "jobs",
    tagline: "Case Closed",
    scene: "a foggy old London street with gas lamps",
    prompt: "wearing a tan trench coat and deerstalker hat, holding a magnifying glass, with a tiny notebook",
  },
  {
    id: "scientist",
    label: "Scientist",
    emoji: "🧪",
    category: "jobs",
    tagline: "Genius Lab",
    scene: "a colourful laboratory with bubbling flasks",
    prompt: "wearing a white lab coat and safety goggles, holding a bubbling test tube, with a mini microscope beside it",
  },
  {
    id: "pilot",
    label: "Pilot",
    emoji: "✈️",
    category: "jobs",
    tagline: "Sky Captain",
    scene: "a blue sky with clouds and an airfield runway",
    prompt: "wearing a navy pilot uniform with gold wings badge and a captain's cap, with a mini propeller plane beside it",
  },

  // Music & Sports
  {
    id: "rockstar",
    label: "Rock Star",
    emoji: "🎸",
    category: "music-sports",
    tagline: "World Tour",
    scene: "a concert stage with spotlights and a cheering crowd",
    prompt: "wearing a black leather jacket and sunglasses, holding a tiny electric guitar, with a mini amplifier accessory",
  },
  {
    id: "dj",
    label: "DJ",
    emoji: "🎧",
    category: "music-sports",
    tagline: "Party Mode",
    scene: "a neon nightclub with colourful lights",
    prompt: "wearing big headphones and a colourful bomber jacket, with a mini DJ turntable deck in front of it",
  },
  {
    id: "footballer",
    label: "Footballer",
    emoji: "⚽",
    category: "music-sports",
    tagline: "Match Day",
    scene: "a football stadium with a green pitch and floodlights",
    prompt: "wearing a plain red football jersey and shorts with shin guards, with a mini football at its feet and a tiny trophy",
  },
  {
    id: "basketball",
    label: "Basketball",
    emoji: "🏀",
    category: "music-sports",
    tagline: "Slam Dunk",
    scene: "an indoor basketball court with a scoreboard",
    prompt: "wearing a plain blue basketball jersey and a sweatband, holding a mini basketball, with a tiny hoop beside it",
  },
  {
    id: "skater",
    label: "Skater",
    emoji: "🛹",
    category: "music-sports",
    tagline: "Street Style",
    scene: "a sunny skate park with graffiti walls",
    prompt: "wearing a backwards cap, a hoodie and knee pads, standing on a tiny colourful skateboard",
  },

  // Seasonal
  {
    id: "santa",
    label: "Santa",
    emoji: "🎅",
    category: "seasonal",
    tagline: "Holiday Edition",
    scene: "a snowy winter village with a decorated Christmas tree",
    prompt: "wearing a red Santa suit and hat with white fur trim, with a mini sack of wrapped presents beside it",
  },
  {
    id: "witch",
    label: "Halloween Witch",
    emoji: "🎃",
    category: "seasonal",
    tagline: "Spooky Season",
    scene: "a spooky Halloween night with a full moon and pumpkins",
    prompt: "wearing a black witch hat and a purple cape, riding a tiny broomstick, with a mini carved pumpkin beside it",
  },
];

/** Shown as tiles in the form; the rest are in the "See all packs" picker. */
export const POPULAR_PACK_IDS = ["superhero", "astronaut", "wizard", "knight", "rockstar", "chef"];

export function getPreset(id: string): AccessoryPack | undefined {
  return PRESETS.find((p) => p.id === id);
}


export function buildPrompt(preset: AccessoryPack): string {
  return [
    "Turn the pet in this photo into a collectible plastic action figure displayed inside a retro toy blister package.",
    "Keep the pet's exact breed, fur colours, markings and face so it is clearly recognisable.",
    `The figure is ${preset.prompt}.`,
    "Glossy injection-moulded plastic look, visible joint articulation, studio product photography, soft shadows.",
    "The figure stands centred in a clear moulded plastic bubble on a bright illustrated cardboard backing card.",
    `The backing card behind the bubble shows an illustrated background of ${preset.scene}, matching the costume theme.`,
    "Leave the top fifth of the image as plain cardboard with no text, logos or lettering anywhere in the image.",
  ].join(" ");
}

