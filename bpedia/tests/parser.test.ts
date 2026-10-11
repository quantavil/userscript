import { expect, test, describe } from 'bun:test';
import { parseProfileHtml, extractPerformerName, getCountryCode } from '../src/parser';
import { cleanUrl, validateFilterSettings } from '../src/cache';

describe('cleanUrl', () => {
  test('normalizes relative urls', () => {
    expect(cleanUrl('/babe/Sydney_Sweeney')).toBe('Sydney_Sweeney');
    expect(cleanUrl('/babe/Sydney_Sweeney/')).toBe('Sydney_Sweeney');
    expect(cleanUrl('babe/Sydney_Sweeney')).toBe('Sydney_Sweeney');
  });

  test('normalizes absolute urls with www or non-www', () => {
    expect(cleanUrl('https://www.babepedia.com/babe/Sydney_Sweeney')).toBe('Sydney_Sweeney');
    expect(cleanUrl('https://babepedia.com/babe/Sydney_Sweeney/')).toBe('Sydney_Sweeney');
    expect(cleanUrl('http://www.babepedia.com/babe/Sydney_Sweeney')).toBe('Sydney_Sweeney');
  });

  test('strips query parameters and hashes', () => {
    expect(cleanUrl('/babe/Sydney_Sweeney?page=2&ref=top')).toBe('Sydney_Sweeney');
    expect(cleanUrl('/babe/Sydney_Sweeney#bio')).toBe('Sydney_Sweeney');
  });

  test('handles plain slug', () => {
    expect(cleanUrl('Sydney_Sweeney')).toBe('Sydney_Sweeney');
  });
});

describe('parseProfileHtml', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Test Performer</title></head>
      <body>
        <div class="rating-global">
          <strong>8.9<small>/10</small></strong>
          <small>1,234 votes</small>
        </div>
        <div class="rating-fav">
          <div>5,678</div>
          <small>Times Favorited</small>
        </div>
        <div id="personal-info-block">
          <h2>Test Performer Biography</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Age:</span>
              <span class="value">28 years old</span>
            </div>
            <div class="info-item">
              <span class="label">Nationality:</span>
              <span class="value"><span class="fi fi-us"></span> (American)</span>
            </div>
            <div class="info-item">
              <span class="label">Ethnicity:</span>
              <span class="value"><a href="/caucasian">Caucasian</a></span>
            </div>
            <div class="info-item">
              <span class="label">Height:</span>
              <span class="value">5'7" (or 170 cm)</span>
            </div>
            <div class="info-item">
              <span class="label">Weight:</span>
              <span class="value">125 lbs (or 57 kg)</span>
            </div>
            <div class="info-item">
              <span class="label">Measurements:</span>
              <span class="value">34–24–34 in</span>
            </div>
            <div class="info-item">
              <span class="label">Bra/cup size:</span>
              <span class="value">34D <small><a href="#" id="showcupconversions">show conversions</a></small><span id="cupconversions"> - UK: 34D</span></span>
            </div>
            <div class="info-item">
              <span class="label">Boobs:</span>
              <span class="value"><a href="/real">Real/Natural</a></span>
            </div>
            <div class="info-item">
              <span class="label">Professions:</span>
              <span class="value"><a href="/porn">Porn Star</a>, Model</span>
            </div>
            <div class="info-item">
              <span class="label">Hair color:</span>
              <span class="value">Blonde</span>
            </div>
            <div class="info-item">
              <span class="label">Eye color:</span>
              <span class="value">Blue</span>
            </div>
            <div class="info-item">
              <span class="label">Solo:</span>
              <span class="value">Nudity, Masturbation</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  test('correctly parses all profile fields and handles numbers with commas', () => {
    const profile = parseProfileHtml(sampleHtml, '/babe/Test_Performer', 'Test Performer');
    expect(profile.personal.age).toBe(28);
    expect(profile.personal.nationality).toBe('American');
    expect(profile.personal.countryCode).toBe('US');
    expect(profile.personal.ethnicity).toBe('Caucasian');
    expect(profile.personal.professions).toEqual(['porn star', 'model']);
    expect(profile.body.heightCm).toBe(170);
    expect(profile.body.weightKg).toBe(57);
    expect(profile.body.bust).toBe(34);
    expect(profile.body.waist).toBe(24);
    expect(profile.body.hips).toBe(34);
    expect(profile.body.cup).toBe('D');
    expect(profile.body.boobs).toBe('Natural');
    expect(profile.body.hairColor).toBe('Blonde');
    expect(profile.body.eyeColor).toBe('Blue');
    expect(profile.performances.solo).toEqual(['Nudity', 'Masturbation']);
    expect(profile.rating.score).toBe(8.9);
    expect(profile.rating.votes).toBe(1234);
    expect(profile.rating.favorites).toBe(5678);
  });

  test('throws on Cloudflare challenge page', () => {
    const cfHtml = `<!DOCTYPE html><html><head><title>Just a moment...</title></head><body><div id="challenge-error-text"></div></body></html>`;
    expect(() => parseProfileHtml(cfHtml, '/babe/Blocked', 'Blocked')).toThrow(/Cloudflare challenge|Verification failed/);
  });

  test('parses real Kendra Lust live HTML correctly', async () => {
    const fs = await import('fs');
    if (!fs.existsSync('/tmp/kendra.html')) return;
    const html = fs.readFileSync('/tmp/kendra.html', 'utf-8');
    const profile = parseProfileHtml(html, '/babe/Kendra_Lust', 'Kendra Lust');
    expect(profile.personal.age).toBe(48);
    expect(profile.personal.nationality).toBe('American');
    expect(profile.personal.countryCode).toBe('US');
    expect(profile.personal.ethnicity).toBe('Caucasian');
    expect(profile.body.heightCm).toBe(157);
    expect(profile.body.weightKg).toBe(64);
    expect(profile.body.boobs).toBe('Implants');
    expect(profile.body.cup).toBe('D');
    expect(profile.rating.score).toBe(8.87);
    expect(profile.rating.votes).toBe(1014);
    expect(profile.rating.favorites).toBe(2317);
  });

  test('parses real Sydney Sweeney live HTML correctly', async () => {
    const fs = await import('fs');
    if (!fs.existsSync('/tmp/sydney.html')) return;
    const html = fs.readFileSync('/tmp/sydney.html', 'utf-8');
    const profile = parseProfileHtml(html, '/babe/Sydney_Sweeney', 'Sydney Sweeney');
    expect(profile.personal.age).toBe(29);
    expect(profile.personal.nationality).toBe('American');
    expect(profile.personal.countryCode).toBe('US');
    expect(profile.body.heightCm).toBe(160);
    expect(profile.body.weightKg).toBe(50);
    expect(profile.body.boobs).toBe('Natural');
    expect(profile.body.cup).toBe('F');
    expect(profile.rating.score).toBe(9.03);
    expect(profile.rating.votes).toBe(3176);
    expect(profile.rating.favorites).toBe(5825);
  });
});

describe('validateFilterSettings', () => {
  test('returns default settings on null or non-object', () => {
    const res = validateFilterSettings(null);
    expect(res.minAge).toBe(18);
    expect(res.maxAge).toBe(70);
    expect(res.boobs).toBe('all');
  });

  test('validates and preserves valid properties', () => {
    const res = validateFilterSettings({
      minAge: 25,
      maxAge: 40,
      boobs: 'natural',
      ethnicities: ['Caucasian', 123, null],
      searchQuery: 'Sydney'
    });
    expect(res.minAge).toBe(25);
    expect(res.maxAge).toBe(40);
    expect(res.boobs).toBe('natural');
    expect(res.ethnicities).toEqual(['Caucasian']);
    expect(res.searchQuery).toBe('Sydney');
  });
});

