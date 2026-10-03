export type BodyType = 'male' | 'female';

export interface CharacterLayerSet {
  back?: string;
  main?: string;
  front?: string;
}

export interface CharacterAppearance {
  body: string;
  hair?: string | CharacterLayerSet;
  clothing?: string | CharacterLayerSet;
}

export type SkillKey =
  | 'firearms'
  | 'close_combat'
  | 'survivability'
  | 'salvaging'
  | 'metalworking'
  | 'fabrication'
  | 'fishing'
  | 'cooking';

export type Panel = 'world' | 'inventory' | 'equipment' | 'skills' | 'journal' | 'comms' | 'map';
export type RoomId = 'glassmarket' | 'breaker-yard' | 'south-dock-pier';

export type ActionType =
  | 'goto-breaker-yard'
  | 'goto-south-dock-pier'
  | 'goto-glassmarket'
  | 'start-salvaging'
  | 'start-fishing-net'
  | 'start-fishing-rod'
  | 'reset-node'
  | 'inspect-board'
  | 'open-vendor'
  | 'buy-powered-salvage-bar'
  | 'sell-metal-scrap';

export type EquipmentSlot = 'main_hand' | 'off_hand' | 'head' | 'torso' | 'legs' | 'boots';

export type ItemKey =
  | 'salvage_bar'
  | 'metal_scrap'
  | 'composite_scrap'
  | 'uncooked_shrimp'
  | 'cooked_shrimp'
  | 'sardine'
  | 'copper_coils'
  | 'portable_induction_pad'
  | 'fishing_net'
  | 'fishing_rod'
  | 't1_light_armor';

export type TrackedInventoryName =
  | 'Tier 1 Metal Scrap'
  | 'Tier 1 Composite Scrap'
  | 'Uncooked Shrimp'
  | 'Sardine'
  | 'Cooked Shrimp'
  | 'Copper Coils';

export interface CharacterSkill { skill_key: SkillKey; level: number; xp: number; }

export interface StoredCharacterProgress {
  version: 1;
  inventory: InventoryEntry[];
  equipment: Record<EquipmentSlot, ItemKey | null>;
  skills: CharacterSkill[];
  cooking?: { active: boolean; ticksRemaining: number; inventoryIndex: number | null; };
}

export interface Character {
  id: string;
  account_id: string;
  name: string;
  body_type: BodyType;
  appearance_skipped: boolean;
  location_id: string;
  credits: number;
  health: number;
  max_health: number;
  progress?: StoredCharacterProgress | null;
}

export interface RoomAction { label: string; detail: string; type: ActionType; }
export interface Room {
  id: RoomId; district: string; name: string; slogan: string; description: string;
  sceneImage?: string; actions: RoomAction[];
}

export interface ItemDefinition {
  key: ItemKey; name: string; description: string; panelDescription?: string;
  asset: string; stackable: boolean; usable?: boolean; equipmentSlot?: EquipmentSlot;
  defense?: number; toolType?: 'salvage'; toolTier?: number;
}

export type InventoryItem = { item: ItemKey; quantity: number };
export type InventoryEntry = InventoryItem | null;
export type InventoryTotals = Record<TrackedInventoryName, number>;

export interface SalvageState {
  active: boolean; intervalId: number | null; xpPerTick: number; requirement: number;
  remainingTicks: number; maxTicks: number; resetTimeoutId: number | null;
}

export type FishingMethod = 'net' | 'rod';
export type WaterType = 'freshwater' | 'saltwater';
export interface FishingState { active: boolean; method: FishingMethod | null; intervalId: number | null; }
export interface CookingState { active: boolean; intervalId: number | null; ticksRemaining: number; inventoryIndex: number | null; }

export interface GameState {
  character: Character | null; skills: CharacterSkill[]; panel: Panel; roomId: RoomId;
  logs: string[]; inventorySlots: InventoryEntry[]; equipment: Record<EquipmentSlot, ItemKey | null>;
  inventoryTotals: InventoryTotals; mobileInventoryPage: number; salvage: SalvageState;
  fishing: FishingState; cooking: CookingState;
}

export type SaveProgress = () => void | Promise<unknown>;
export type LogMessage = (message: string) => void;
