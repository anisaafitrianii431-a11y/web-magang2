import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Magang() {
    const [magangs, setMagangs] = useState([]);
    const [form, setForm] = useState({
        participant_code: "",
        participant_name: "",
        institution: "",
    });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const loadMagang = async () => {
        try {
            const response = await api.get("/magang");
            setMagangs(response.data || []);
        } catch (requestError) {
            setError("Gagal memuat data magang.");
        }
    };

    useEffect(() => {
        loadMagang();
    }, []);

    const updateForm = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value });
    };

    const submitMagang = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            const response = await api.post("/magang", {
                participant_code: form.participant_code.trim().toUpperCase(),
                participant_name: form.participant_name.trim(),
                institution: form.institution.trim(),
            });

            setMessage(response.data.message || "Data magang berhasil ditambahkan.");
            setForm({ participant_code: "", participant_name: "", institution: "" });
            await loadMagang();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Gagal menambahkan magang.");
        }
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">DAFTAR MAGANG</p>
                            <h1>Tambah peserta magang</h1>
                            <p className="subtitle">Kelola daftar peserta yang dapat melakukan absensi.</p>
                        </div>
                    </div>

                    <section className="setup-panel">
                        <form className="participant-form" onSubmit={submitMagang}>
                            <label>
                                Kode peserta
                                <input
                                    name="participant_code"
                                    value={form.participant_code}
                                    onChange={updateForm}
                                    placeholder="Contoh: MAG-024"
                                    required
                                />
                            </label>

                            <label>
                                Nama lengkap
                                <input
                                    name="participant_name"
                                    value={form.participant_name}
                                    onChange={updateForm}
                                    placeholder="Nama peserta magang"
                                    required
                                />
                            </label>

                            <label>
                                Asal sekolah / instansi
                                <input
                                    name="institution"
                                    value={form.institution}
                                    onChange={updateForm}
                                    placeholder="Contoh: SMK Negeri 1"
                                />
                            </label>

                            <button className="btn-primary" type="submit">Tambah magang</button>
                        </form>

                        {(message || error) && (
                            <div className={error ? "message error" : "message"}>{error || message}</div>
                        )}
                    </section>

                    <section className="table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Nama</th>
                                    <th>Instansi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {magangs.length ? (
                                    magangs.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.participant_code}</td>
                                            <td>{item.participant_name}</td>
                                            <td>{item.institution || "-"}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="empty">Belum ada data magang.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default Magang;
