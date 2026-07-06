// Kuratierte Liste grosser Schweizer Arbeitgeber — Schwerpunkt Finanzbranche,
// andere Branchen bewusst nicht ausgeschlossen. Frei erweiterbar.
interface FavoriteCompany {
  name: string
  aliases: string[]
  finance: boolean
}

export const FAVORITE_COMPANIES: FavoriteCompany[] = [
  // Banken
  { name: 'UBS', aliases: ['ubs'], finance: true },
  { name: 'Credit Suisse', aliases: ['credit suisse', 'cs '], finance: true },
  { name: 'Zürcher Kantonalbank', aliases: ['zürcher kantonalbank', 'zurcher kantonalbank', 'zkb'], finance: true },
  { name: 'PostFinance', aliases: ['postfinance'], finance: true },
  { name: 'Raiffeisen', aliases: ['raiffeisen'], finance: true },
  { name: 'Julius Bär', aliases: ['julius bär', 'julius baer'], finance: true },
  { name: 'Vontobel', aliases: ['vontobel'], finance: true },
  { name: 'Pictet', aliases: ['pictet'], finance: true },
  { name: 'Lombard Odier', aliases: ['lombard odier'], finance: true },
  { name: 'EFG International', aliases: ['efg international', 'efg bank'], finance: true },
  { name: 'Berner Kantonalbank', aliases: ['berner kantonalbank', 'bekb'], finance: true },
  { name: 'Luzerner Kantonalbank', aliases: ['luzerner kantonalbank', 'lukb'], finance: true },
  { name: 'St.Galler Kantonalbank', aliases: ['st.galler kantonalbank', 'st. galler kantonalbank', 'sgkb'], finance: true },
  { name: 'Basler Kantonalbank', aliases: ['basler kantonalbank', 'bkb'], finance: true },
  { name: 'Aargauische Kantonalbank', aliases: ['aargauische kantonalbank', 'akb'], finance: true },
  { name: 'Migros Bank', aliases: ['migros bank'], finance: true },
  { name: 'Cembra', aliases: ['cembra'], finance: true },

  // Versicherungen
  { name: 'Zurich Insurance', aliases: ['zurich insurance', 'zurich versicherung'], finance: true },
  { name: 'Swiss Re', aliases: ['swiss re'], finance: true },
  { name: 'Swiss Life', aliases: ['swiss life'], finance: true },
  { name: 'Helvetia', aliases: ['helvetia'], finance: true },
  { name: 'Die Mobiliar', aliases: ['mobiliar'], finance: true },
  { name: 'Baloise', aliases: ['baloise'], finance: true },
  { name: 'AXA', aliases: ['axa'], finance: true },
  { name: 'Allianz Suisse', aliases: ['allianz'], finance: true },
  { name: 'Generali', aliases: ['generali'], finance: true },
  { name: 'Vaudoise', aliases: ['vaudoise'], finance: true },
  { name: 'CSS Versicherung', aliases: ['css versicherung', 'css krankenkasse'], finance: true },
  { name: 'Sanitas', aliases: ['sanitas'], finance: true },
  { name: 'SIX Group', aliases: ['six group', 'six '], finance: true },

  // Grosse Firmen ausserhalb Finanzbranche (nicht ausgeschlossen)
  { name: 'Swisscom', aliases: ['swisscom'], finance: false },
  { name: 'SBB', aliases: ['sbb', 'schweizerische bundesbahnen'], finance: false },
  { name: 'Die Schweizerische Post', aliases: ['die post', 'schweizerische post'], finance: false },
  { name: 'Migros', aliases: ['migros'], finance: false },
  { name: 'Coop', aliases: ['coop'], finance: false },
  { name: 'ABB', aliases: ['abb'], finance: false },
  { name: 'Nestlé', aliases: ['nestlé', 'nestle'], finance: false },
  { name: 'Novartis', aliases: ['novartis'], finance: false },
  { name: 'Roche', aliases: ['roche'], finance: false },
  { name: 'Google', aliases: ['google'], finance: false },
  { name: 'IBM', aliases: ['ibm'], finance: false },
  { name: 'Kanton Zürich', aliases: ['kanton zürich', 'kanton zurich'], finance: false },
  { name: 'Stadt Zürich', aliases: ['stadt zürich', 'stadt zurich'], finance: false },
  { name: 'Zürich Flughafen', aliases: ['flughafen zürich', 'zurich airport'], finance: false },
  { name: 'SBB Cargo', aliases: ['sbb cargo'], finance: false },
]

function normalize(s: string): string {
  return s.toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
}

export interface FavoriteMatch {
  name: string
  finance: boolean
}

export function matchFavoriteCompany(company: string): FavoriteMatch | null {
  const norm = normalize(company)
  for (const fav of FAVORITE_COMPANIES) {
    if (fav.aliases.some(alias => norm.includes(normalize(alias)))) {
      return { name: fav.name, finance: fav.finance }
    }
  }
  return null
}
