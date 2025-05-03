import { useEffect, useState } from "react";

export default function useGlobalSettings() {
    const [loading, setLoading] = useState(true);
    // const rawFormula = data.settings?.adNameFormula || {};
    // const defaultOrder = ["adType", "dateType", "fileName"];
    const [adNameFormula, setAdNameFormula] = useState({
        order: ["adType", "dateType", "fileName"], // default order
        values: {
            adType: "",
            dateType: "",
            useFileName: false,
        },
    });


    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/global", {
                    credentials: "include",
                });
                const data = await res.json();
                const rawFormula = data.settings?.adNameFormula || {};
                const defaultOrder = ["adType", "dateType", "fileName"];
                setAdNameFormula({
                    order: rawFormula.order || defaultOrder,
                    values: {
                        adType: rawFormula.values?.adType || "",
                        dateType: rawFormula.values?.dateType || "",
                        useFileName: rawFormula.values?.useFileName || false
                    }
                });


            } catch (err) {
                console.error("Failed to fetch global settings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    return {
        loading,
        adNameFormula,
        setAdNameFormula,
    };
}
