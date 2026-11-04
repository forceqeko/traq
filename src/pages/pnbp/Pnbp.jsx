import { Receipt, Construction, CheckCircle2 } from 'lucide-react';

export default function Pnbp() {
  const upcomingFeatures = [
    {
      title: 'Rekapitulasi Tarif & Realisasi PNBP',
      desc: 'Pemantauan penerimaan PNBP berdasarkan jenis layanan operasional karantina hewan, ikan, dan tumbuhan.',
    },
    {
      title: 'Analisis Tren & Target Penerimaan',
      desc: 'Perbandingan realisasi pendapatan terhadap target PNBP berkala per Satpel dan Pospel.',
    },
    {
      title: 'Rekonsiliasi Pembayaran & Billing SIMPONI',
      desc: 'Integrasi dan pelacakan status pembayaran kode billing penerimaan negara secara akurat.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={18} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Penerimaan Negara Bukan Pajak (PNBP)</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Monitoring dan rekapitulasi realisasi penerimaan negara bukan pajak dari layanan karantina.
          </p>
        </div>
      </div>

      {/* Under Construction Notice Card */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--surface-2, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber, #f59e0b)',
            marginBottom: '1.25rem',
          }}
        >
          <Construction size={32} />
        </div>
        <h3
          style={{
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          Halaman Sedang Dalam Tahap Pengembangan
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            maxWidth: '560px',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          Modul analitik dan pelaporan Penerimaan Negara Bukan Pajak (PNBP) sedang dalam proses perancangan sistem serta integrasi data transaksi layanan karantina. Fitur ini akan tersedia pada rilis pembaruan berikutnya.
        </p>

        {/* Preview of Planned Capabilities */}
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            textAlign: 'left',
          }}
        >
          {upcomingFeatures.map((feat, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--surface-2, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--primary, #3b82f6)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  marginBottom: '0.375rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{feat.title}</span>
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted, #94a3b8)',
                  lineHeight: 1.45,
                  margin: 0,
                }}
              >
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

