"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";
import { translations, type Lang } from "@/app/translations";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Order {
    id: number;
    product_id: number;
    stash_id: number;
    amount_paid: number;
    created_at: string;
}

export default function OrdersSheet({ onClose, lang = "en" }: { onClose: () => void; lang?: Lang }) {
    const t = (key: string) => translations[lang][key] ?? key;

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [stashUrls, setStashUrls] = useState<Record<number, string>>({});
    const [stashLoading, setStashLoading] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        const token = tg?.initData || "/*no-auth*/";

        fetch(`${API_BASE}/orders`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => {
                if (!r.ok) throw new Error("Network response was not ok");
                return r.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    setOrders(data);
                } else if (data && Array.isArray(data.orders)) {
                    setOrders(data.orders);
                    window.sessionStorage.setItem("total_orders", data.orders.length)
                } else {
                    setOrders([]);
                }
            })
            .catch((err) => {
                console.error(err);
                setOrders([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleExpand = async (order: Order) => {
        if (expandedId === order.id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(order.id);

        if (!stashUrls[order.id]) {
            setStashLoading((p) => ({ ...p, [order.id]: true }));
            try {
                const tg = window.Telegram?.WebApp;
                const token = tg?.initData || "/*no-auth*/";
                const res = await fetch(`${API_BASE}/orders/${order.id}/stash`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setStashUrls((p) => ({ ...p, [order.id]: data.src_url }));
            } catch (e) {
                console.error(e);
            } finally {
                setStashLoading((p) => ({ ...p, [order.id]: false }));
            }
        }
    };

    const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
        <div style={{ background: "#111118aa", backdropFilter: "blur(10px)", border: "1px solid #1E1E2A", borderRadius: 20, overflow: "hidden", ...style }}>
            {children}
        </div>
    );

    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "#0A0A0F",
            zIndex: 50,
            display: "flex", flexDirection: "column",
            padding: "0 20px 24px",
            overflowY: "auto",
            paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)",
        }}>
            {/* Динамический градиент на фоне */}
            <div style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none", opacity: 0.15 }}>
                <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "70vw", height: "70vw", borderRadius: "50%", background: "radial-gradient(circle, #5C6BFF 0%, transparent 70%)", filter: "blur(80px)", animation: "revolutPulse 8s infinite alternate" }} />
                <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, #00D2A8 0%, transparent 70%)", filter: "blur(80px)", animation: "revolutPulse 12s infinite alternate-reverse" }} />
            </div>

            {/* Стили для анимации */}
            <style>{`
                @keyframes revolutPulse {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(8%, 5%) scale(1.15); }
                }
            `}</style>

            <div style={{ paddingBottom: 16, marginBottom: 24, borderBottom: "1px solid #1E1E2A" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", margin: 0 }}>
                    {t("orders_title")}
                </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, margin: "0 auto", width: "100%" }}>
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
                        <Spinner size="lg" />
                    </div>
                ) : orders.length === 0 ? (
                    <Card style={{ padding: 16, textAlign: "center" }}>
                        <p style={{ fontSize: 13, color: "#8A8A9A", margin: 0 }}>{t("orders_empty")}</p>
                    </Card>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id}>
                            <button
                                onClick={() => handleExpand(order)}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#1E1E2A44")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Order #{order.id}</p>
                                    <p style={{ fontSize: 11, color: "#8A8A9A", margin: "2px 0 0" }}>
                                        {new Date(order.created_at).toLocaleDateString("en-GB", {
                                            day: "2-digit", month: "short", year: "numeric",
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: "#00D2A8" }}>${order.amount_paid}</span>
                                    <span style={{ color: "#44444F", fontSize: 11, transition: "transform 0.2s", transform: expandedId === order.id ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                                </div>
                            </button>

                            {expandedId === order.id && (
                                <div style={{ borderTop: "1px solid #1E1E2A", padding: 16, background: "#0A0A0F66" }}>
                                    {stashLoading[order.id] ? (
                                        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}><Spinner size="sm" /></div>
                                    ) : stashUrls[order.id] ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#8A8A9A", textTransform: "uppercase", margin: 0 }}>{t("orders_stash")}</p>
                                            <img src={stashUrls[order.id]} alt="Stash" style={{ width: "100%", borderRadius: 14, border: "1px solid #1E1E2A", objectFit: "cover" }} />
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 12, color: "#FF4D6A", textAlign: "center", margin: 0 }}>{t("orders_stash_error")}</p>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}