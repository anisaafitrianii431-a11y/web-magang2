import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPembimbing() {
  const navigate = useNavigate();
  const [anakBimbingan] = useState([
    {
      id: 1,
      nama: 'Budi Santoso',
      instansi: 'Politeknik Negeri Padang',
      periode: 'Gelombang 1 2026',
      status: 'Pemagang Aktif',
      nilai: '-',
    },
    {
      id: 2,
      nama: 'Siti Aminah',
      instansi: 'Universitas Andalas',
      periode: 'Gelombang 1 2026',
      status: 'Selesai Magang',
      nilai: 'A',
    },
  ]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        background: '#f8fafc',
      }}
    >
      <header
        style={{
          background: '#1e293b',
          padding: '15px 30px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '35px',
              height: '35px',
              background: '#3b82f6',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '18px',
            }}
          >
            👨‍🏫
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>
              Panel Pembimbing
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              MagangAdmin System
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              Dr. Hendra, S.T., M.Kom
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Dosen Pembimbing
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main
        style={{
          padding: '30px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <div style={{ marginBottom: '25px' }}>
            <h2
              style={{
                margin: '0 0 5px',
                color: '#0f172a',
                fontSize: '24px',
              }}
            >
              Daftar Anak Bimbingan
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Pantau perkembangan dan berikan nilai evaluasi untuk
              mahasiswa/siswa bimbingan Anda.
            </p>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '18px' }}>📋</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#0f172a',
                }}
              >
                Data Pemagang Aktif ({anakBimbingan.length})
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                    <th style={headerCellStyle}>Nama &amp; Instansi</th>
                    <th style={headerCellStyle}>Periode</th>
                    <th style={headerCellStyle}>Status</th>
                    <th style={headerCellStyle}>Nilai Akhir</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>
                      Aksi (Tugas Teman)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anakBimbingan.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom:
                          index === anakBimbingan.length - 1
                            ? 'none'
                            : '1px solid #e2e8f0',
                      }}
                    >
                      <td style={bodyCellStyle}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                          {item.nama}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                          {item.instansi}
                        </div>
                      </td>
                      <td style={bodyCellStyle}>{item.periode}</td>
                      <td style={bodyCellStyle}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background:
                              item.status === 'Pemagang Aktif' ? '#dcfce7' : '#e0e7ff',
                            color:
                              item.status === 'Pemagang Aktif' ? '#166534' : '#3730a3',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={bodyCellStyle}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: item.nilai === '-' ? '#94a3b8' : '#0f172a',
                          }}
                        >
                          {item.nilai}
                        </span>
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: 'right' }}>
                        <button
                          type="button"
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px solid #bfdbfe',
                            padding: '6px 12px',
                            marginRight: '8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Lihat Laporan
                        </button>
                        <button
                          type="button"
                          style={{
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Input Nilai
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const headerCellStyle = {
  padding: '15px 20px',
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase',
};

const bodyCellStyle = {
  padding: '15px 20px',
  fontSize: '14px',
  color: '#334155',
};
