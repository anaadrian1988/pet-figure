export type AccessoryPreset = {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  /** Describes the outfit and accessories added to the figure. */
  prompt: string;
};

export const PRESETS: AccessoryPreset[] = [
  {
    id: "superhero",
    label: "Superhero",
    emoji: "🦸",
    tagline: "Super Hero Edition",
    prompt: "wearing a flowing red superhero cape and a small eye mask, with a lightning-bolt chest emblem",
  },
  {
    id: "astronaut",
    label: "Astronaut",
    emoji: "🚀",
    tagline: "Space Explorer",
    prompt: "wearing a white astronaut suit with a clear bubble helmet, holding a tiny flag, with a mini rocket accessory beside it",
  },
  {
    id: "wizard",
    label: "Wizard",
    emoji: "🧙",
    tagline: "Magic Master",
    prompt: "wearing a starry purple wizard robe and pointed hat, holding a glowing wand, with a tiny spell book accessory",
  },
  {
    id: "knight",
    label: "Knight",
    emoji: "🛡️",
    tagline: "Royal Guard",
    prompt: "wearing shiny silver knight armour with a red plume helmet, holding a small sword and a crest shield",
  },
  {
    id: "rockstar",
    label: "Rock Star",
    emoji: "🎸",
    tagline: "World Tour",
    prompt: "wearing a black leather jacket and sunglasses, holding a tiny electric guitar, with a mini amplifier accessory",
  },
  {
    id: "chef",
    label: "Chef",
    emoji: "👨‍🍳",
    tagline: "Master Chef",
    prompt: "wearing a white chef's coat and tall chef hat, holding a tiny whisk, with a mini frying pan and cupcake accessories",
  },
];

export function getPreset(id: string): AccessoryPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function buildPrompt(preset: AccessoryPreset): string {
  return [
    "Turn the pet in this photo into a collectible plastic action figure displayed inside a retro toy blister package.",
    "Keep the pet's exact breed, fur colours, markings and face so it is clearly recognisable.",
    `The figure is ${preset.prompt}.`,
    "Glossy injection-moulded plastic look, visible joint articulation, studio product photography, soft shadows.",
    "The figure stands centred in a clear moulded plastic bubble on a bright illustrated cardboard backing card.",
    "Leave the top fifth of the image as plain cardboard with no text, logos or lettering anywhere in the image.",
  ].join(" ");
}
