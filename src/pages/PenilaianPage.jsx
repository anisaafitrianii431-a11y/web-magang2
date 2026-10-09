export default function PenilaianPage({ laporanList, currentRole }) {
  const evaluatedList = laporanList.filter(item => item.nilai_laporan !== null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rekapitulasi Penilaian Laporan</h1>
          <p className="page-description">
            Daftar hasil evaluasi, predikat poin nilai, serta catatan pembimbing untuk laporan akhir magang.
          </p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <svg className="table-card-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Daftar Laporan yang Sudah Dinilai Pembimbing
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>#</th>
              <th>PESERTA & LAPORAN</th>
              <th>JUDUL PENILAIAN</th>
              <th>PREDIKAT (POIN NILAI)</th>
              {currentRole === 'pembimbing' && <th>NILAI ANGKA</th>}
              <th>TANGGAL DINILAI</th>
              <th>CATATAN EVALUASI</th>
            </tr>
          </thead>
          <tbody>
            {evaluatedList.length === 0 ? (
              <tr>
                <td colSpan={currentRole === 'pembimbing' ? "7" : "6"} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Belum ada laporan yang telah diberi penilaian akhir.
                </td>
              </tr>
            ) : (
              evaluatedList.map((item, idx) => {
                const pen = item.penilaian && item.penilaian[0] ? item.penilaian[0] : null;
                const predikatText = item.poin_nilai || (pen ? pen.poin_nilai : 'A (Sangat Baik)');
                return (
                  <tr key={item.id_laporan}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="cell-main-title">{item.nama_peserta || 'Peserta Magang'}</div>
                      <div className="cell-subtitle">{item.judul_laporan}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        {pen ? pen.judul_nilai : 'Penilaian Akhir Laporan'}
                      </span>
                    </td>
                    <td>
                      <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.65rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem' }}>
                        {predikatText}
                      </span>
                    </td>
                    {currentRole === 'pembimbing' && (
                      <td>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                          {item.nilai_laporan} / 100
                        </span>
                      </td>
                    )}
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {item.tanggal_dinilai ? item.tanggal_dinilai.split(' ')[0] : '2026-09-15'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#334155', maxWidth: '280px' }}>
                        "{pen ? pen.catatan : 'Hasil implementasi dan dokumentasi sangat baik.'}"
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
