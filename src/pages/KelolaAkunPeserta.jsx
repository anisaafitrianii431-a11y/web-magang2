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
    const [participants, setParticipants] = useState([]);
    const [selectedParticipants, setSelectedParticipants] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [savingAccountId, setSavingAccountId] = useState(null);
    const visibleAccounts = accounts.filter((account) => account.email !== "peserta@absensi.com");

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            const [accountResult, participantResult] = await Promise.allSettled([
                api.get("/users/peserta"),
                api.get("/magang"),
            ]);
            if (cancelled) return;

            const loadErrors = [];
            if (accountResult.status === "fulfilled") {
                const accountData = accountResult.value.data?.data || accountResult.value.data || [];
                setAccounts(Array.isArray(accountData) ? accountData : []);
            } else {
                loadErrors.push(
                    accountResult.reason?.response?.data?.message || "Daftar akun peserta gagal dimuat."
                );
            }

            if (participantResult.status === "fulfilled") {
                const participantData = participantResult.value.data?.data || participantResult.value.data || [];
                setParticipants(
                    Array.isArray(participantData)
                        ? participantData.filter((participant) => participant.status === "Aktif")
                        : []
                );
            } else {
                loadErrors.push(
                    participantResult.reason?.response?.data?.message || "Daftar NPM peserta gagal dimuat."
                );
            }

            setError(loadErrors.join(" "));
            setLoading(false);
        };

        void loadData();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleLinkParticipant = async (account) => {
        const participantCode = selectedParticipants[account.id];
        if (!participantCode) {
            setError("Pilih NPM peserta yang ingin dihubungkan.");
            setSuccess("");
            return;
        }

        setError("");
        setSuccess("");
        setSavingAccountId(account.id);

        try {
            let response;
            try {
                response = await api.put(`/users/${account.id}/peserta`, {
                    participant_code: participantCode,
                });
            } catch (requestError) {
                if (requestError.response?.status !== 409) {
                    throw requestError;
                }

                const shouldReplace = window.confirm(
                    `${requestError.response.data.message}\n\nPindahkan tautan NPM ini ke akun ${account.email}?`
                );
                if (!shouldReplace) return;

                response = await api.put(`/users/${account.id}/peserta`, {
                    participant_code: participantCode,
                    replace_existing: true,
                });
            }

            const linkedAccount = response.data?.data;
            const previousAccountId = response.data?.previous_account_id;
            setAccounts((currentAccounts) => currentAccounts.map((currentAccount) => {
                if (currentAccount.id === account.id) {
                    return linkedAccount || currentAccount;
                }
                if (currentAccount.id === previousAccountId) {
                    return { ...currentAccount, magang: null, magang_id: null };
                }
                return currentAccount;
            }));
            setSelectedParticipants((current) => ({ ...current, [account.id]: "" }));
            setSuccess(response.data?.message || "Akun berhasil dihubungkan ke NPM peserta.");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message
                || "Akun gagal dihubungkan ke NPM peserta."
            );
        } finally {
            setSavingAccountId(null);
        }
    };

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
                    {success && <div className="message success" role="status" style={{ marginBottom: "16px" }}>{success}</div>}

                    <div className="table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama akun</th>
                                    <th>Email</th>
                                    <th>NPM/NIM peserta</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" className="empty">Memuat akun peserta...</td></tr>
                                ) : visibleAccounts.length === 0 ? (
                                    <tr><td colSpan="4" className="empty">Belum ada akun peserta.</td></tr>
                                ) : visibleAccounts.map((account) => (
                                    <tr key={account.id}>
                                        <td>{account.name}</td>
                                        <td>{account.email}</td>
                                        <td>
                                            {account.magang
                                                ? `${account.magang.participant_code} - ${account.magang.participant_name}`
                                                : "-"}
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "8px", minWidth: "260px" }}>
                                                <select
                                                    aria-label={`Pilih NPM untuk ${account.email}`}
                                                    value={selectedParticipants[account.id] || ""}
                                                    onChange={(event) => setSelectedParticipants((current) => ({
                                                        ...current,
                                                        [account.id]: event.target.value,
                                                    }))}
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                        padding: "8px",
                                                        border: "1px solid #cbd5e1",
                                                        borderRadius: "6px",
                                                        background: "#fff",
                                                        color: "#334155",
                                                    }}
                                                >
                                                    <option value="">Pilih NPM aktif</option>
                                                    {participants.map((participant) => (
                                                        <option key={participant.id} value={participant.participant_code}>
                                                            {participant.participant_code} - {participant.participant_name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleLinkParticipant(account)}
                                                    disabled={savingAccountId === account.id || participants.length === 0}
                                                    style={{
                                                        padding: "8px 12px",
                                                        border: 0,
                                                        borderRadius: "6px",
                                                        background: "#4f46e5",
                                                        color: "#fff",
                                                        cursor: savingAccountId === account.id || participants.length === 0 ? "not-allowed" : "pointer",
                                                        opacity: savingAccountId === account.id || participants.length === 0 ? 0.6 : 1,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {savingAccountId === account.id ? "Menyimpan..." : "Hubungkan"}
                                                </button>
                                            </div>
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
