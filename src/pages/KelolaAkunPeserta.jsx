import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import api from "../services/api";

function KelolaAkunPeserta() {
    const role = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null")?.role?.toLowerCase();
        } catch {
            return null;
        }
    })();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const visibleAccounts = accounts.filter((account) => account.email !== "peserta@absensi.com");

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            try {
                const accountResponse = await api.get("/users/peserta");
                if (cancelled) return;

                const accountData = accountResponse.data?.data || accountResponse.data || [];
                const accountList = Array.isArray(accountData) ? accountData : [];
                setAccounts(accountList);
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Daftar akun dan peserta gagal dimuat.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadData();
        return () => {
            cancelled = true;
        };
    }, []);

    if (role !== "admin") {
        const destination = role === "pembimbing"
            ? "/pembimbing"
            : role === "peserta"
                ? "/absensi"
                : "/login";
        return <Navigate to={destination} replace />;
    }

    return (
        <div className="layout">
            <Sidebar />
            <div className="content">
                <Navbar />
                <main className="main">
                    {error && <div className="message error" role="alert" style={{ marginBottom: "16px" }}>{error}</div>}

                    <div className="table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama akun</th>
                                    <th>Email</th>
                                    <th>NPM/NIM peserta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="3" className="empty">Memuat akun peserta...</td></tr>
                                ) : visibleAccounts.length === 0 ? (
                                    <tr><td colSpan="3" className="empty">Belum ada akun peserta.</td></tr>
                                ) : visibleAccounts.map((account) => (
                                    <tr key={account.id}>
                                        <td>{account.name}</td>
                                        <td>{account.email}</td>
                                        <td>
                                            {account.magang
                                                ? `${account.magang.participant_code} - ${account.magang.participant_name}`
                                                : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default KelolaAkunPeserta;
