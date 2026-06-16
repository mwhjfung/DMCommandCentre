import { getSetting, setSetting } from '@/lib/db/content'
import { useContentStore } from '@/lib/store/contentStore'
import type { FeatData } from '@/types/content'

const SEED_FLAG = 'feats-seeded-v2'

interface FeatDef {
  name: string
  prerequisite?: string
  description: string
  effects?: Partial<Pick<FeatData, 'initiativeBonus' | 'acBonus' | 'speedBonus' | 'passivePerceptionBonus' | 'passiveInvestigationBonus'>>
}

const FEATS: FeatDef[] = [
  {
    name: 'Alert',
    description:
      'Always on the lookout for danger, you gain the following benefits:\n\n• You gain a +5 bonus to initiative.\n• You can\'t be surprised while you are conscious.\n• Other creatures don\'t gain advantage on attack rolls against you as a result of being unseen by you.',
    effects: { initiativeBonus: 5 }
  },
  {
    name: 'Mobile',
    description:
      'You are exceptionally speedy and agile. You gain the following benefits:\n\n• Your speed increases by 10 feet.\n• When you use the Dash action, difficult terrain doesn\'t cost you extra movement on that turn.\n• When you make a melee attack against a creature, you don\'t provoke opportunity attacks from that creature for the rest of the turn, whether or not you hit.',
    effects: { speedBonus: 10 }
  },
  {
    name: 'Observant',
    prerequisite: '4th level',
    description:
      'Quick to notice details of your environment, you gain the following benefits:\n\n• If you can see a creature\'s mouth while it is speaking a language you understand, you can interpret what it\'s saying by reading its lips.\n• You have a +5 bonus to your passive Wisdom (Perception) and passive Intelligence (Investigation) scores.',
    effects: { passivePerceptionBonus: 5, passiveInvestigationBonus: 5 }
  },
  {
    name: 'War Caster',
    prerequisite: 'The ability to cast at least one spell',
    description:
      'You have practiced casting spells in the midst of combat, learning techniques that grant you the following benefits:\n\n• You have advantage on Constitution saving throws that you make to maintain your concentration on a spell when you take damage.\n• You can perform the somatic components of spells even when you have weapons or a shield in one or both hands.\n• When a hostile creature\'s movement provokes an opportunity attack from you, you can use your reaction to cast a spell at the creature, rather than making an opportunity attack.'
  },
  {
    name: 'Lucky',
    description:
      'You have inexplicable luck that seems to kick in at just the right moment. You have 3 luck points. Whenever you make an attack roll, ability check, or saving throw, you can spend one luck point to roll an additional d20. You can choose to spend one of your luck points after you roll the die, but before the outcome is determined. You regain your expended luck points when you finish a long rest.'
  },
  {
    name: 'Tough',
    description:
      'Your hit point maximum increases by an amount equal to twice your level when you gain this feat. Whenever you gain a level thereafter, your hit point maximum increases by an additional 2 hit points.'
  },
  {
    name: 'Sentinel',
    prerequisite: '4th level',
    description:
      'You have mastered techniques to take advantage of every drop in any enemy\'s guard, gaining the following benefits:\n\n• When you hit a creature with an opportunity attack, the creature\'s speed becomes 0 for the rest of the turn.\n• Creatures provoke opportunity attacks from you even if they take the Disengage action before leaving your reach.\n• When a creature within 5 feet of you makes an attack against a target other than you (and that target doesn\'t have this feat), you can use your reaction to make a melee weapon attack against the attacking creature.'
  },
  {
    name: 'Polearm Master',
    description:
      'You can keep your enemies at bay with reach weapons. You gain the following benefits:\n\n• When you take the Attack action and attack with only a glaive, halberd, quarterstaff, or spear, you can use a bonus action to make a melee attack with the opposite end of the weapon. The weapon\'s damage die for this attack is a d4, and it deals bludgeoning damage.\n• While you are wielding a glaive, halberd, pike, quarterstaff, or spear, other creatures provoke an opportunity attack from you when they enter the reach you have with that weapon.'
  },
  {
    name: 'Great Weapon Master',
    description:
      'You\'ve learned to put the weight of a weapon to your advantage, letting its momentum empower your strikes. You gain the following benefits:\n\n• On your turn, when you score a critical hit with a melee weapon or reduce a creature to 0 hit points with one, you can make one melee weapon attack as a bonus action.\n• Before you make a melee attack with a heavy weapon that you are proficient with, you can choose to take a −5 penalty to the attack roll. If the attack hits, you add +10 to the attack\'s damage.'
  },
  {
    name: 'Sharpshooter',
    description:
      'You have mastered ranged weapons and can make shots that others find impossible. You gain the following benefits:\n\n• Attacking at long range doesn\'t impose disadvantage on your ranged weapon attack rolls.\n• Your ranged weapon attacks ignore half cover and three-quarters cover.\n• Before you make an attack with a ranged weapon that you are proficient with, you can choose to take a −5 penalty to the attack roll. If the attack hits, you add +10 to the attack\'s damage.'
  },
  {
    name: 'Shield Master',
    description:
      'You use shields not just for protection but also for offense. You gain the following benefits while you are wielding a shield:\n\n• If you take the Attack action on your turn, you can use a bonus action to try to shove a creature within 5 feet of you with your shield.\n• If you aren\'t incapacitated, you can add your shield\'s AC bonus to any Dexterity saving throw you make against a spell or other harmful effect that targets only you.\n• If you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you can use your reaction to take no damage if you succeed on the saving throw, interposing your shield between yourself and the source of the effect.'
  },
  {
    name: 'Resilient',
    prerequisite: 'Choose one ability score',
    description:
      'Choose one ability score. You gain the following benefits:\n\n• Increase the chosen ability score by 1, to a maximum of 20.\n• You gain proficiency in saving throws using the chosen ability.'
  },
  {
    name: 'Skilled',
    description:
      'You gain proficiency in any combination of three skills or tools of your choice.'
  },
  {
    name: 'Durable',
    prerequisite: 'Constitution 13 or higher',
    description:
      'Hardy and resilient, you gain the following benefits:\n\n• Increase your Constitution score by 1, to a maximum of 20.\n• When you roll a Hit Die to regain hit points, the minimum number of hit points you regain from the roll equals twice your Constitution modifier (minimum of 2).'
  },
  {
    name: 'Crossbow Expert',
    description:
      'Thanks to extensive practice with the crossbow, you gain the following benefits:\n\n• You ignore the loading quality of crossbows with which you are proficient.\n• Being within 5 feet of a hostile creature doesn\'t impose disadvantage on your ranged attack rolls.\n• When you use the Attack action and attack with a one-handed weapon, you can use a bonus action to attack with a hand crossbow you are holding.'
  },
  {
    name: 'Dual Wielder',
    description:
      'You master fighting with two weapons, gaining the following benefits:\n\n• You gain a +1 bonus to AC while you are wielding a separate melee weapon in each hand.\n• You can use two-weapon fighting even when the one-handed melee weapons you are wielding aren\'t light.\n• You can draw or stow two one-handed weapons when you would normally be able to draw or stow only one.',
    effects: { acBonus: 1 }
  },
  {
    name: 'Lightly Armored',
    description:
      'You have trained to master the use of light armor, gaining the following benefits:\n\n• Increase your Strength or Dexterity score by 1, to a maximum of 20.\n• You gain proficiency with light armor.'
  },
  {
    name: 'Moderately Armored',
    prerequisite: 'Proficiency with light armor',
    description:
      'You have trained to master the use of medium armor and shields, gaining the following benefits:\n\n• Increase your Strength or Dexterity score by 1, to a maximum of 20.\n• You gain proficiency with medium armor and shields.'
  },
  {
    name: 'Heavily Armored',
    prerequisite: 'Proficiency with medium armor',
    description:
      'You have trained to master the use of heavy armor, gaining the following benefits:\n\n• Increase your Strength score by 1, to a maximum of 20.\n• You gain proficiency with heavy armor.'
  },
  {
    name: 'Magic Initiate',
    prerequisite: 'Spellcasting or Pact Magic feature',
    description:
      'Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. You learn two cantrips of your choice from that class\'s spell list. In addition, choose one 1st-level spell from that same list. You learn that spell and can cast it at its lowest level. Once you cast it, you must finish a long rest before you can cast it that way again. Your spellcasting ability for these spells depends on the class you chose.'
  },
  {
    name: 'Actor',
    description:
      'Skilled at mimicry and dramatics, you gain the following benefits:\n\n• Increase your Charisma score by 1, to a maximum of 20.\n• You have advantage on Charisma (Deception) and Charisma (Performance) checks when trying to pass yourself off as a different person.\n• You can mimic the speech of another person or the sounds made by other creatures. You must have heard the person speaking, or heard the creature make the sound, for at least 1 minute.'
  },
  {
    name: 'Athlete',
    description:
      'You have undergone extensive physical training to gain the following benefits:\n\n• Increase your Strength or Dexterity score by 1, to a maximum of 20.\n• When you are prone, standing up uses only 5 feet of your movement.\n• Climbing doesn\'t halve your speed.\n• You can make a running long jump or a running high jump after moving only 5 feet on foot, rather than 10 feet.'
  },
  {
    name: 'Charger',
    description:
      'When you use your action to Dash, you can use a bonus action to make one melee weapon attack or to shove a creature. If you move at least 10 feet in a straight line immediately before taking this bonus action, you either gain a +5 bonus to the attack\'s damage roll (if you chose to make a melee attack and hit) or push the target up to 10 feet away from you (if you chose to shove and you succeed).'
  },
  {
    name: 'Defensive Duelist',
    prerequisite: 'Dexterity 13 or higher',
    description:
      'When you are wielding a finesse weapon with which you are proficient and another creature hits you with a melee attack, you can use your reaction to add your proficiency bonus to your AC for that attack, potentially causing the attack to miss you.'
  },
  {
    name: 'Elemental Adept',
    prerequisite: 'The ability to cast at least one spell',
    description:
      'When you gain this feat, choose one of the following damage types: acid, cold, fire, lightning, or thunder. Spells you cast ignore resistance to damage of the chosen type. In addition, when you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2.'
  },
  {
    name: 'Grappler',
    prerequisite: 'Strength 13 or higher',
    description:
      'You\'ve developed the skills necessary to hold your own in close-quarters grappling. You gain the following benefits:\n\n• You have advantage on attack rolls against a creature you are grappling.\n• You can use your action to try to pin a creature grappled by you. To do so, make another grapple check. If you succeed, you and the creature are both restrained until the grapple ends.'
  },
  {
    name: 'Healer',
    description:
      'You are an able physician, allowing you to mend wounds quickly and get your allies back in the fight. You gain the following benefits:\n\n• When you use a healer\'s kit to stabilize a dying creature, that creature also regains 1 hit point.\n• As an action, you can spend one use of a healer\'s kit to tend to a creature and restore 1d6 + 4 hit points to it, plus additional hit points equal to the creature\'s maximum number of Hit Dice. The creature can\'t regain hit points from this feat again until it finishes a short or long rest.'
  },
  {
    name: 'Inspiring Leader',
    prerequisite: 'Charisma 13 or higher',
    description:
      'You can spend 10 minutes inspiring your companions, shoring up their resolve to fight. When you do so, choose up to six friendly creatures (which can include yourself) within 30 feet of you who can see or hear you and who can understand you. Each creature can gain temporary hit points equal to your level + your Charisma modifier. A creature can\'t gain temporary hit points from this feat again until it has finished a short or long rest.'
  },
  {
    name: 'Mage Slayer',
    description:
      'You have practiced techniques useful in melee combat against spellcasters, gaining the following benefits:\n\n• When a creature within 5 feet of you casts a spell, you can use your reaction to make a melee weapon attack against that creature.\n• When you damage a creature that is concentrating on a spell, that creature has disadvantage on the saving throw it makes to maintain its concentration.\n• You have advantage on saving throws against spells cast by creatures within 5 feet of you.'
  },
  {
    name: 'Savage Attacker',
    description:
      'Once per turn when you roll damage for a melee weapon attack, you can reroll the weapon\'s damage dice and use either total.'
  },
  {
    name: 'Skulker',
    prerequisite: 'Dexterity 13 or higher',
    description:
      'You are expert at slinking through shadows. You gain the following benefits:\n\n• You can try to hide when you are lightly obscured from the creature from which you are hiding.\n• When you are hidden from a creature and miss it with a ranged weapon attack, making the attack doesn\'t reveal your position.\n• Dim light doesn\'t impose disadvantage on your Wisdom (Perception) checks relying on sight.'
  },
  {
    name: 'Spell Sniper',
    prerequisite: 'The ability to cast at least one spell',
    description:
      'You have learned techniques to enhance your attacks with certain kinds of spells, gaining the following benefits:\n\n• When you cast a spell that requires you to make an attack roll, the spell\'s range is doubled.\n• Your ranged spell attacks ignore half cover and three-quarters cover.\n• You learn one cantrip that requires an attack roll. Choose the cantrip from the bard, cleric, druid, sorcerer, warlock, or wizard spell list.'
  },
  {
    name: 'Tavern Brawler',
    description:
      'Accustomed to rough-and-tumble fighting using whatever weapons happen to be at hand, you gain the following benefits:\n\n• Increase your Strength or Constitution score by 1, to a maximum of 20.\n• You are proficient with improvised weapons.\n• Your unarmed strike uses a d4 for damage.\n• When you hit a creature with an unarmed strike or an improvised weapon on your turn, you can use a bonus action to attempt to grapple the target.'
  },
  {
    name: 'Weapon Master',
    description:
      'You have practiced extensively with a variety of weapons, gaining the following benefits:\n\n• Increase your Strength or Dexterity score by 1, to a maximum of 20.\n• You gain proficiency with four weapons of your choice. Each one must be a simple or a martial weapon.'
  }
]

export async function seedFeats(): Promise<void> {
  const already = await getSetting<boolean>(SEED_FLAG)
  if (already) return

  const store = useContentStore.getState()
  const ts = Date.now()

  for (const def of FEATS) {
    const entry = {
      id: `feat-srd:${def.name.toLowerCase().replace(/\s+/g, '-')}`,
      source: 'srd' as const,
      name: def.name,
      summary: def.prerequisite ? `Prerequisite: ${def.prerequisite}` : 'Feat',
      tags: [] as string[],
      notes: '',
      world: 'SRD',
      createdAt: ts,
      updatedAt: ts,
      type: 'feat' as const,
      data: {
        prerequisite: def.prerequisite ?? '',
        description: def.description,
        ...(def.effects ?? {})
      }
    }
    await store.upsert(entry)
  }

  await setSetting(SEED_FLAG, true)
}
