/**
 * Normalize a skill string: lowercase, strip diacritics, replace spaces/underscores with underscore,
 * remove all non-alphanumeric characters except underscore.
 */
export const normalizeSkill = (skill) => {
  return skill
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
};
