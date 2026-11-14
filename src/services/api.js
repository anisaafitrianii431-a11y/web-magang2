import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// Fungsi untuk data awal rekapitulasi (diperlukan oleh RekapitulasiPage)
export const getInitialRekapitulasi = () => {
    return [];
};

export default api;
