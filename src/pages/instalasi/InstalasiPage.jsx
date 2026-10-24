import { Construction, Warehouse } from 'lucide-react';

const INSTALASI_TITLES = {
  ikh: {
    title: 'Instalasi Karantina Hewan (IKH)',
    desc: 'Monitoring dan sertifikasi kelayakan sarana Instalasi Karantina Hewan di Sulawesi Utara',
  },
  iki: {
    title: 'Instalasi Karantina Ikan (IKI)',
    desc: 'Monitoring dan sertifikasi kelayakan sarana Instalasi Karantina Ikan di Sulawesi Utara',
  },
  ikt: {
    title: 'Instalasi Karantina Tumbuhan (IKT)',
    desc: 'Monitoring dan sertifikasi kelayakan sarana Instalasi Karantina Tumbuhan di Sulawesi Utara',
  },
};

export default function InstalasiPage({ jenis = 'ikh' }) {
  const current = INSTALASI_TITLES[jenis] || INSTALASI_TITLES.ikh;

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
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Warehouse size={18} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{current.title}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {current.desc}
          </p>
        </div>
      </div>

      {/* Under Construction State */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          color: 'var(--text-muted)',
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
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber)',
            marginBottom: '1rem',
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
          Halaman sedang dalam Tahap Pengembangan
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: 1.5,
          }}
        >
          Data operasional dan status sertifikasi teknis untuk {current.title} sedang disiapkan untuk integrasi pada pembaruan mendatang.
        </p>
      </div>
    </div>
  );
}
