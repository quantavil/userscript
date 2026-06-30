import { PerformerProfile } from './types';

const NATIONALITY_MAP: Record<string, string> = {
  american: 'US', russian: 'RU', czech: 'CZ', ukrainian: 'UA',
  british: 'GB', english: 'GB', canadian: 'CA', australian: 'AU',
  french: 'FR', german: 'DE', italian: 'IT', spanish: 'ES',
  hungarian: 'HU', polish: 'PL', japanese: 'JP', brazilian: 'BR',
  swedish: 'SE', dutch: 'NL', belgian: 'BE', austrian: 'AT',
  swiss: 'CH', romanian: 'RO', slovak: 'SK', bulgarian: 'BG',
  croatian: 'HR', colombian: 'CO', mexican: 'MX', venezuelan: 'VE',
  argentinian: 'AR', chilean: 'CL', peruvian: 'PE', filipino: 'PH',
  thai: 'TH', vietnamese: 'VN', chinese: 'CN', korean: 'KR',
  taiwanese: 'TW', indian: 'IN', south_african: 'ZA', norwegian: 'NO',
  danish: 'DK', finnish: 'FI', irish: 'IE', portuguese: 'PT',
  greek: 'GR', turkish: 'TR', israeli: 'IL', latvian: 'LV',
  lithuanian: 'LT', estonian: 'EE', belarusian: 'BY', moldovan: 'MD',
  georgian: 'GE', armenian: 'AM', azerbaijani: 'AZ', kazakh: 'KZ',
  uzbek: 'UZ', new_zealander: 'NZ', cuban: 'CU', puerto_rican: 'PR',
  serbian: 'RS', slovenian: 'SI', bosnian: 'BA', montenegrin: 'ME',
  albanian: 'AL', macedonian: 'MK', icelandic: 'IS', luxembourgish: 'LU',
  maltese: 'MT', cypriot: 'CY', singaporean: 'SG', malaysian: 'MY',
  indonesian: 'ID', egyptian: 'EG', moroccan: 'MA', tunisian: 'TN',
  lebanese: 'LB', iranian: 'IR', nigerian: 'NG', kenyan: 'KE',
  jamaican: 'JM', trinidadian: 'TT', dominican: 'DO', ecuadorian: 'EC',
  uruguayan: 'UY', paraguayan: 'PY', bolivian: 'BO', costa_rican: 'CR',
  panamanian: 'PA', guatemalan: 'GT', honduran: 'HN', salvadoran: 'SV',
  nicaraguan: 'NI'
};

export function getCountryCode(nationality: string | null): string | null {
  if (!nationality) return null;
  const clean = nationality.trim().toLowerCase().replace(/\s+/g, '_');
  return NATIONALITY_MAP[clean] || null;
}

export function parseProfileHtml(html: string, url: string, name: string): PerformerProfile {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const profile: PerformerProfile = {
    name,
    url,
    scrapedAt: Date.now(),
    personal: {
      age: null, nationality: null, countryCode: null,
      ethnicity: null, sexuality: null, professions: []
    },
    body: {
      hairColor: null, eyeColor: null, heightCm: null, weightKg: null,
      bodyType: null, measurements: null, bust: null, waist: null,
      hips: null, cup: null, boobs: 'Unknown'
    },
    performances: { solo: [], girlGirl: [], boyGirl: [] },
    rating: { score: null, votes: null, favorites: null }
  };

  const infoItems = doc.querySelectorAll('#personal-info-block .info-grid .info-item');
  infoItems.forEach((item) => {
    const labelEl = item.querySelector('.label');
    const valueEl = item.querySelector('.value');
    if (!labelEl || !valueEl) return;

    const label = labelEl.textContent?.trim().toLowerCase().replace(':', '') || '';
    const value = valueEl.textContent?.trim() || '';

    switch (label) {
      case 'age': {
        const match = value.match(/(\d+)/);
        if (match) profile.personal.age = parseInt(match[1], 10);
        break;
      }
      case 'nationality': {
        // HTML: <span class="fi fi-us"></span> (American)
        // textContent yields something like " (American)" or "🇺🇸 (American)"
        // Extract the word inside parentheses, or fall back to last word
        const parenMatch = value.match(/\(([^)]+)\)/);
        if (parenMatch) {
          profile.personal.nationality = parenMatch[1].trim();
        } else {
          // No parens — take the whole trimmed value
          profile.personal.nationality = value;
        }
        profile.personal.countryCode = getCountryCode(profile.personal.nationality);
        break;
      }
      case 'ethnicity':
        profile.personal.ethnicity = value;
        break;
      case 'sexuality':
        profile.personal.sexuality = value;
        break;
      case 'professions':
        profile.personal.professions = value
          .split(',')
          .map((p) => p.replace(/\(former\)|\(active\)/gi, '').trim().toLowerCase())
          .filter(Boolean);
        break;
      case 'hair color':
        profile.body.hairColor = value;
        break;
      case 'eye color':
        profile.body.eyeColor = value;
        break;
      case 'height': {
        const cmMatch = value.match(/(\d+)\s*cm/i);
        if (cmMatch) {
          profile.body.heightCm = parseInt(cmMatch[1], 10);
        } else {
          const ftInMatch = value.match(/(\d+)'\s*(\d+)/);
          if (ftInMatch) {
            const ft = parseInt(ftInMatch[1], 10);
            const inch = parseInt(ftInMatch[2], 10);
            profile.body.heightCm = Math.round((ft * 12 + inch) * 2.54);
          }
        }
        break;
      }
      case 'weight': {
        const kgMatch = value.match(/(\d+)\s*kg/i);
        if (kgMatch) {
          profile.body.weightKg = parseInt(kgMatch[1], 10);
        } else {
          const lbsMatch = value.match(/(\d+)\s*lbs/i);
          if (lbsMatch) {
            profile.body.weightKg = Math.round(parseInt(lbsMatch[1], 10) * 0.453592);
          }
        }
        break;
      }
      case 'body type':
        profile.body.bodyType = value;
        break;
      case 'measurements': {
        profile.body.measurements = value;
        const parts = value.split('-');
        if (parts.length === 3) {
          profile.body.bust = parseInt(parts[0], 10) || null;
          profile.body.waist = parseInt(parts[1], 10) || null;
          profile.body.hips = parseInt(parts[2], 10) || null;
        }
        break;
      }
      case 'bra/cup size': {
        const cupMatch = value.match(/\d+([A-Z]+)/i);
        profile.body.cup = cupMatch ? cupMatch[1].toUpperCase() : value.trim();
        break;
      }
      case 'boobs': {
        if (/real|natural/i.test(value)) {
          profile.body.boobs = 'Natural';
        } else if (/implant|fake|augmented/i.test(value)) {
          profile.body.boobs = 'Implants';
        }
        break;
      }
      case 'solo':
        profile.performances.solo = value.split(',').map((p) => p.trim()).filter(Boolean);
        break;
      case 'girl/girl':
        profile.performances.girlGirl = value.split(',').map((p) => p.trim()).filter(Boolean);
        break;
      case 'boy/girl':
        profile.performances.boyGirl = value.split(',').map((p) => p.trim()).filter(Boolean);
        break;
    }
  });

  // Parse ratings
  const ratingBox = doc.querySelector('.rating-global');
  if (ratingBox) {
    const scoreStr = ratingBox.querySelector('strong')?.textContent || '';
    const scoreMatch = scoreStr.match(/(\d+\.?\d*)/);
    if (scoreMatch) profile.rating.score = parseFloat(scoreMatch[1]);

    const votesStr = ratingBox.querySelector('small')?.textContent || '';
    const votesMatch = votesStr.match(/(\d+)/);
    if (votesMatch) profile.rating.votes = parseInt(votesMatch[1], 10);
  }

  const favBox = doc.querySelector('.rating-fav');
  if (favBox) {
    const favStr = favBox.querySelector('div')?.textContent || '';
    const favMatch = favStr.match(/(\d+)/);
    if (favMatch) profile.rating.favorites = parseInt(favMatch[1], 10);
  }

  return profile;
}

export function extractPerformerName(thumb: HTMLElement, anchor?: HTMLAnchorElement | null): string {
  const a = anchor || thumb.querySelector('a');
  const url = a?.getAttribute('href') || '';
  let name = '';
  const textLink = thumb.querySelector('.thumbtext a');
  if (textLink) {
    name = textLink.textContent?.trim() || '';
  } else {
    const textEl = thumb.querySelector('.thumbtext');
    if (textEl) {
      const rawText = textEl.textContent || '';
      const colonIdx = rawText.indexOf(':');
      name = colonIdx !== -1 ? rawText.substring(colonIdx + 1).trim() : rawText.trim();
    } else {
      name = a?.getAttribute('title')?.trim() || url.split('/').pop()?.replace(/_/g, ' ') || '';
    }
  }
  return name.replace(/^#\d+:\s*/, '').trim();
}
