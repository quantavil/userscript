export interface PerformerProfile {
  name: string;
  url: string;
  scrapedAt: number;
  personal: {
    age: number | null;
    nationality: string | null;
    countryCode: string | null;
    ethnicity: string | null;
    sexuality: string | null;
    professions: string[];
  };
  body: {
    hairColor: string | null;
    eyeColor: string | null;
    heightCm: number | null;
    weightKg: number | null;
    bodyType: string | null;
    measurements: string | null;
    bust: number | null;
    waist: number | null;
    hips: number | null;
    cup: string | null;
    boobs: 'Natural' | 'Implants' | 'Unknown';
  };
  performances: {
    solo: string[];
    girlGirl: string[];
    boyGirl: string[];
  };
  rating: {
    score: number | null;
    votes: number | null;
    favorites: number | null;
  };
}

export interface BadgeSettings {
  showAge: boolean;
  showCupBoobs: boolean;
  showCountry: boolean;
  enabled: boolean;
}

export interface FilterSettings {
  minAge: number;
  maxAge: number;
  minHeight: number;
  maxHeight: number;
  minRating: number;
  minFavorites: number;
  boobs: 'all' | 'natural' | 'implants';
  professionFilter: 'all' | 'pornstar' | 'non-pornstar';
  ethnicities: string[];
  hairColors: string[];
  eyeColors: string[];
  cupSizes: string[];
  performances: string[];
  searchQuery: string;
}
