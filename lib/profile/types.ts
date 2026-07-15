export type ProfileTier = 'pleno' | 'delgado' | 'declarativo' | 'persona_natural';
export type RubroAgg = { code: string; name: string; frequency: number; amount: number };
export type CompanyProfile = { rubros: RubroAgg[]; compradores: { code: string; name: string; n_oc: number; last_contact: string | null }[]; regiones: { name: string; frequency: number }[]; rango_montos: [number, number] | null; keywords_fts: string[]; stale_history?: boolean };
export type LookupOutput = { tier?: ProfileTier; oc_count_24m?: number; rubros_top3?: string[]; regiones?: string[]; rango_montos?: [number, number] | null; n_compradores?: number; n_matches_hoy: number; rubros_genericos?: string[]; teaser?: { n_matches_hoy: number; top2: { nombre_tender: string; linea_justificacion: string }[] } };
