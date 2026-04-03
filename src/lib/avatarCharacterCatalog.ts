/** Creative directions for avatar / Lively (English labels). Used in editor inspiration grid; optional future: sponsored skins. */

export type AvatarCharacterCategory = 'animal' | 'profession' | 'robot' | 'sci_fi' | 'fantasy' | 'brand_ready';

export type AvatarCharacterEntry = {
  id: string;
  labelEn: string;
  category: AvatarCharacterCategory;
};

export const AVATAR_CHARACTER_CATEGORIES: { id: AvatarCharacterCategory; labelEn: string }[] = [
  { id: 'animal', labelEn: 'Animals' },
  { id: 'profession', labelEn: 'Professions' },
  { id: 'robot', labelEn: 'Robots' },
  { id: 'sci_fi', labelEn: 'Sci‑fi' },
  { id: 'fantasy', labelEn: 'Fantasy' },
  { id: 'brand_ready', labelEn: 'Brand‑ready' },
];

/** 50 preset identities — pair with your photo in Identity Lab / floating preset. */
export const AVATAR_CHARACTER_CATALOG: AvatarCharacterEntry[] = [
  { id: 'fox_guide', labelEn: 'Clever fox guide', category: 'animal' },
  { id: 'owl_sage', labelEn: 'Night owl sage', category: 'animal' },
  { id: 'tiger_host', labelEn: 'Tiger host', category: 'animal' },
  { id: 'penguin_welcome', labelEn: 'Penguin greeter', category: 'animal' },
  { id: 'dolphin_coach', labelEn: 'Dolphin coach', category: 'animal' },
  { id: 'eagle_vision', labelEn: 'Eagle strategist', category: 'animal' },
  { id: 'bear_calm', labelEn: 'Calm bear', category: 'animal' },
  { id: 'house_cat', labelEn: 'Curious cat', category: 'animal' },
  { id: 'loyal_dog', labelEn: 'Loyal dog', category: 'animal' },
  { id: 'rabbit_quick', labelEn: 'Quick rabbit', category: 'animal' },
  { id: 'panda_chill', labelEn: 'Chill panda', category: 'animal' },
  { id: 'koala_soft', labelEn: 'Soft koala', category: 'animal' },
  { id: 'lion_pride', labelEn: 'Lion presenter', category: 'animal' },
  { id: 'wolf_pack', labelEn: 'Wolf pack lead', category: 'animal' },
  { id: 'doctor_care', labelEn: 'Careful doctor', category: 'profession' },
  { id: 'pilot_sky', labelEn: 'Airline pilot', category: 'profession' },
  { id: 'chef_taste', labelEn: 'Chef host', category: 'profession' },
  { id: 'astronaut_orbit', labelEn: 'Astronaut', category: 'profession' },
  { id: 'scientist_lab', labelEn: 'Lab scientist', category: 'profession' },
  { id: 'teacher_kind', labelEn: 'Kind teacher', category: 'profession' },
  { id: 'lawyer_sharp', labelEn: 'Sharp lawyer', category: 'profession' },
  { id: 'firefighter_hero', labelEn: 'Firefighter', category: 'profession' },
  { id: 'officer_trust', labelEn: 'Trust officer', category: 'profession' },
  { id: 'mechanic_fix', labelEn: 'Mechanic', category: 'profession' },
  { id: 'artist_muse', labelEn: 'Studio artist', category: 'profession' },
  { id: 'musician_beat', labelEn: 'Musician', category: 'profession' },
  { id: 'athlete_drive', labelEn: 'Pro athlete', category: 'profession' },
  { id: 'banker_clear', labelEn: 'Clear banker', category: 'profession' },
  { id: 'dev_code', labelEn: 'Friendly developer', category: 'profession' },
  { id: 'news_anchor', labelEn: 'News anchor', category: 'profession' },
  { id: 'android_smooth', labelEn: 'Smooth android', category: 'robot' },
  { id: 'retro_bot', labelEn: 'Retro tin robot', category: 'robot' },
  { id: 'mech_pilot', labelEn: 'Mech pilot', category: 'robot' },
  { id: 'drone_host', labelEn: 'Drone host', category: 'robot' },
  { id: 'holo_guide', labelEn: 'Hologram guide', category: 'robot' },
  { id: 'monkey_robot', labelEn: 'Monkey robot', category: 'robot' },
  { id: 'alien_curious', labelEn: 'Curious alien', category: 'sci_fi' },
  { id: 'cyborg_edge', labelEn: 'Street cyborg', category: 'sci_fi' },
  { id: 'space_ranger', labelEn: 'Space ranger', category: 'sci_fi' },
  { id: 'time_traveler', labelEn: 'Time traveler', category: 'sci_fi' },
  { id: 'et_ambassador', labelEn: 'E.T. ambassador', category: 'sci_fi' },
  { id: 'wizard_wise', labelEn: 'Wise wizard', category: 'fantasy' },
  { id: 'knight_honor', labelEn: 'Knight of honor', category: 'fantasy' },
  { id: 'dragon_smile', labelEn: 'Friendly dragon', category: 'fantasy' },
  { id: 'elf_eloquent', labelEn: 'Eloquent elf', category: 'fantasy' },
  { id: 'vampire_chic', labelEn: 'Chic vampire', category: 'fantasy' },
  { id: 'jersey_sponsor', labelEn: 'Sponsored jersey look', category: 'brand_ready' },
  { id: 'airline_cabin', labelEn: 'Airline cabin mood', category: 'brand_ready' },
  { id: 'product_launch', labelEn: 'Product launch host', category: 'brand_ready' },
  { id: 'can_mini', labelEn: 'Mini‑can mascot', category: 'brand_ready' },
];

export function catalogByCategory(cat: AvatarCharacterCategory): AvatarCharacterEntry[] {
  return AVATAR_CHARACTER_CATALOG.filter((x) => x.category === cat);
}
