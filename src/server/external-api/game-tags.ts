import { getJSON } from './fetch'

export async function getBggGameTags (bggId: number | string): Promise<{ bggId: string | number, tags: string[] }> {
  const json = await getJSON(`https://api.geekdo.com/api/geekitems?nosession=1&objectid=${bggId}&objecttype=thing&subtype=boardgame&type=things`)

  const tags: string[] = [...json.item.links.boardgamecategory, ...json.item.links.boardgamemechanic]
    .map(n => n.name.toLowerCase().replace(/[\W\s]+/igm, '_'))

  return {
    bggId,
    tags
  }
}

export enum GameTags {
  economic = 'economic',
  deckBuilding = 'deck_building',
  dice = 'dice',
  boardBuilding = 'board_building',
  coop = 'coop',
  bluffing = 'bluffing',
  hiddenRoles = 'hidden_roles',
  party = 'party',
  deduction = 'deduction',
  words = 'words'
}

export function * GameTagsGenerator (tags: string[]): Generator<GameTags> {
  if (
    tags.includes('economic')
  ) yield GameTags.economic

  if (
    tags.includes('set_collection') ||
    tags.includes('deck_bag_and_pool_building')
  ) yield GameTags.deckBuilding

  if (
    tags.includes('dice_rolling')
  ) yield GameTags.dice

  if (
    tags.includes('deck_construction') ||
    tags.includes('map_deformation') ||
    tags.includes('modular_board') ||
    tags.includes('network_and_route_building') ||
    tags.includes('map_addition') ||
    tags.includes('hexagon_grid')
  ) yield GameTags.boardBuilding

  if (
    tags.includes('cooperative_game') ||
    tags.includes('team_based_game')
  ) yield GameTags.coop

  if (
    tags.includes('bluffing')
  ) yield GameTags.bluffing

  if (
    tags.includes('hidden_roles') ||
    tags.includes('traitor_game')
  ) yield GameTags.hiddenRoles

  if (
    tags.includes('party_game') ||
    tags.includes('humor') ||
    tags.includes('targeted_clues')
  ) yield GameTags.party

  if (
    tags.includes('deduction') ||
    tags.includes('hidden_movement')
  ) yield GameTags.deduction

  if (
    tags.includes('word_games')
  ) yield GameTags.words
}
