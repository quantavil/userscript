import { templateStore } from './template';

export const defaultBeTemplate = 'Dear Sir,\n\nFind below Bill of Entry details:\n\nJob No{tab}BE Number{tab}BE Date{tab}Custom Location\n{job}{tab}{be}{tab}{date}{tab}{location}';
export const bePlaceholders = ['{job}', '{be}', '{date}', '{location}', '{tab}'];

const store = templateStore('better-icegate.be-template.v1', defaultBeTemplate);
export const readBeTemplate = store.read;
export const saveBeTemplate = store.save;
export const subscribeBeTemplate = store.subscribe;
