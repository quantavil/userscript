import { templateStore } from './template';

export const defaultEsanchitTemplate = 'Dear Sir,\n\nFind below the IRN and DRN details:\n\nFile Name{tab}DRN{tab}IRN{tab}Document Type\n{file}{tab}{drn}{tab}{irn}{tab}{type}';
export const esanchitPlaceholders = ['{drn}', '{irn}', '{file}', '{type}', '{date}', '{status}', '{tab}'];

const store = templateStore('better-icegate.esanchit-template.v1', defaultEsanchitTemplate);
export const readEsanchitTemplate = store.read;
export const saveEsanchitTemplate = store.save;
export const subscribeEsanchitTemplate = store.subscribe;
