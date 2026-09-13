import React from 'react';
import mapData from './indonesiaSvgPaths.json';

/**
 * TradeRouteAnimation
 * Peta Indonesia realistis berdasarkan data geografis resmi (38 provinsi)
 * dengan animasi pergerakan lalu lintas komoditas karantina domestik dan ekspor.
 */
export default function TradeRouteAnimation() {
  const { ports, sulutPath, sulawesiPath, indonesiaPath } = mapData;

  // Koordinat pelabuhan utama:
  // bitung_manado: [581.4, 122.9]
  // jakarta: [246.5, 276.3]
  // surabaya: [353.6, 298.6]
  // makassar: [475.8, 256.3]
  // medan: [96.7, 75.3]
  // balikpapan: [428.4, 177.8]
  // pontianak: [291.5, 152.6]
  // denpasar: [398.9, 330.0]
  // ambon: [636.3, 227.5]
  // sorong: [692.4, 170.1]
  // jayapura: [865.5, 203.7]
  // kupang: [552.1, 359.1]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg
        viewBox="0 0 900 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          {/* Efek Glow untuk Node & Partikel */}
          <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hubGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradien untuk Rute Ekspor Keluar Indonesia */}
          <linearGradient id="exportNorthGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="exportWestGrad" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="exportEastGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <style>{`
          @keyframes dashStream {
            to { stroke-dashoffset: -36; }
          }
          @keyframes pulseHub {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.15); opacity: 1; }
          }
          @keyframes radarWave {
            0% { r: 6px; opacity: 0.6; }
            100% { r: 24px; opacity: 0; }
          }
          @keyframes radarWave2 {
            0% { r: 6px; opacity: 0.5; }
            100% { r: 34px; opacity: 0; }
          }
          .route-domestic {
            stroke: #2563EB;
            stroke-width: 1.2;
            stroke-dasharray: 4 8;
            stroke-linecap: round;
            opacity: 0.4;
            animation: dashStream 1.8s linear infinite;
          }
          .route-export {
            stroke: #38BDF8;
            stroke-width: 1.5;
            stroke-dasharray: 6 8;
            stroke-linecap: round;
            opacity: 0.6;
            animation: dashStream 1.5s linear infinite;
          }
          .particle-domestic {
            fill: #60A5FA;
            filter: url(#mapGlow);
          }
          .particle-export {
            fill: #38BDF8;
            filter: url(#mapGlow);
          }
          .hub-ring {
            fill: none;
            stroke: #38BDF8;
            stroke-width: 1.5;
            transform-origin: 581.4px 122.9px;
            animation: radarWave 2.8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
          }
          .hub-ring-outer {
            fill: none;
            stroke: #60A5FA;
            stroke-width: 1;
            transform-origin: 581.4px 122.9px;
            animation: radarWave2 2.8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 0.7s;
          }
          .hub-core {
            fill: #38BDF8;
            filter: url(#hubGlow);
            transform-origin: 581.4px 122.9px;
            animation: pulseHub 2s ease-in-out infinite;
          }
          .port-node {
            fill: #60A5FA;
            opacity: 0.75;
          }
        `}</style>

        {/* ================= 1. PETA WILAYAH INDONESIA (GIS REALISTIS) ================= */}

        {/* Seluruh Pulau Indonesia (Sumatra, Jawa, Kalimantan, Bali, NTT, Maluku, Papua) */}
        <path
          d={indonesiaPath}
          fill="rgba(148, 163, 184, 0.12)"
          stroke="rgba(148, 163, 184, 0.35)"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />

        {/* Pulau Sulawesi (Highlight Regional) */}
        <path
          d={sulawesiPath}
          fill="rgba(59, 130, 246, 0.18)"
          stroke="rgba(96, 165, 250, 0.55)"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* Sulawesi Utara (Focus Unit Kerja BKHIT Sulut) */}
        <path
          d={sulutPath}
          fill="rgba(37, 99, 235, 0.35)"
          stroke="rgba(56, 189, 248, 0.8)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          filter="url(#mapGlow)"
        />

        {/* ================= 2. JALUR LALU LINTAS DOMESTIK ================= */}

        {/* D1: Jakarta <-> Bitung/Manado */}
        <path
          id="route-jkt-btg"
          className="route-domestic"
          d="M 246.5,276.3 C 340,240 460,180 581.4,122.9"
        />

        {/* D2: Surabaya <-> Makassar */}
        <path
          id="route-sby-mks"
          className="route-domestic"
          d="M 353.6,298.6 C 395,285 435,275 475.8,256.3"
        />

        {/* D3: Makassar <-> Bitung/Manado */}
        <path
          id="route-mks-btg"
          className="route-domestic"
          d="M 475.8,256.3 C 510,215 545,165 581.4,122.9"
        />

        {/* D4: Medan <-> Jakarta */}
        <path
          id="route-mdn-jkt"
          className="route-domestic"
          d="M 96.7,75.3 C 145,130 190,210 246.5,276.3"
        />

        {/* D5: Balikpapan <-> Bitung/Manado */}
        <path
          id="route-bpn-btg"
          className="route-domestic"
          d="M 428.4,177.8 C 475,160 530,140 581.4,122.9"
        />

        {/* D6: Pontianak <-> Jakarta */}
        <path
          id="route-pnk-jkt"
          className="route-domestic"
          d="M 291.5,152.6 C 275,190 260,235 246.5,276.3"
        />

        {/* D7: Bitung/Manado <-> Sorong (Papua Barat) */}
        <path
          id="route-btg-srg"
          className="route-domestic"
          d="M 581.4,122.9 C 615,135 650,150 692.4,170.1"
        />

        {/* D8: Sorong <-> Jayapura */}
        <path
          id="route-srg-jyp"
          className="route-domestic"
          d="M 692.4,170.1 C 745,175 805,190 865.5,203.7"
        />

        {/* D9: Surabaya <-> Denpasar <-> Kupang */}
        <path
          id="route-sby-dps-kpg"
          className="route-domestic"
          d="M 353.6,298.6 C 375,315 398.9,330 460,345 C 505,355 552.1,359.1 552.1,359.1"
        />

        {/* D10: Bitung/Manado <-> Ambon (Maluku) */}
        <path
          id="route-btg-amb"
          className="route-domestic"
          d="M 581.4,122.9 C 600,155 618,190 636.3,227.5"
        />

        {/* ================= 3. JALUR EKSPOR KELUAR INDONESIA ================= */}

        {/* E1: EKSPOR UTAMA DARI BITUNG/SULUT KE UTARA (Filipina, Jepang, Pasifik Utara) */}
        <path
          id="route-exp-north"
          className="route-export"
          d="M 581.4,122.9 C 600,75 625,35 650,-10"
        />

        {/* E2: EKSPOR DARI BITUNG/SULUT KE TIMUR LAUT (Pasifik / Amerika) */}
        <path
          id="route-exp-northeast"
          className="route-export"
          d="M 581.4,122.9 C 660,95 760,65 890,20"
        />

        {/* E3: EKSPOR BARAT DARI MEDAN / SELAT MALAKA (Internasional Asia / Eropa) */}
        <path
          id="route-exp-west"
          className="route-export"
          d="M 96.7,75.3 C 65,50 35,25 -10,-10"
        />

        {/* E4: EKSPOR DARI JAKARTA KE SAMUDRA HINDIA */}
        <path
          id="route-exp-southwest"
          className="route-export"
          d="M 246.5,276.3 C 210,315 170,360 120,420"
        />

        {/* E5: EKSPOR DARI JAYAPURA (Pasifik Timur) */}
        <path
          id="route-exp-east"
          className="route-export"
          d="M 865.5,203.7 C 880,205 900,208 920,210"
        />

        {/* ================= 4. PARTIKEL ANIMASI LALU LINTAS (DOMESTIK) ================= */}

        {/* Partikel Jakarta -> Bitung */}
        <circle r="2.8" className="particle-domestic">
          <animateMotion dur="4.2s" repeatCount="indefinite">
            <mpath href="#route-jkt-btg" />
          </animateMotion>
        </circle>
        <circle r="2" className="particle-domestic" opacity="0.6">
          <animateMotion dur="4.2s" begin="2.1s" repeatCount="indefinite">
            <mpath href="#route-jkt-btg" />
          </animateMotion>
        </circle>

        {/* Partikel Surabaya -> Makassar */}
        <circle r="2.5" className="particle-domestic">
          <animateMotion dur="3s" begin="0.3s" repeatCount="indefinite">
            <mpath href="#route-sby-mks" />
          </animateMotion>
        </circle>

        {/* Partikel Makassar -> Bitung */}
        <circle r="2.6" className="particle-domestic">
          <animateMotion dur="3.2s" begin="0.8s" repeatCount="indefinite">
            <mpath href="#route-mks-btg" />
          </animateMotion>
        </circle>
        <circle r="1.8" className="particle-domestic" opacity="0.5">
          <animateMotion dur="3.2s" begin="2.4s" repeatCount="indefinite">
            <mpath href="#route-mks-btg" />
          </animateMotion>
        </circle>

        {/* Partikel Medan -> Jakarta */}
        <circle r="2.4" className="particle-domestic">
          <animateMotion dur="3.8s" begin="0.5s" repeatCount="indefinite">
            <mpath href="#route-mdn-jkt" />
          </animateMotion>
        </circle>

        {/* Partikel Balikpapan -> Bitung */}
        <circle r="2.4" className="particle-domestic">
          <animateMotion dur="3s" begin="1.2s" repeatCount="indefinite">
            <mpath href="#route-bpn-btg" />
          </animateMotion>
        </circle>

        {/* Partikel Pontianak -> Jakarta */}
        <circle r="2" className="particle-domestic" opacity="0.7">
          <animateMotion dur="3.2s" begin="1.5s" repeatCount="indefinite">
            <mpath href="#route-pnk-jkt" />
          </animateMotion>
        </circle>

        {/* Partikel Bitung -> Sorong */}
        <circle r="2.5" className="particle-domestic">
          <animateMotion dur="3.5s" begin="0.4s" repeatCount="indefinite">
            <mpath href="#route-btg-srg" />
          </animateMotion>
        </circle>

        {/* Partikel Sorong -> Jayapura */}
        <circle r="2.2" className="particle-domestic">
          <animateMotion dur="3.8s" begin="1.8s" repeatCount="indefinite">
            <mpath href="#route-srg-jyp" />
          </animateMotion>
        </circle>

        {/* Partikel Surabaya -> Bali -> Kupang */}
        <circle r="2.2" className="particle-domestic">
          <animateMotion dur="4.5s" begin="0.9s" repeatCount="indefinite">
            <mpath href="#route-sby-dps-kpg" />
          </animateMotion>
        </circle>

        {/* Partikel Bitung -> Ambon */}
        <circle r="2.2" className="particle-domestic">
          <animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite">
            <mpath href="#route-btg-amb" />
          </animateMotion>
        </circle>

        {/* ================= 5. PARTIKEL ANIMASI LALU LINTAS (EKSPOR KELUAR) ================= */}

        {/* Ekspor Bitung -> Utara (Asia Timur) */}
        <circle r="3.2" className="particle-export">
          <animateMotion dur="2.8s" begin="0s" repeatCount="indefinite">
            <mpath href="#route-exp-north" />
          </animateMotion>
        </circle>
        <circle r="2" className="particle-export" opacity="0.6">
          <animateMotion dur="2.8s" begin="1.4s" repeatCount="indefinite">
            <mpath href="#route-exp-north" />
          </animateMotion>
        </circle>

        {/* Ekspor Bitung -> Timur Laut (Pasifik) */}
        <circle r="3" className="particle-export">
          <animateMotion dur="3.6s" begin="0.8s" repeatCount="indefinite">
            <mpath href="#route-exp-northeast" />
          </animateMotion>
        </circle>
        <circle r="1.8" className="particle-export" opacity="0.5">
          <animateMotion dur="3.6s" begin="2.6s" repeatCount="indefinite">
            <mpath href="#route-exp-northeast" />
          </animateMotion>
        </circle>

        {/* Ekspor Medan -> Barat */}
        <circle r="2.6" className="particle-export">
          <animateMotion dur="2.6s" begin="0.3s" repeatCount="indefinite">
            <mpath href="#route-exp-west" />
          </animateMotion>
        </circle>

        {/* Ekspor Jakarta -> Barat Daya */}
        <circle r="2.6" className="particle-export">
          <animateMotion dur="3s" begin="1.1s" repeatCount="indefinite">
            <mpath href="#route-exp-southwest" />
          </animateMotion>
        </circle>

        {/* Ekspor Jayapura -> Timur */}
        <circle r="2.4" className="particle-export">
          <animateMotion dur="2.2s" begin="0.7s" repeatCount="indefinite">
            <mpath href="#route-exp-east" />
          </animateMotion>
        </circle>

        {/* ================= 6. TITIK NODE PELABUHAN ================= */}

        {/* Node Domestik Pendukung (Titik halus tanpa label) */}
        <circle cx="246.5" cy="276.3" r="3.2" className="port-node" />
        <circle cx="353.6" cy="298.6" r="3" className="port-node" />
        <circle cx="475.8" cy="256.3" r="3.2" className="port-node" />
        <circle cx="96.7" cy="75.3" r="3" className="port-node" />
        <circle cx="428.4" cy="177.8" r="2.8" className="port-node" />
        <circle cx="291.5" cy="152.6" r="2.8" className="port-node" />
        <circle cx="398.9" cy="330.0" r="2.5" className="port-node" />
        <circle cx="636.3" cy="227.5" r="2.8" className="port-node" />
        <circle cx="692.4" cy="170.1" r="3" className="port-node" />
        <circle cx="865.5" cy="203.7" r="3" className="port-node" />
        <circle cx="552.1" cy="359.1" r="2.5" className="port-node" />

        {/* PUSAT OPERASIONAL: BITUNG / MANADO (SULUT) - RADAR PULSE EFFECT */}
        <circle cx="581.4" cy="122.9" r="6" className="hub-ring" />
        <circle cx="581.4" cy="122.9" r="6" className="hub-ring-outer" />
        <circle cx="581.4" cy="122.9" r="5" className="hub-core" />
      </svg>
    </div>
  );
}
