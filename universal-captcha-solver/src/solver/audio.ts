import { AnswerError } from './answer.ts';

export const AUDIO_PROMPT =
  'This is an audio CAPTCHA. Transcribe exactly the words or digits that are spoken. ' +
  'Reply with ONLY those words in lowercase: no punctuation, quotes or explanation.';

/** Spoken answers are typed as heard: lowercase words separated by single spaces. */
export function normalizeSpoken(raw: string): string {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (/<think>/i.test(text)) throw new AnswerError('Model returned reasoning instead of an answer');
  text = text
    .replace(/```[a-z]*/gi, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) throw new AnswerError('Nothing was heard in the audio');
  return text;
}

/** "audio/mpeg" -> "mp3": the short format name some STT APIs want. */
export function audioFormat(mime: string): string {
  const sub = (mime.split('/')[1] ?? '').split(';')[0] ?? '';
  return { mpeg: 'mp3', 'x-wav': 'wav', wave: 'wav', 'x-m4a': 'm4a', mp4: 'm4a' }[sub] ?? (sub || 'mp3');
}
