// Tous les chiffres d'équilibrage du jeu, réunis ici (pur, sans DOM). Les autres modules les importent et les ré-exportent.
// Valeurs et formules : voir le tableau de docs/GAME_DESIGN.md.

// Progression par étage
export const KILLS_PER_STAGE = 5;

// Statistiques du héros
export const BASE_ATTACK = 8, ATTACK_PER_WEAPON = 4, ATTACK_PER_LEVEL = 2;
export const BASE_HEALTH = 100, HEALTH_PER_ARMOR = 35, HEALTH_PER_LEVEL = 10;
export const BASE_REWARD = 8, REWARD_PER_STAGE = 3, REWARD_PER_LUCK = 3;

// Améliorations
export const BASE_COSTS = { weapon: 24, armor: 30, luck: 40 };
export const COST_GROWTH = 1.6;

// Expérience, gardien, soins, ennemis
export const XP_PER_LEVEL = 35;
export const XP_ENEMY = 10, XP_BOSS = 40;
export const BOSS_GOLD_MULT = 8, BOSS_HP_MULT = 5;
export const HEAL_ON_VICTORY = 8, HEAL_ON_ARMOR = 35;
export const ENEMY_BASE_HP = 32, ENEMY_HP_PER_STAGE = 14;

// Ennemis normaux de la forêt : multiplicateurs de PV, de riposte et d'or. Le type courant est une fonction pure de
// l'état persisté (voir `enemyKind` dans combat.js) ; le gardien ignore ces valeurs.
export const ENEMY_KINDS = ['eclaireur', 'pillard', 'traqueur'];
export const ENEMY_CATALOG = {
  eclaireur: { name: 'Éclaireur gobelin', hp: 1, retaliation: 1, gold: 1 },
  pillard: { name: 'Pillard des Murmures', hp: 0.7, retaliation: 1.4, gold: 1.2 },
  traqueur: { name: 'Traqueur des sous-bois', hp: 1.3, retaliation: 0.8, gold: 1.3 },
};

// Riposte : (base + étage × croissance − armure × réduction), au moins 1
export const RETALIATION_BASE = 3, RETALIATION_BOSS_BASE = 10;
export const RETALIATION_PER_STAGE = 1.4, RETALIATION_ARMOR_REDUCTION = 1.5;

// Rythme du combat et compétence
export const ATTACK_INTERVAL_MS = 1200;
export const SKILL_MULT = 4, SKILL_COOLDOWN_SECONDS = 15;

// Absence
export const OFFLINE_CAP_SECONDS = 28800;
export const OFFLINE_PANEL_MIN_SECONDS = 60;
export const OFFLINE_FIGHT_FACTOR = 1.2;

// Équipement (M3.1) : 3 emplacements, 3 raretés. Valeur d'un bonus = floor(base × multiplicateur de rareté × (1 + croissance × (niveau − 1))),
// au moins 1 ; le niveau d'objet suit l'étape du jeu. Chances de butin documentées dans docs/GAME_DESIGN.md.
export const EQUIPMENT_SLOTS = ['arme', 'armure', 'charme'];
export const EQUIPMENT_RARITIES = ['commun', 'rare', 'epique'];
export const EQUIPMENT_RARITY_MULT = { commun: 1, rare: 1.6, epique: 2.5 };
export const EQUIPMENT_LEVEL_GROWTH = 0.15;
export const EQUIPMENT_BASE = {
  arme: { attaque: 3 },
  armure: { vieMax: 20, reductionRiposte: 1 },
  charme: { or: 2 },
};
export const INVENTORY_CAP = 24;
export const LOOT_DROP_CHANCE = 0.12;
export const LOOT_RARITY_WEIGHTS = { commun: 75, rare: 22, epique: 3 };
export const LOOT_BOSS_RARITY_WEIGHTS = { rare: 85, epique: 15 };
// Butin (M3.2a) : or obtenu quand l'inventaire plein force la conversion de l'objet de moindre rareté.
export const LOOT_CONVERSION_GOLD = { commun: 5, rare: 15, epique: 40 };
// Butin hors ligne : espérance du tirage (victoires × chance de drop), arrondie bas, plafonnée ; jamais d'épique.
export const OFFLINE_LOOT_CAP = 6;

// Recyclage et amélioration (M3.3). Recyclage : or = floor(base de rareté × (1 + croissance × (niveau − 1))) ; confirmation pour rare, épique
// et tout objet amélioré. La base reprend LOOT_CONVERSION_GOLD : recycler à la main ne rapporte jamais moins que laisser l'inventaire déborder.
// Amélioration : un commun +1 (20 or) vaut ~2 victoires à l'étage 1 (11 or) ; +5 coûte 315 or cumulés, soit ~29 victoires : un vrai investissement.
export const RECYCLE_GOLD_BASE = { ...LOOT_CONVERSION_GOLD };
export const RECYCLE_LEVEL_GROWTH = 0.15;
export const RECYCLE_CONFIRM_RARITIES = ['rare', 'epique'];
// Amélioration : jusqu'à +EQUIPMENT_UPGRADE_MAX ; coût du niveau suivant = floor(base de rareté × COST_GROWTH ^ niveau actuel).
// Chaque niveau ajoute le bonus fixe ci-dessous aux statistiques présentes sur l'objet.
export const EQUIPMENT_UPGRADE_MAX = 5;
export const EQUIPMENT_UPGRADE_BASE_COST = { commun: 20, rare: 45, epique: 90 };
export const EQUIPMENT_UPGRADE_STAT = { attaque: 1, vieMax: 4, reductionRiposte: 0, or: 1 };

// Talents (M3.5a) : 1 point au niveau 3 puis 1 tous les 3 niveaux (points = floor((niveau − 1) / TALENT_LEVELS_PER_POINT)), 3 rangs maximum par talent.
// Effets par rang : attaque et vie max en multiplicateur (arrondi), soin de victoire en or fixe, or de victoire en multiplicateur, recharge en secondes.
export const TALENT_LEVELS_PER_POINT = 3, TALENT_MAX_RANK = 3;
export const TALENT_IDS = ['assaut', 'rempart', 'fortune', 'braise'];
export const TALENT_ASSAULT_ATTACK = 0.1;
export const TALENT_RAMPART_HEALTH = 0.08, TALENT_RAMPART_HEAL = 3;
export const TALENT_FORTUNE_GOLD = 0.1;
export const TALENT_BRAISE_COOLDOWN = 2;
