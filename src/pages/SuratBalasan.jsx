import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function getFileUrl(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${backendUrl}/${String(path).replace(/^\//, "")}`;
}

export default function SuratBalasan() {
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/pendaftaran/me")
      .then((response) => {
        if (active) setRegistration(response.data?.data || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Data surat balasan belum dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const openParticipantPortal = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const letterKey = `surat-balasan-dilihat:${user.id}:${registration?.id}:${registration?.file_surat_balasan || "tanpa-surat"}`;
    localStorage.setItem(letterKey, "true");
    navigate("/tugas", { replace: true });
  };

  const hasReplyLetter = Boolean(registration?.file_surat_balasan);

  return (
    <main className="surat-balasan-welcome">
      <section className="surat-balasan-welcome-card">
        <div className="surat-balasan-welcome-header">
          <div className="surat-balasan-welcome-logo" aria-hidden="true">🎓</div>
          <p className="eyebrow">PENDAFTARAN MAGANG</p>
          <h1>Selamat, Anda Diterima!</h1>
          <p>Anda telah resmi menjadi peserta magang. Surat balasan dari pengelola tersedia di bawah ini.</p>
        </div>

        <section className="surat-balasan-card">
          {loading ? (
            <p className="surat-balasan-message">Memuat surat balasan...</p>
          ) : error ? (
            <p className="surat-balasan-message is-error">{error}</p>
          ) : !registration ? (
            <p className="surat-balasan-message">Data pendaftaran tidak ditemukan.</p>
          ) : hasReplyLetter ? (
            <>
              <div className="surat-balasan-icon" aria-hidden="true">📄</div>
              <div className="surat-balasan-content">
                <span className="surat-balasan-label">SURAT BALASAN RESMI</span>
                <h2>Dokumen Anda sudah tersedia</h2>
                <p>Surat balasan untuk periode <strong>{registration.periode?.nama_periode || "magang"}</strong> dapat diunduh sekarang.</p>
                <p className="surat-balasan-file">{String(registration.file_surat_balasan).split("/").pop()}</p>
                <a className="surat-balasan-download" href={getFileUrl(registration.file_surat_balasan)} target="_blank" rel="noopener noreferrer">
                  Unduh Surat Balasan
                </a>
              </div>
            </>
          ) : (
            <p className="surat-balasan-message">Surat balasan belum diunggah oleh admin.</p>
          )}
        </section>

        {!loading && !error && registration && (
          <button type="button" className="surat-balasan-continue" onClick={openParticipantPortal}>
            Masuk ke Portal Peserta
          </button>
        )}
      </section>
    </main>
  );
}
