import { getInitialRekapitulasi } from '../services/api';

export default function RekapitulasiPage() {
  const data = getInitialRekapitulasi();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rekapitulasi Tugas & Absensi</h1>
          <p className="page-description">
            Memeriksa rekapitulasi kehadiran, persentase absensi, serta pelampiran tanggal tugas & projek yang diberikan.
          </p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <svg className="table-card-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          Rekapitulasi Tugas & Kehadiran Peserta Magang
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>#</th>
              <th>PESERTA & INSTANSI</th>
              <th>PROJEK / TUGAS</th>
              <th>LAMPIRAN TANGGAL PROJEK</th>
              <th>PERSENTASE ABSENSI</th>
              <th>TUGAS SELESAI</th>
              <th>STATUS KEHADIRAN</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>
                  <div className="cell-main-title">{item.nama_peserta}</div>
                  <div className="cell-subtitle">{item.instansi} • {item.jurusan}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.projek}</div>
                </td>
                <td>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '6px', color: '#475569' }}>
                    {item.lampiran_tgl_projek}
                  </span>
                </td>
                <td>
                  {/* Clickable link to Absensi page */}
                  <a 
                    href="#absensi" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.onNavigateToAbsensi) {
                        window.onNavigateToAbsensi(item);
                      } else {
                        alert(`Mengarahkan ke Modul Halaman Absensi untuk peserta: ${item.nama_peserta}`);
                      }
                    }}
                    style={{ textDecoration: 'none' }}
                    title="Klik untuk membuka Halaman Detail Absensi"
                  >
                    <span style={{ fontWeight: 800, color: '#2563eb', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', display: 'inline-block' }}>
                      {item.total_absensi} ➔
                    </span>
                  </a>
                </td>
                <td>
                  {/* Clickable link to Tugas page */}
                  <a 
                    href="#tugas" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.onNavigateToTugas) {
                        window.onNavigateToTugas(item);
                      } else {
                        alert(`Mengarahkan ke Modul Halaman Tugas untuk peserta: ${item.nama_peserta}`);
                      }
                    }}
                    style={{ textDecoration: 'none' }}
                    title="Klik untuk membuka Halaman Detail Tugas"
                  >
                    <span style={{ fontWeight: 700, color: '#059669', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'inline-block' }}>
                      {item.tugas_selesai} / {item.total_tugas} Tugas ➔
                    </span>
                  </a>
                </td>
                <td>
                  <span className="badge badge-disetujui">
                    ● {item.status_kehadiran}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
