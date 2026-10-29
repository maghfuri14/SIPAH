import { SyahriyahWaiver } from './waiverService';

export type EffectiveWaiverKind = 'Normal' | 'Bebas' | 'Keringanan Sebagian' | 'Keringanan Custom';

export interface EffectiveSyahriyahResult {
  /** Tarif final yang harus dibayar santri pada bulan tersebut */
  nominalTagihan: number;
  /** Status keringanan yang berlaku pada bulan tersebut */
  jenisEfektif: EffectiveWaiverKind;
  /** Waiver periode yang menjadi sumber status (null berarti mengikuti status global santri) */
  waiver: SyahriyahWaiver | null;
  /** Rincian potongan bila jenisEfektif === 'Keringanan Custom' */
  potongan: { label: string; nominal: number }[];
}

/**
 * Menghitung tarif syahriyah efektif untuk satu bulan, dengan aturan:
 * - Bebas            -> Rp 0 (gratis penuh)
 * - Keringanan Sebagian -> diskon 50% dari tarif dasar
 * - Keringanan Custom  -> tarif dasar dikurangi total item potongan
 *   (minimum Rp 1.000 agar tetap tercatat sebagai tagihan, bukan pembebasan)
 * - Tanpa waiver pada bulan itu -> mengikuti status global santri
 *   (Normal / Bebas / Keringanan se-full satu tahun penuh)
 */
export function computeEffectiveSyahriyah(
  baseTarif: number,
  bulan: number,
  waivers: SyahriyahWaiver[],
  globalStatus?: string | null
): EffectiveSyahriyahResult {
  const waiver =
    waivers.find((w) => bulan >= w.bulan_mulai && bulan <= w.bulan_selesai) || null;

  const effective: EffectiveWaiverKind = waiver
    ? waiver.jenis
    : globalStatus === 'Bebas'
    ? 'Bebas'
    : globalStatus === 'Keringanan'
    ? 'Keringanan Sebagian'
    : 'Normal';

  if (effective === 'Bebas') {
    return { nominalTagihan: 0, jenisEfektif: 'Bebas', waiver, potongan: [] };
  }

  if (effective === 'Keringanan Sebagian') {
    return {
      nominalTagihan: Math.floor(baseTarif / 2),
      jenisEfektif: 'Keringanan Sebagian',
      waiver,
      potongan: [],
    };
  }

  if (effective === 'Keringanan Custom' && waiver) {
    const potongan = (waiver.potongan || [])
      .map((p) => ({ label: p.label, nominal: Math.max(0, Math.floor(p.nominal || 0)) }))
      .filter((p) => p.nominal > 0);
    const totalPotongan = potongan.reduce((sum, p) => sum + p.nominal, 0);
    const minimal = 1000; // Keringanan custom tidak boleh membuat tagihan jadi Rp 0
    const hasil = Math.max(minimal, baseTarif - totalPotongan);
    return { nominalTagihan: hasil, jenisEfektif: 'Keringanan Custom', waiver, potongan };
  }

  return { nominalTagihan: baseTarif, jenisEfektif: 'Normal', waiver, potongan: [] };
}

/** Label status untuk badge UI. */
export function getEffectiveStatusLabel(res: EffectiveSyahriyahResult): string {
  switch (res.jenisEfektif) {
    case 'Bebas':
      return res.waiver
        ? `Bebas Periode (${bulanLabel(res.waiver.bulan_mulai)}-${bulanLabel(res.waiver.bulan_selesai)})`
        : 'Bebas Se-full (Satu Tahun Penuh)';
    case 'Keringanan Sebagian':
      return res.waiver
        ? `Keringanan 50% Periode (${bulanLabel(res.waiver.bulan_mulai)}-${bulanLabel(res.waiver.bulan_selesai)})`
        : 'Keringanan Se-full (Satu Tahun Penuh)';
    case 'Keringanan Custom':
      return res.waiver
        ? `Keringanan Custom Periode (${bulanLabel(res.waiver.bulan_mulai)}-${bulanLabel(res.waiver.bulan_selesai)})`
        : 'Keringanan Se-full (Satu Tahun Penuh)';
    default:
      return 'Syahriyah Normal';
  }
}

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function bulanLabel(bulan: number): string {
  return BULAN_SINGKAT[bulan - 1] || String(bulan);
}
