import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function SuratBalasan() {
  const navigate = useNavigate();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

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

  const downloadReplyLetter = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await api.get("/pendaftaran/me/surat-balasan/download", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = String(registration?.file_surat_balasan || "surat-balasan.pdf").split("/").pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      navigate("/absensi", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Surat balasan gagal diunduh. Silakan coba lagi.");
    } finally {
      setDownloading(false);
    }
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
                <button type="button" className="surat-balasan-download" onClick={downloadReplyLetter} disabled={downloading}>
                  {downloading ? "Mengunduh..." : "Unduh Surat Balasan"}
                </button>
              </div>
            </>
          ) : (
            <p className="surat-balasan-message">Surat balasan belum diunggah oleh admin.</p>
          )}
        </section>

      </section>
    </main>
  );
}
