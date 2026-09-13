/**
 * Geodata & Coordinate Reference for TRAQ Map Visualizations
 * Supports 38 Indonesian Provinces, Regency/City (Kabupaten/Kota) resolution, and World Countries.
 */

// 1. Koordinat 38 Provinsi di Indonesia (Pusat Geografis)
export const PROVINCE_COORDINATES = {
  'Aceh': { lat: 4.695135, lng: 96.749399, region: 'Sumatera', id: 'AC' },
  'Sumatera Utara': { lat: 2.115354, lng: 99.545097, region: 'Sumatera', id: 'SU' },
  'Sumatera Barat': { lat: -0.73994, lng: 100.800005, region: 'Sumatera', id: 'SB' },
  'Riau': { lat: 0.293347, lng: 101.706825, region: 'Sumatera', id: 'RI' },
  'Kepulauan Riau': { lat: 3.945651, lng: 108.142867, region: 'Sumatera', id: 'KR' },
  'Jambi': { lat: -1.610123, lng: 103.61312, region: 'Sumatera', id: 'JA' },
  'Sumatera Selatan': { lat: -3.319437, lng: 104.914703, region: 'Sumatera', id: 'SS' },
  'Kepulauan Bangka Belitung': { lat: -2.741051, lng: 106.440587, region: 'Sumatera', id: 'BB' },
  'Bengkulu': { lat: -3.577847, lng: 102.346388, region: 'Sumatera', id: 'BE' },
  'Lampung': { lat: -4.558585, lng: 105.406808, region: 'Sumatera', id: 'LA' },

  'DKI Jakarta': { lat: -6.208763, lng: 106.845599, region: 'Jawa', id: 'JK' },
  'Banten': { lat: -6.405817, lng: 106.064018, region: 'Jawa', id: 'BT' },
  'Jawa Barat': { lat: -6.917464, lng: 107.619123, region: 'Jawa', id: 'JB' },
  'Jawa Tengah': { lat: -7.150975, lng: 110.140259, region: 'Jawa', id: 'JT' },
  'DI Yogyakarta': { lat: -7.79558, lng: 110.36949, region: 'Jawa', id: 'YO' },
  'Jawa Timur': { lat: -7.536064, lng: 112.238402, region: 'Jawa', id: 'JI' },

  'Bali': { lat: -8.409518, lng: 115.188916, region: 'Bali-Nusa Tenggara', id: 'BA' },
  'Nusa Tenggara Barat': { lat: -8.652933, lng: 117.361648, region: 'Bali-Nusa Tenggara', id: 'NB' },
  'Nusa Tenggara Timur': { lat: -8.657382, lng: 121.07937, region: 'Bali-Nusa Tenggara', id: 'NT' },

  'Kalimantan Barat': { lat: -0.02633, lng: 109.342504, region: 'Kalimantan', id: 'KB' },
  'Kalimantan Tengah': { lat: -1.681488, lng: 113.382355, region: 'Kalimantan', id: 'KT' },
  'Kalimantan Selatan': { lat: -3.092642, lng: 115.283759, region: 'Kalimantan', id: 'KS' },
  'Kalimantan Timur': { lat: 0.538659, lng: 116.419389, region: 'Kalimantan', id: 'KI' },
  'Kalimantan Utara': { lat: 3.073093, lng: 116.041389, region: 'Kalimantan', id: 'KU' },

  'Sulawesi Utara': { lat: 0.624693, lng: 123.975002, region: 'Sulawesi', id: 'SA' },
  'Gorontalo': { lat: 0.699937, lng: 122.446724, region: 'Sulawesi', id: 'GO' },
  'Sulawesi Tengah': { lat: -1.430025, lng: 121.445618, region: 'Sulawesi', id: 'ST' },
  'Sulawesi Barat': { lat: -2.844137, lng: 119.232078, region: 'Sulawesi', id: 'SR' },
  'Sulawesi Selatan': { lat: -3.668799, lng: 119.974053, region: 'Sulawesi', id: 'SN' },
  'Sulawesi Tenggara': { lat: -4.14491, lng: 122.174605, region: 'Sulawesi', id: 'SG' },

  'Maluku': { lat: -3.238462, lng: 130.145273, region: 'Maluku', id: 'MA' },
  'Maluku Utara': { lat: 1.570999, lng: 127.808769, region: 'Maluku', id: 'MU' },

  'Papua': { lat: -2.53371, lng: 140.71813, region: 'Papua', id: 'PA' },
  'Papua Barat': { lat: -1.336115, lng: 133.174716, region: 'Papua', id: 'PB' },
  'Papua Barat Daya': { lat: -0.876356, lng: 131.255845, region: 'Papua', id: 'PD' },
  'Papua Selatan': { lat: -7.534882, lng: 139.734497, region: 'Papua', id: 'PS' },
  'Papua Tengah': { lat: -3.551174, lng: 135.539824, region: 'Papua', id: 'PT' },
  'Papua Pegunungan': { lat: -4.088656, lng: 138.932789, region: 'Papua', id: 'PP' },
};

// 2. Lookup table Kabupaten/Kota & Pelabuhan utama ke 38 Provinsi
export const CITY_TO_PROVINCE_MAP = {
  // SULAWESI UTARA
  'MANADO': 'Sulawesi Utara',
  'BITUNG': 'Sulawesi Utara',
  'TOMOHON': 'Sulawesi Utara',
  'KOTAMOBAGU': 'Sulawesi Utara',
  'MINAHASA': 'Sulawesi Utara',
  'MINAHASA UTARA': 'Sulawesi Utara',
  'MINAHASA SELATAN': 'Sulawesi Utara',
  'MINAHASA TENGGARA': 'Sulawesi Utara',
  'BOLAANG MONGONDOW': 'Sulawesi Utara',
  'BOLMONG': 'Sulawesi Utara',
  'BOLAANG MONGONDOW UTARA': 'Sulawesi Utara',
  'BOLAANG MONGONDOW SELATAN': 'Sulawesi Utara',
  'BOLAANG MONGONDOW TIMUR': 'Sulawesi Utara',
  'KEPULAUAN SANGIHE': 'Sulawesi Utara',
  'SANGIHE': 'Sulawesi Utara',
  'TAHUNA': 'Sulawesi Utara',
  'KEPULAUAN SITARO': 'Sulawesi Utara',
  'SITARO': 'Sulawesi Utara',
  'SIAU': 'Sulawesi Utara',
  'KEPULAUAN TALAUD': 'Sulawesi Utara',
  'TALAUD': 'Sulawesi Utara',
  'SAM RATULANGI': 'Sulawesi Utara',
  'PELABUHAN BITUNG': 'Sulawesi Utara',
  'PELABUHAN MANADO': 'Sulawesi Utara',

  // GORONTALO
  'GORONTALO': 'Gorontalo',
  'BOALEMO': 'Gorontalo',
  'BONE BOLANGO': 'Gorontalo',
  'POHUWATO': 'Gorontalo',
  'GORONTALO UTARA': 'Gorontalo',
  'KWANDANG': 'Gorontalo',

  // SULAWESI TENGAH
  'PALU': 'Sulawesi Tengah',
  'DONGGALA': 'Sulawesi Tengah',
  'POSO': 'Sulawesi Tengah',
  'LUWUK': 'Sulawesi Tengah',
  'BANGGAI': 'Sulawesi Tengah',
  'BANGGAI KEPULAUAN': 'Sulawesi Tengah',
  'BANGGAI LAUT': 'Sulawesi Tengah',
  'TOLI-TOLI': 'Sulawesi Tengah',
  'TOLITOLI': 'Sulawesi Tengah',
  'BUOL': 'Sulawesi Tengah',
  'MOROWALI': 'Sulawesi Tengah',
  'MOROWALI UTARA': 'Sulawesi Tengah',
  'PARIGI MOUTONG': 'Sulawesi Tengah',
  'TOJO UNA-UNA': 'Sulawesi Tengah',
  'SIGI': 'Sulawesi Tengah',
  'PANTOLOAN': 'Sulawesi Tengah',

  // SULAWESI SELATAN
  'MAKASSAR': 'Sulawesi Selatan',
  'UJUNG PANDANG': 'Sulawesi Selatan',
  'PAREPARE': 'Sulawesi Selatan',
  'PARE-PARE': 'Sulawesi Selatan',
  'PALOPO': 'Sulawesi Selatan',
  'GOWA': 'Sulawesi Selatan',
  'MAROS': 'Sulawesi Selatan',
  'PANGKEP': 'Sulawesi Selatan',
  'PANGKAJENE': 'Sulawesi Selatan',
  'BARRU': 'Sulawesi Selatan',
  'BONE': 'Sulawesi Selatan',
  'WATAMPONE': 'Sulawesi Selatan',
  'SOPPENG': 'Sulawesi Selatan',
  'WAJO': 'Sulawesi Selatan',
  'SENGKANG': 'Sulawesi Selatan',
  'SIDRAP': 'Sulawesi Selatan',
  'PINRANG': 'Sulawesi Selatan',
  'ENREKANG': 'Sulawesi Selatan',
  'LUWU': 'Sulawesi Selatan',
  'LUWU UTARA': 'Sulawesi Selatan',
  'LUWU TIMUR': 'Sulawesi Selatan',
  'TANA TORAJA': 'Sulawesi Selatan',
  'TORAJA UTARA': 'Sulawesi Selatan',
  'BULUKUMBA': 'Sulawesi Selatan',
  'BANTAENG': 'Sulawesi Selatan',
  'JENEPONTO': 'Sulawesi Selatan',
  'TAKALAR': 'Sulawesi Selatan',
  'SELAYAR': 'Sulawesi Selatan',
  'SOEKARNO HATTA MAKASSAR': 'Sulawesi Selatan',
  'PELABUHAN MAKASSAR': 'Sulawesi Selatan',

  // SULAWESI TENGGARA
  'KENDARI': 'Sulawesi Tenggara',
  'BAUBAU': 'Sulawesi Tenggara',
  'BAU-BAU': 'Sulawesi Tenggara',
  'KOLAKA': 'Sulawesi Tenggara',
  'KOLAKA UTARA': 'Sulawesi Tenggara',
  'KOLAKA TIMUR': 'Sulawesi Tenggara',
  'KONAWE': 'Sulawesi Tenggara',
  'KONAWE SELATAN': 'Sulawesi Tenggara',
  'KONAWE UTARA': 'Sulawesi Tenggara',
  'KONAWE KEPULAUAN': 'Sulawesi Tenggara',
  'MUNA': 'Sulawesi Tenggara',
  'MUNA BARAT': 'Sulawesi Tenggara',
  'BUTON': 'Sulawesi Tenggara',
  'BUTON UTARA': 'Sulawesi Tenggara',
  'BUTON SELATAN': 'Sulawesi Tenggara',
  'BUTON TENGAH': 'Sulawesi Tenggara',
  'WAKATOBI': 'Sulawesi Tenggara',
  'BOMBANA': 'Sulawesi Tenggara',

  // SULAWESI BARAT
  'MAMUJU': 'Sulawesi Barat',
  'MAMUJU TENGAH': 'Sulawesi Barat',
  'PASANGKAYU': 'Sulawesi Barat',
  'MAMUJU UTARA': 'Sulawesi Barat',
  'POLEWALI MANDAR': 'Sulawesi Barat',
  'POLMAN': 'Sulawesi Barat',
  'MAJENE': 'Sulawesi Barat',
  'MAMASA': 'Sulawesi Barat',

  // MALUKU & MALUKU UTARA
  'AMBON': 'Maluku',
  'TUAL': 'Maluku',
  'MALUKU TENGAH': 'Maluku',
  'SERAM': 'Maluku',
  'BURU': 'Maluku',
  'TERNATE': 'Maluku Utara',
  'TIDORE': 'Maluku Utara',
  'HALMAHERA': 'Maluku Utara',
  'TOBELO': 'Maluku Utara',
  'BACAN': 'Maluku Utara',
  'MOROTAI': 'Maluku Utara',
  'SANANA': 'Maluku Utara',

  // PAPUA (ALL 6 PROVINCES - 38 PROVINSI REPUBLIK INDONESIA)
  // 1. PAPUA (INDUK)
  'JAYAPURA': 'Papua',
  'KEEROM': 'Papua',
  'SARMI': 'Papua',
  'MAMBERAMO RAYA': 'Papua',
  'BIAK': 'Papua',
  'BIAK NUMFOR': 'Papua',
  'SUPIORI': 'Papua',
  'SERUI': 'Papua',
  'YAPEN': 'Papua',
  'KEPULAUAN YAPEN': 'Papua',
  'WAROPEN': 'Papua',

  // 2. PAPUA BARAT
  'MANOKWARI': 'Papua Barat',
  'MANOKWARI SELATAN': 'Papua Barat',
  'PEGUNUNGAN ARFAK': 'Papua Barat',
  'TELUK BINTUNI': 'Papua Barat',
  'BINTUNI': 'Papua Barat',
  'TELUK WONDAMA': 'Papua Barat',
  'WONDAMA': 'Papua Barat',
  'FAKFAK': 'Papua Barat',
  'FAK FAK': 'Papua Barat',
  'KAIMANA': 'Papua Barat',

  // 3. PAPUA BARAT DAYA (DOB BARU)
  'SORONG': 'Papua Barat Daya',
  'SORONG SELATAN': 'Papua Barat Daya',
  'TEMINABUAN': 'Papua Barat Daya',
  'RAJA AMPAT': 'Papua Barat Daya',
  'TAMBRAUW': 'Papua Barat Daya',
  'MAYBRAT': 'Papua Barat Daya',

  // 4. PAPUA SELATAN (DOB BARU)
  'MERAUKE': 'Papua Selatan',
  'BOVEN DIGOEL': 'Papua Selatan',
  'BOVENDIGOEL': 'Papua Selatan',
  'MAPPI': 'Papua Selatan',
  'ASMAT': 'Papua Selatan',

  // 5. PAPUA TENGAH (DOB BARU)
  'NABIRE': 'Papua Tengah',
  'MIMIKA': 'Papua Tengah',
  'TIMIKA': 'Papua Tengah',
  'PANIAI': 'Papua Tengah',
  'ENAROTALI': 'Papua Tengah',
  'DEIYAI': 'Papua Tengah',
  'DOGIYAI': 'Papua Tengah',
  'INTAN JAYA': 'Papua Tengah',
  'SUGAPA': 'Papua Tengah',
  'PUNCAK': 'Papua Tengah',
  'ILAGA': 'Papua Tengah',
  'PUNCAK JAYA': 'Papua Tengah',
  'MULIA': 'Papua Tengah',

  // 6. PAPUA PEGUNUNGAN (DOB BARU)
  'WAMENA': 'Papua Pegunungan',
  'JAYAWIJAYA': 'Papua Pegunungan',
  'PEGUNUNGAN BINTANG': 'Papua Pegunungan',
  'OKSIBIL': 'Papua Pegunungan',
  'YAHUKIMO': 'Papua Pegunungan',
  'DEKAI': 'Papua Pegunungan',
  'TOLIKARA': 'Papua Pegunungan',
  'KARUBAGA': 'Papua Pegunungan',
  'MAMBERAMO TENGAH': 'Papua Pegunungan',
  'KOBAKMA': 'Papua Pegunungan',
  'YALIMO': 'Papua Pegunungan',
  'ELELIM': 'Papua Pegunungan',
  'LANNY JAYA': 'Papua Pegunungan',
  'TIOM': 'Papua Pegunungan',
  'NDUGA': 'Papua Pegunungan',
  'KENYAM': 'Papua Pegunungan',

  // JAWA
  'JAKARTA': 'DKI Jakarta',
  'JAKARTA PUSAT': 'DKI Jakarta',
  'JAKARTA UTARA': 'DKI Jakarta',
  'JAKARTA BARAT': 'DKI Jakarta',
  'JAKARTA SELATAN': 'DKI Jakarta',
  'JAKARTA TIMUR': 'DKI Jakarta',
  'TANJUNG PRIOK': 'DKI Jakarta',
  'SOEKARNO-HATTA': 'Banten',
  'TANGERANG': 'Banten',
  'TANGERANG SELATAN': 'Banten',
  'SERANG': 'Banten',
  'CILEGON': 'Banten',
  'MERAK': 'Banten',
  'PANDEGLANG': 'Banten',
  'LEBAK': 'Banten',

  'BANDUNG': 'Jawa Barat',
  'BEKASI': 'Jawa Barat',
  'BOGOR': 'Jawa Barat',
  'DEPOK': 'Jawa Barat',
  'CIMAHI': 'Jawa Barat',
  'CIREBON': 'Jawa Barat',
  'SUKABUMI': 'Jawa Barat',
  'TASIKMALAYA': 'Jawa Barat',
  'KARAWANG': 'Jawa Barat',
  'PURWAKARTA': 'Jawa Barat',
  'SUBANG': 'Jawa Barat',
  'INDRAMAYU': 'Jawa Barat',
  'GARUT': 'Jawa Barat',
  'CIAMIS': 'Jawa Barat',
  'KUNINGAN': 'Jawa Barat',
  'MAJALENGKA': 'Jawa Barat',
  'SUMEDANG': 'Jawa Barat',
  'CIANJUR': 'Jawa Barat',
  'PANGANDARAN': 'Jawa Barat',

  'SEMARANG': 'Jawa Tengah',
  'SURAKARTA': 'Jawa Tengah',
  'SOLO': 'Jawa Tengah',
  'MAGELANG': 'Jawa Tengah',
  'PEKALONGAN': 'Jawa Tengah',
  'SALATIGA': 'Jawa Tengah',
  'TEGAL': 'Jawa Tengah',
  'BANYUMAS': 'Jawa Tengah',
  'PURWOKERTO': 'Jawa Tengah',
  'CILACAP': 'Jawa Tengah',
  'KUDUS': 'Jawa Tengah',
  'PATI': 'Jawa Tengah',
  'JEPARA': 'Jawa Tengah',
  'DEMAK': 'Jawa Tengah',
  'KENDAL': 'Jawa Tengah',
  'BATANG': 'Jawa Tengah',
  'BREBES': 'Jawa Tengah',
  'PEMALANG': 'Jawa Tengah',
  'KLATEN': 'Jawa Tengah',
  'BOYOLALI': 'Jawa Tengah',
  'SUKOHARJO': 'Jawa Tengah',
  'WONOGIRI': 'Jawa Tengah',
  'SRAGEN': 'Jawa Tengah',
  'KARANGANYAR': 'Jawa Tengah',
  'BLORA': 'Jawa Tengah',
  'REMBANG': 'Jawa Tengah',
  'GROBOGAN': 'Jawa Tengah',
  'PURWODADI': 'Jawa Tengah',
  'TEMANGGUNG': 'Jawa Tengah',
  'WONOSOBO': 'Jawa Tengah',
  'BANJARNEGARA': 'Jawa Tengah',
  'PURBALINGGA': 'Jawa Tengah',
  'KEBUMEN': 'Jawa Tengah',
  'PURWOREJO': 'Jawa Tengah',
  'TANJUNG EMAS': 'Jawa Tengah',

  'YOGYAKARTA': 'DI Yogyakarta',
  'JOGJA': 'DI Yogyakarta',
  'SLEMAN': 'DI Yogyakarta',
  'BANTUL': 'DI Yogyakarta',
  'GUNUNGKIDUL': 'DI Yogyakarta',
  'KULON PROGO': 'DI Yogyakarta',

  'SURABAYA': 'Jawa Timur',
  'TANJUNG PERAK': 'Jawa Timur',
  'MALANG': 'Jawa Timur',
  'SIDOARJO': 'Jawa Timur',
  'GRESIK': 'Jawa Timur',
  'MOJOKERTO': 'Jawa Timur',
  'PASURUAN': 'Jawa Timur',
  'PROBOLINGGO': 'Jawa Timur',
  'BANYUWANGI': 'Jawa Timur',
  'KETAPANG': 'Jawa Timur',
  'JEMBER': 'Jawa Timur',
  'LUMAJANG': 'Jawa Timur',
  'BONDOWOSO': 'Jawa Timur',
  'SITUBONDO': 'Jawa Timur',
  'KEDIRI': 'Jawa Timur',
  'BLITAR': 'Jawa Timur',
  'MADIUN': 'Jawa Timur',
  'BATU': 'Jawa Timur',
  'TUBAN': 'Jawa Timur',
  'LAMONGAN': 'Jawa Timur',
  'BOJONEGORO': 'Jawa Timur',
  'NGAWI': 'Jawa Timur',
  'MAGETAN': 'Jawa Timur',
  'PONOROGO': 'Jawa Timur',
  'PACITAN': 'Jawa Timur',
  'TRENGGALEK': 'Jawa Timur',
  'TULUNGAGUNG': 'Jawa Timur',
  'NGANJUK': 'Jawa Timur',
  'JOMBANG': 'Jawa Timur',
  'BANGKALAN': 'Jawa Timur',
  'SAMPANG': 'Jawa Timur',
  'PAMEKASAN': 'Jawa Timur',
  'SUMENEP': 'Jawa Timur',
  'MADURA': 'Jawa Timur',

  // BALI & NTB / NTT
  'DENPASAR': 'Bali',
  'BADUNG': 'Bali',
  'GIANYAR': 'Bali',
  'TABANAN': 'Bali',
  'BULELENG': 'Bali',
  'SINGARAJA': 'Bali',
  'JEMBRANA': 'Bali',
  'NEGARA': 'Bali',
  'KARANGASEM': 'Bali',
  'KLUNGKUNG': 'Bali',
  'BANGLI': 'Bali',
  'BENOA': 'Bali',
  'PADANGBAI': 'Bali',
  'GILIMANUK': 'Bali',

  'MATARAM': 'Nusa Tenggara Barat',
  'LOMBOK': 'Nusa Tenggara Barat',
  'LOMBOK BARAT': 'Nusa Tenggara Barat',
  'LOMBOK TENGAH': 'Nusa Tenggara Barat',
  'LOMBOK TIMUR': 'Nusa Tenggara Barat',
  'LOMBOK UTARA': 'Nusa Tenggara Barat',
  'SUMBAWA': 'Nusa Tenggara Barat',
  'SUMBAWA BARAT': 'Nusa Tenggara Barat',
  'BIMA': 'Nusa Tenggara Barat',
  'DOMPU': 'Nusa Tenggara Barat',
  'LEMBAR': 'Nusa Tenggara Barat',

  'KUPANG': 'Nusa Tenggara Timur',
  'ENDE': 'Nusa Tenggara Timur',
  'MAUMERE': 'Nusa Tenggara Timur',
  'SIKKA': 'Nusa Tenggara Timur',
  'LABUAN BAJO': 'Nusa Tenggara Timur',
  'MANGGARAI': 'Nusa Tenggara Timur',
  'SUMBA': 'Nusa Tenggara Timur',
  'WAINGAPU': 'Nusa Tenggara Timur',
  'TIMOR': 'Nusa Tenggara Timur',
  'ALOR': 'Nusa Tenggara Timur',
  'ROTE': 'Nusa Tenggara Timur',
  'FLORES': 'Nusa Tenggara Timur',
  'TENAU': 'Nusa Tenggara Timur',

  // KALIMANTAN
  'PONTIANAK': 'Kalimantan Barat',
  'SINGKAWANG': 'Kalimantan Barat',
  'SAMBAS': 'Kalimantan Barat',
  'KETAPANG KALBAR': 'Kalimantan Barat',
  'SINTANG': 'Kalimantan Barat',
  'SANGGAU': 'Kalimantan Barat',

  'PALANGKARAYA': 'Kalimantan Tengah',
  'SAMPIT': 'Kalimantan Tengah',
  'KOTAWARINGIN': 'Kalimantan Tengah',
  'KAPUAS': 'Kalimantan Tengah',
  'PANGKALAN BUN': 'Kalimantan Tengah',

  'BANJARMASIN': 'Kalimantan Selatan',
  'BANJARBARU': 'Kalimantan Selatan',
  'MARTAPURA': 'Kalimantan Selatan',
  'TANAH BUMBU': 'Kalimantan Selatan',
  'BATULICIN': 'Kalimantan Selatan',
  'KOTABARU': 'Kalimantan Selatan',
  'TABALONG': 'Kalimantan Selatan',
  'TRISAKTI': 'Kalimantan Selatan',

  'BALIKPAPAN': 'Kalimantan Timur',
  'SAMARINDA': 'Kalimantan Timur',
  'BONTANG': 'Kalimantan Timur',
  'KUTAI': 'Kalimantan Timur',
  'KUTAI KARTANEGARA': 'Kalimantan Timur',
  'KUTAI TIMUR': 'Kalimantan Timur',
  'BERAU': 'Kalimantan Timur',
  'PASER': 'Kalimantan Timur',
  'PENAJAM PASER UTARA': 'Kalimantan Timur',
  'IKN': 'Kalimantan Timur',
  'SEMAYANG': 'Kalimantan Timur',

  'TARAKAN': 'Kalimantan Utara',
  'TANJUNG SELOR': 'Kalimantan Utara',
  'NUNUKAN': 'Kalimantan Utara',
  'BULUNGAN': 'Kalimantan Utara',
  'MALINAU': 'Kalimantan Utara',

  // SUMATERA
  'BANDA ACEH': 'Aceh',
  'SABANG': 'Aceh',
  'LHOKSEUMAWE': 'Aceh',
  'LANGSA': 'Aceh',
  'MEULABOH': 'Aceh',

  'MEDAN': 'Sumatera Utara',
  'BELAWAN': 'Sumatera Utara',
  'BINJAI': 'Sumatera Utara',
  'PEMATANG SIANTAR': 'Sumatera Utara',
  'TEBING TINGGI': 'Sumatera Utara',
  'TANJUNG BALAI': 'Sumatera Utara',
  'SIBOLGA': 'Sumatera Utara',
  'DELI SERDANG': 'Sumatera Utara',
  'KUALANAMU': 'Sumatera Utara',
  'ASAHAN': 'Sumatera Utara',
  'KARO': 'Sumatera Utara',
  'SIMALUNGUN': 'Sumatera Utara',
  'TAPANULI': 'Sumatera Utara',
  'NIAS': 'Sumatera Utara',

  'PADANG': 'Sumatera Barat',
  'TELUK BAYUR': 'Sumatera Barat',
  'BUKITTINGGI': 'Sumatera Barat',
  'PAYAKUMBUH': 'Sumatera Barat',
  'PARIAMAN': 'Sumatera Barat',
  'SOLOK': 'Sumatera Barat',
  'PASAMAN': 'Sumatera Barat',
  'AGAM': 'Sumatera Barat',

  'PEKANBARU': 'Riau',
  'DUMAI': 'Riau',
  'BENGKALIS': 'Riau',
  'SIAK': 'Riau',
  'INDRAGIRI': 'Riau',
  'KAMPAR': 'Riau',
  'ROKAN': 'Riau',
  'PELALAWAN': 'Riau',

  'BATAM': 'Kepulauan Riau',
  'TANJUNG PINANG': 'Kepulauan Riau',
  'TANJUNGPINANG': 'Kepulauan Riau',
  'BINTAN': 'Kepulauan Riau',
  'KARIMUN': 'Kepulauan Riau',
  'NATUNA': 'Kepulauan Riau',
  'ANAMBAS': 'Kepulauan Riau',
  'BATU AMPAR': 'Kepulauan Riau',

  'JAMBI': 'Jambi',
  'MUARO JAMBI': 'Jambi',
  'SUNGAI PENUH': 'Jambi',
  'KERINCI': 'Jambi',
  'KUALA TUNGKAL': 'Jambi',

  'PALEMBANG': 'Sumatera Selatan',
  'BOOM BARU': 'Sumatera Selatan',
  'PRABUMULIH': 'Sumatera Selatan',
  'LUBUKLINGGAU': 'Sumatera Selatan',
  'PAGAR ALAM': 'Sumatera Selatan',
  'BANYUASIN': 'Sumatera Selatan',
  'OGAN KOMERING': 'Sumatera Selatan',
  'MUARA ENIM': 'Sumatera Selatan',

  'PANGKAL PINANG': 'Kepulauan Bangka Belitung',
  'PANGKALPINANG': 'Kepulauan Bangka Belitung',
  'BANGKA': 'Kepulauan Bangka Belitung',
  'BELITUNG': 'Kepulauan Bangka Belitung',
  'TANJUNG PANDAN': 'Kepulauan Bangka Belitung',

  'BENGKULU': 'Bengkulu',
  'PULAU BAAI': 'Bengkulu',
  'REJANG LEBONG': 'Bengkulu',
  'MUKOMUKO': 'Bengkulu',

  'BANDAR LAMPUNG': 'Lampung',
  'PANJANG': 'Lampung',
  'METRO': 'Lampung',
  'BAKAUHENI': 'Lampung',
  'LAMPUNG SELATAN': 'Lampung',
  'LAMPUNG TENGAH': 'Lampung',
  'LAMPUNG UTARA': 'Lampung',
  'LAMPUNG TIMUR': 'Lampung',
  'LAMPUNG BARAT': 'Lampung',
  'TULANG BAWANG': 'Lampung',
  'PESAWARAN': 'Lampung',
  'PRINGSEWU': 'Lampung',
  'TANGGAMUS': 'Lampung',
};

// 3. Koordinat Negara Dunia (World Countries)
export const COUNTRY_COORDINATES = {
  // ASIA PASIFIK & TIMUR
  'INDONESIA': { lat: -0.789275, lng: 113.921327, name: 'Indonesia', code: 'ID' },
  'CHINA': { lat: 35.86166, lng: 104.195397, name: 'Tiongkok (China)', code: 'CN' },
  'TIONGKOK': { lat: 35.86166, lng: 104.195397, name: 'Tiongkok (China)', code: 'CN' },
  'JEPANG': { lat: 36.204824, lng: 138.252924, name: 'Jepang', code: 'JP' },
  'JAPAN': { lat: 36.204824, lng: 138.252924, name: 'Jepang', code: 'JP' },
  'KOREA SELATAN': { lat: 35.907757, lng: 127.766922, name: 'Korea Selatan', code: 'KR' },
  'SOUTH KOREA': { lat: 35.907757, lng: 127.766922, name: 'Korea Selatan', code: 'KR' },
  'KOREA UTARA': { lat: 40.339852, lng: 127.510093, name: 'Korea Utara', code: 'KP' },
  'TAIWAN': { lat: 23.69781, lng: 120.960515, name: 'Taiwan', code: 'TW' },
  'HONG KONG': { lat: 22.319303, lng: 114.169361, name: 'Hong Kong', code: 'HK' },
  'HONGKONG': { lat: 22.319303, lng: 114.169361, name: 'Hong Kong', code: 'HK' },

  // ASIA TENGGARA (ASEAN)
  'SINGAPURA': { lat: 1.352083, lng: 103.819836, name: 'Singapura', code: 'SG' },
  'SINGAPORE': { lat: 1.352083, lng: 103.819836, name: 'Singapura', code: 'SG' },
  'MALAYSIA': { lat: 4.210484, lng: 101.975766, name: 'Malaysia', code: 'MY' },
  'FILIPINA': { lat: 12.879721, lng: 121.774017, name: 'Filipina', code: 'PH' },
  'PHILIPPINES': { lat: 12.879721, lng: 121.774017, name: 'Filipina', code: 'PH' },
  'THAILAND': { lat: 15.870032, lng: 100.992541, name: 'Thailand', code: 'TH' },
  'VIETNAM': { lat: 14.058324, lng: 108.277199, name: 'Vietnam', code: 'VN' },
  'BRUNEI': { lat: 4.535277, lng: 114.727669, name: 'Brunei Darussalam', code: 'BN' },
  'BRUNEI DARUSSALAM': { lat: 4.535277, lng: 114.727669, name: 'Brunei Darussalam', code: 'BN' },
  'MYANMAR': { lat: 21.916221, lng: 95.956001, name: 'Myanmar', code: 'MM' },
  'KAMBOJA': { lat: 12.565679, lng: 104.990963, name: 'Kamboja', code: 'KH' },
  'CAMBODIA': { lat: 12.565679, lng: 104.990963, name: 'Kamboja', code: 'KH' },
  'LAOS': { lat: 19.85627, lng: 102.495496, name: 'Laos', code: 'LA' },
  'TIMOR LESTE': { lat: -8.874217, lng: 125.727539, name: 'Timor Leste', code: 'TL' },

  // ASIA SELATAN & TIMUR TENGAH
  'INDIA': { lat: 20.593684, lng: 78.96288, name: 'India', code: 'IN' },
  'PAKISTAN': { lat: 30.375321, lng: 69.345116, name: 'Pakistan', code: 'PK' },
  'BANGLADESH': { lat: 23.684994, lng: 90.356331, name: 'Bangladesh', code: 'BD' },
  'SRI LANKA': { lat: 7.873054, lng: 80.771797, name: 'Sri Lanka', code: 'LK' },
  'ARAB SAUDI': { lat: 23.885942, lng: 45.079162, name: 'Arab Saudi', code: 'SA' },
  'SAUDI ARABIA': { lat: 23.885942, lng: 45.079162, name: 'Arab Saudi', code: 'SA' },
  'UNI EMIRAT ARAB': { lat: 23.424076, lng: 53.847818, name: 'Uni Emirat Arab (UEA)', code: 'AE' },
  'UNITED ARAB EMIRATES': { lat: 23.424076, lng: 53.847818, name: 'Uni Emirat Arab (UEA)', code: 'AE' },
  'UAE': { lat: 23.424076, lng: 53.847818, name: 'Uni Emirat Arab (UEA)', code: 'AE' },
  'QATAR': { lat: 25.354826, lng: 51.183884, name: 'Qatar', code: 'QA' },
  'OMAN': { lat: 21.512583, lng: 55.923255, name: 'Oman', code: 'OM' },
  'TURKI': { lat: 38.963745, lng: 35.243322, name: 'Turki', code: 'TR' },
  'TURKEY': { lat: 38.963745, lng: 35.243322, name: 'Turki', code: 'TR' },
  'IRAN': { lat: 32.427908, lng: 53.688046, name: 'Iran', code: 'IR' },

  // EROPA
  'BELANDA': { lat: 52.132633, lng: 5.291266, name: 'Belanda (Netherlands)', code: 'NL' },
  'NETHERLANDS': { lat: 52.132633, lng: 5.291266, name: 'Belanda (Netherlands)', code: 'NL' },
  'JERMAN': { lat: 51.165691, lng: 10.451526, name: 'Jerman', code: 'DE' },
  'GERMANY': { lat: 51.165691, lng: 10.451526, name: 'Jerman', code: 'DE' },
  'INGGRIS': { lat: 55.378051, lng: -3.435973, name: 'Inggris (United Kingdom)', code: 'GB' },
  'UNITED KINGDOM': { lat: 55.378051, lng: -3.435973, name: 'Inggris (United Kingdom)', code: 'GB' },
  'UK': { lat: 55.378051, lng: -3.435973, name: 'Inggris (United Kingdom)', code: 'GB' },
  'PRANCIS': { lat: 46.227638, lng: 2.213749, name: 'Prancis', code: 'FR' },
  'FRANCE': { lat: 46.227638, lng: 2.213749, name: 'Prancis', code: 'FR' },
  'ITALIA': { lat: 41.87194, lng: 12.56738, name: 'Italia', code: 'IT' },
  'ITALY': { lat: 41.87194, lng: 12.56738, name: 'Italia', code: 'IT' },
  'SPANYOL': { lat: 40.463667, lng: -3.74922, name: 'Spanyol', code: 'ES' },
  'SPAIN': { lat: 40.463667, lng: -3.74922, name: 'Spanyol', code: 'ES' },
  'BELGIA': { lat: 50.503887, lng: 4.469936, name: 'Belgia', code: 'BE' },
  'BELGIUM': { lat: 50.503887, lng: 4.469936, name: 'Belgia', code: 'BE' },
  'RUSIA': { lat: 61.52401, lng: 105.318756, name: 'Rusia', code: 'RU' },
  'RUSSIA': { lat: 61.52401, lng: 105.318756, name: 'Rusia', code: 'RU' },
  'SWEDIA': { lat: 60.128161, lng: 18.643501, name: 'Swedia', code: 'SE' },
  'SWEDEN': { lat: 60.128161, lng: 18.643501, name: 'Swedia', code: 'SE' },
  'SWIS': { lat: 46.818188, lng: 8.227512, name: 'Swiss', code: 'CH' },
  'SWITZERLAND': { lat: 46.818188, lng: 8.227512, name: 'Swiss', code: 'CH' },

  // AMERIKA
  'AMERIKA SERIKAT': { lat: 37.09024, lng: -95.712891, name: 'Amerika Serikat (USA)', code: 'US' },
  'UNITED STATES': { lat: 37.09024, lng: -95.712891, name: 'Amerika Serikat (USA)', code: 'US' },
  'USA': { lat: 37.09024, lng: -95.712891, name: 'Amerika Serikat (USA)', code: 'US' },
  'KANADA': { lat: 56.130366, lng: -106.346771, name: 'Kanada', code: 'CA' },
  'CANADA': { lat: 56.130366, lng: -106.346771, name: 'Kanada', code: 'CA' },
  'BRASIL': { lat: -14.235004, lng: -51.92528, name: 'Brasil', code: 'BR' },
  'BRAZIL': { lat: -14.235004, lng: -51.92528, name: 'Brasil', code: 'BR' },
  'ARGENTINA': { lat: -38.416097, lng: -63.616672, name: 'Argentina', code: 'AR' },
  'CHILI': { lat: -35.675147, lng: -71.542969, name: 'Chili', code: 'CL' },
  'CHILE': { lat: -35.675147, lng: -71.542969, name: 'Chili', code: 'CL' },
  'MEKSIKO': { lat: 23.634501, lng: -102.552784, name: 'Meksiko', code: 'MX' },
  'MEXICO': { lat: 23.634501, lng: -102.552784, name: 'Meksiko', code: 'MX' },

  // OCEANIA & AFRIKA
  'AUSTRALIA': { lat: -25.274398, lng: 133.775136, name: 'Australia', code: 'AU' },
  'SELANDIA BARU': { lat: -40.900557, lng: 174.885971, name: 'Selandia Baru (New Zealand)', code: 'NZ' },
  'NEW ZEALAND': { lat: -40.900557, lng: 174.885971, name: 'Selandia Baru (New Zealand)', code: 'NZ' },
  'PAPUA NUGINI': { lat: -6.314993, lng: 143.95555, name: 'Papua Nugini', code: 'PG' },
  'PAPUA NEW GUINEA': { lat: -6.314993, lng: 143.95555, name: 'Papua Nugini', code: 'PG' },
  'AFRIKA SELATAN': { lat: -30.559482, lng: 22.937506, name: 'Afrika Selatan', code: 'ZA' },
  'SOUTH AFRICA': { lat: -30.559482, lng: 22.937506, name: 'Afrika Selatan', code: 'ZA' },
  'MESIR': { lat: 26.820553, lng: 30.802498, name: 'Mesir', code: 'EG' },
  'EGYPT': { lat: 26.820553, lng: 30.802498, name: 'Mesir', code: 'EG' },
  'NIGERIA': { lat: 9.081999, lng: 8.675277, name: 'Nigeria', code: 'NG' },
};

/**
 * Normalizes input string (removes prefixes, symbols, spaces, converts to uppercase)
 */
export function normalizeGeoString(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .toUpperCase()
    .replace(/^(KABUPATEN|KAB\.?|KOTA|PROVINSI|PROV\.?|PELABUHAN|PEL\.?|BANDARA|BANDAR UDARA)\s+/i, '')
    .replace(/[.,\-_/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves location string (city, regency, port, province) to one of the 38 Indonesian Provinces
 */
export function resolveProvince(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;

  const rawClean = rawName.trim();
  const normalized = normalizeGeoString(rawClean);

  // 1. Direct exact check in PROVINCE_COORDINATES
  for (const provName of Object.keys(PROVINCE_COORDINATES)) {
    if (provName.toUpperCase() === rawClean.toUpperCase()) {
      return { provinceName: provName, ...PROVINCE_COORDINATES[provName] };
    }
  }

  // 2. Normalized check in PROVINCE_COORDINATES
  for (const provName of Object.keys(PROVINCE_COORDINATES)) {
    if (normalizeGeoString(provName) === normalized) {
      return { provinceName: provName, ...PROVINCE_COORDINATES[provName] };
    }
  }

  // 3. Exact/Normalized check in CITY_TO_PROVINCE_MAP
  if (CITY_TO_PROVINCE_MAP[normalized]) {
    const provName = CITY_TO_PROVINCE_MAP[normalized];
    return { provinceName: provName, ...PROVINCE_COORDINATES[provName] };
  }

  // 4. Substring / Token matching
  for (const [keyCity, provName] of Object.entries(CITY_TO_PROVINCE_MAP)) {
    if (normalized.includes(keyCity) || keyCity.includes(normalized)) {
      return { provinceName: provName, ...PROVINCE_COORDINATES[provName] };
    }
  }

  for (const provName of Object.keys(PROVINCE_COORDINATES)) {
    const normProv = normalizeGeoString(provName);
    if (normalized.includes(normProv) || normProv.includes(normalized)) {
      return { provinceName: provName, ...PROVINCE_COORDINATES[provName] };
    }
  }

  return null;
}

/**
 * Resolves country name to World Country coordinates
 */
export function resolveCountry(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;

  const normalized = normalizeGeoString(rawName);

  // 1. Direct lookup
  if (COUNTRY_COORDINATES[normalized]) {
    return COUNTRY_COORDINATES[normalized];
  }

  // 2. Substring matching
  for (const [countryKey, info] of Object.entries(COUNTRY_COORDINATES)) {
    if (normalized.includes(countryKey) || countryKey.includes(normalized)) {
      return info;
    }
  }

  return null;
}
