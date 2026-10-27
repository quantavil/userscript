import { templateStore } from './template';

export const defaultEsanchitTemplate = 'Dear Sir,\n\nFind below eSANCHIT upload details:\n\nDRN{tab}IRN{tab}File Name{tab}Document Type\n{drn}{tab}{irn}{tab}{file}{tab}{type}';
export const esanchitPlaceholders = ['{drn}', '{irn}', '{file}', '{type}', '{date}', '{status}', '{tab}'];

const store = templateStore('better-icegate.esanchit-template.v1', defaultEsanchitTemplate);
export const readEsanchitTemplate = store.read;
export const saveEsanchitTemplate = store.save;
