import { getSetting, setSetting } from '@/lib/db/content'
import { useContentStore } from '@/lib/store/contentStore'
import type { BackgroundData } from '@/types/content'

const SEED_FLAG = 'backgrounds-seeded-v1'

interface BgDef {
  name: string
  skillProficiencies: string
  toolProficiencies?: string
  languages?: string
  equipment: string
  feature: string
  featureDescription: string
  description: string
}

const BACKGROUNDS: BgDef[] = [
  {
    name: 'Acolyte',
    skillProficiencies: 'Insight, Religion',
    languages: 'Two of your choice',
    equipment: 'Holy symbol, prayer book or prayer wheel, 5 sticks of incense, vestments, common clothes, pouch with 15 gp',
    feature: 'Shelter of the Faithful',
    featureDescription: 'As an acolyte, you command the respect of those who share your faith. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith. Those who share your religion will support you (but only you) at a modest lifestyle.',
    description: 'You have spent your life in the service of a temple to a specific god or pantheon of gods. You act as an intermediary between the realm of the holy and the mortal world, performing sacred rites and offering sacrifices in order to conduct worshippers into the presence of the divine.'
  },
  {
    name: 'Charlatan',
    skillProficiencies: 'Deception, Sleight of Hand',
    toolProficiencies: 'Disguise kit, forgery kit',
    equipment: 'Fine clothes, disguise kit, tools of the con (ten stoppered bottles filled with colored liquid, a set of weighted dice, a deck of marked cards), pouch with 15 gp',
    feature: 'False Identity',
    featureDescription: 'You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.',
    description: 'You have always had a way with people. You know what makes them tick, you can tease out their dreams and concerns, and with just a few learned tricks you can read them like they were children\'s books. It was a gift, one that you\'ve cultivated as a way to make a profit along with a way of life.'
  },
  {
    name: 'Criminal',
    skillProficiencies: 'Deception, Stealth',
    toolProficiencies: 'One type of gaming set, thieves\' tools',
    equipment: 'Crowbar, dark common clothes including a hood, pouch with 15 gp',
    feature: 'Criminal Contact',
    featureDescription: 'You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.',
    description: 'You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld. You\'re far closer than most people to the world of murder, theft, and violence that pervades the underbelly of civilization, and you have survived up to this point by staying a step ahead of the law.'
  },
  {
    name: 'Entertainer',
    skillProficiencies: 'Acrobatics, Performance',
    toolProficiencies: 'Disguise kit, one type of musical instrument',
    equipment: 'Musical instrument (one of your choice), the favor of an admirer (love letter, lock of hair, or trinket), costume, pouch with 15 gp',
    feature: 'By Popular Demand',
    featureDescription: 'You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble\'s court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night.',
    description: 'You thrive in front of an audience. You know how to entrance them, entertain them, and even inspire them. Your poetics can stir the hearts of those who hear you, awakening grief or joy, laughter or anger. Your music raises their spirits or captures their sorrow. Your dance steps captivate, your humor cuts to the quick.'
  },
  {
    name: 'Folk Hero',
    skillProficiencies: 'Animal Handling, Survival',
    toolProficiencies: 'One type of artisan\'s tools, vehicles (land)',
    equipment: 'Set of artisan\'s tools (one of your choice), shovel, iron pot, common clothes, pouch with 10 gp',
    feature: 'Rustic Hospitality',
    featureDescription: 'Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.',
    description: 'You come from a humble social rank, but you are destined for so much more. Already the people of your home village regard you as their champion, and your destiny calls you to stand against the tyrants and monsters that threaten the common folk everywhere.'
  },
  {
    name: 'Guild Artisan',
    skillProficiencies: 'Insight, Persuasion',
    toolProficiencies: 'One type of artisan\'s tools',
    languages: 'One of your choice',
    equipment: 'Set of artisan\'s tools (one of your choice), letter of introduction from your guild, traveler\'s clothes, pouch with 15 gp',
    feature: 'Guild Membership',
    featureDescription: 'As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession.',
    description: 'You are a member of an artisan\'s guild, skilled in a particular field and closely associated with other artisans. You are a well-established part of the mercantile world, freed by talent and wealth from the constraints of a feudal social order.'
  },
  {
    name: 'Hermit',
    skillProficiencies: 'Medicine, Religion',
    toolProficiencies: 'Herbalism kit',
    languages: 'One of your choice',
    equipment: 'Scroll case stuffed full of notes from your studies or prayers, winter blanket, common clothes, herbalism kit, pouch with 5 gp',
    feature: 'Discovery',
    featureDescription: 'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature.',
    description: 'You lived in seclusion — either in a sheltered community such as a monastery, or entirely alone — for a formative part of your life. In your time apart from the clamor of society, you found quiet, solitude, and perhaps some of the answers you were looking for.'
  },
  {
    name: 'Noble',
    skillProficiencies: 'History, Persuasion',
    toolProficiencies: 'One type of gaming set',
    languages: 'One of your choice',
    equipment: 'Fine clothes, signet ring, scroll of pedigree, purse with 25 gp',
    feature: 'Position of Privilege',
    featureDescription: 'Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere.',
    description: 'You understand wealth, power, and privilege. You carry a noble title, and your family owns land, collects taxes, and wields significant political influence. You might be a pampered aristocrat unfamiliar with work or discomfort, a former merchant just elevated to the nobility, or a disinherited scoundrel with a few contacts still among the nobility.'
  },
  {
    name: 'Outlander',
    skillProficiencies: 'Athletics, Survival',
    toolProficiencies: 'One type of musical instrument',
    languages: 'One of your choice',
    equipment: 'Staff, hunting trap, trophy from an animal you killed, traveler\'s clothes, pouch with 10 gp',
    feature: 'Wanderer',
    featureDescription: 'You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.',
    description: 'You grew up in the wilds, far from civilization and the comforts of town and technology. You\'ve witnessed the migration of herds larger than forests, survived weather more extreme than any city-dweller could comprehend, and enjoyed the solitude of being the only thinking creature for miles in any direction.'
  },
  {
    name: 'Sage',
    skillProficiencies: 'Arcana, History',
    languages: 'Two of your choice',
    equipment: 'Bottle of black ink, quill, small knife, letter from a dead colleague posing a question you have not yet been able to answer, common clothes, pouch with 10 gp',
    feature: 'Researcher',
    featureDescription: 'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature.',
    description: 'You spent years learning the lore of the multiverse. You scoured manuscripts, studied under other sages, and had your own theories about the nature of the cosmos put to the test. Your efforts have paid off, and you now have a wealth of knowledge.'
  },
  {
    name: 'Sailor',
    skillProficiencies: 'Athletics, Perception',
    toolProficiencies: 'Navigator\'s tools, vehicles (water)',
    equipment: 'Belaying pin (club), 50 feet of silk rope, lucky charm (rabbit foot or small stone with a hole in the center), common clothes, pouch with 10 gp',
    feature: 'Ship\'s Passage',
    featureDescription: 'When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with. Because you\'re calling in a favor, you can\'t be certain of a schedule or route that will meet your every need.',
    description: 'You sailed on a seagoing vessel for years. In that time, you faced down mighty storms, monsters of the deep, and those who wanted to sink your craft to the bottomless depths. Your first love is the distant horizon, but the time has come to try your hand at something new.'
  },
  {
    name: 'Soldier',
    skillProficiencies: 'Athletics, Intimidation',
    toolProficiencies: 'One type of gaming set, vehicles (land)',
    equipment: 'Insignia of rank, trophy taken from a fallen enemy (a dagger, broken blade, or piece of a banner), set of bone dice or deck of cards, common clothes, pouch with 10 gp',
    feature: 'Military Rank',
    featureDescription: 'You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use.',
    description: 'War has been your life for as long as you care to remember. You trained as a youth, studied the use of weapons and armor, learned basic survival techniques, including how to stay alive on the battlefield. You might have been part of a standing national army or a mercenary company.'
  },
  {
    name: 'Urchin',
    skillProficiencies: 'Sleight of Hand, Stealth',
    toolProficiencies: 'Disguise kit, thieves\' tools',
    equipment: 'Small knife, map of the city you grew up in, pet mouse, token to remember your parents by, common clothes, pouch with 10 gp',
    feature: 'City Secrets',
    featureDescription: 'You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.',
    description: 'You grew up on the streets alone, orphaned, and poor. You had no one to watch over you or to provide for you, so you learned to provide for yourself. You fought fiercely over food and kept a constant watch out for other desperate souls who might steal from you.'
  }
]

export async function seedBackgrounds(): Promise<void> {
  const already = await getSetting<boolean>(SEED_FLAG)
  if (already) return

  const store = useContentStore.getState()
  const ts = Date.now()

  for (const def of BACKGROUNDS) {
    const entry = {
      id: `bg-srd:${def.name.toLowerCase().replace(/[\s/]+/g, '-')}`,
      source: 'srd' as const,
      name: def.name,
      summary: `Feature: ${def.feature}`,
      tags: [] as string[],
      notes: '',
      world: 'SRD',
      createdAt: ts,
      updatedAt: ts,
      type: 'background' as const,
      data: {
        description: def.description,
        feature: def.feature,
        featureDescription: def.featureDescription,
        skillProficiencies: def.skillProficiencies,
        toolProficiencies: def.toolProficiencies,
        languages: def.languages,
        equipment: def.equipment
      } satisfies BackgroundData
    }
    await store.upsert(entry)
  }

  await setSetting(SEED_FLAG, true)
}
