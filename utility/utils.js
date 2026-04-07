import { getTableData } from './access_data.js';

// Role IDs that grant admin/mod privileges
export const ADMIN_ROLE_IDS = [
  '1459657838115950734',
  '1469430982296731850',
];

/**
 * Checks whether a GuildMember has admin privileges.
 * Returns true if the member has any of the admin roles or the Administrator permission.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
export function isAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has(1n << 3n)) return true; // Administrator permission
  return ADMIN_ROLE_IDS.some(id => member.roles?.cache?.has(id));
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function numToLetter(number){
  if(number >= 3){
    return String.fromCharCode(94 + number);
  }
  else{
    throw new Error(`Could not get letter for input number: ${number}`);
    
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


/**
 * Returns a random number, starting with 0, to a maxNumber
 *
 * @export
 * @param {Number} maxNumber 1/maxNumber chance 
 * @returns {Number} 
 */
export function randOutOf(maxNumber){
  return Math.round(Math.random() * maxNumber);
}

/**
 * Check whether an OC's aka field contains a given alias.
 */
function matchesAlias(oc, input) {
  if (!oc.aka) return false;
  return oc.aka.split(/,/).some(alias => alias.trim().toLowerCase() === input);
}

/**
 * Resolve an input string to a canonical OC name.
 * Tries: exact name → alias match → first-name match.
 * Returns the canonical name or null.
 */
export function resolveOCName(input) {
  if (!input) return null;
  const ocs = getTableData('ocs');
  if (!ocs || !Array.isArray(ocs)) return null;
  const lower = input.toLowerCase().trim();

  const exactMatch = ocs.find(oc => oc.name && oc.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch.name;

  const aliasMatch = ocs.find(oc => matchesAlias(oc, lower));
  if (aliasMatch) return aliasMatch.name;

  const firstNameMatch = ocs.find(oc => oc.name && oc.name.split(' ')[0].toLowerCase() === lower);
  if (firstNameMatch) return firstNameMatch.name;

  return null;
}

/**
 * Return OC names that match a query by name or alias (for autocomplete).
 * Prefix matches first, then contains matches.
 */
export function fuzzyMatchOCNames(query, limit = 25) {
  const ocs = getTableData('ocs');
  if (!ocs || !Array.isArray(ocs)) return [];
  if (!query) return ocs.slice(0, limit).map(oc => oc.name);

  const lower = query.toLowerCase();
  const matched = new Set();
  const prefixResults = [];
  const containsResults = [];

  for (const oc of ocs) {
    const name = oc.name?.toLowerCase() || '';
    const aliases = oc.aka ? oc.aka.split(/,/).map(a => a.trim().toLowerCase()) : [];

    const namePrefix = name.startsWith(lower);
    const aliasPrefix = aliases.some(a => a.startsWith(lower));
    const nameContains = !namePrefix && name.includes(lower);
    const aliasContains = !aliasPrefix && aliases.some(a => a.includes(lower));

    if (namePrefix || aliasPrefix) {
      if (!matched.has(oc.name)) { matched.add(oc.name); prefixResults.push(oc.name); }
    } else if (nameContains || aliasContains) {
      if (!matched.has(oc.name)) { matched.add(oc.name); containsResults.push(oc.name); }
    }
  }

  return [...prefixResults, ...containsResults].slice(0, limit);
}