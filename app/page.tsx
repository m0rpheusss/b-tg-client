// @/app/page.jsx
"use client";

import {
    Accordion,
    Alert,
    Button,
    ButtonGroup,
    Spinner,
    Surface,
    ListBox,
    Header, Description, Label, Switch
} from "@heroui/react";
import React, {useEffect, useRef, useState, useCallback, use} from "react";
import RenderShop from "@/app/conponents/shop/RenderShop";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import OrdersSheet from "@/app/conponents/OrdersSheet";
import { translations, langLabels, type Lang } from "@/app/translations";

type SheetType = "firstaid" | "promo" | "support" | "orders" | null;
const LANG_STORAGE_KEY = "app_lang";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function PromoSheet({ t, user, fetchUserData, base }) {
    const [promoCodeValue, setPromoCodeValue] = useState("");
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoStatus, setPromoStatus] = useState({ type: "", message: "" });

    function triggerHaptic(type = "impact", style = "medium") {
        const hf = window.Telegram?.WebApp?.HapticFeedback;
        if (!hf) return;
        try {
            if (type === "impact") hf.impactOccurred(style);
            else if (type === "notification") hf.notificationOccurred(style);
            else if (type === "selection") hf.selectionChanged();
        } catch {}
    }

    const handleClaimPromo = async () => {
        if (!promoCodeValue.trim()) return;

        try {
            setPromoLoading(true);
            setPromoStatus({ type: "", message: "" });
            triggerHaptic("impact", "medium");

            const tok = window.Telegram?.WebApp?.initData || "/*no-auth*/";

            const response = await fetch(`${API_BASE_URL}/promo-codes/claim`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tok}`
                },
                body: JSON.stringify({
                    code: promoCodeValue.toUpperCase().trim(),
                    userId: user?.id
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                const serverMessage = result.message;
                let finalError = t("promo_not_found") || "Промокод не найден";

                if (serverMessage === "Promo code not found" || serverMessage === "Not Found") {
                    finalError = t("promo_not_found") || "Промокод не найден";
                } else if (serverMessage) {
                    finalError = serverMessage;
                }

                throw new Error(finalError);
            }

            triggerHaptic("notification", "success");
            setPromoStatus({
                type: "success",
                message: `+$${result.addedAmount || result.bonusAdded || 0}! ${t("promo_claimed_success") || "Промокод активирован!"}`
            });

            setPromoCodeValue("");
            fetchUserData(tok).catch(() => {});

        } catch (err: any) {
            triggerHaptic("notification", "error");
            setPromoStatus({
                type: "error",
                message: err.message || "Ошибка соединения с сервером"
            });
        } finally {
            setPromoLoading(false);
        }
    };

    return (
        <div style={base}>
            <div style={{ paddingBottom: 16, marginBottom: 24, borderBottom: "1px solid #1E1E2A" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", margin: 0 }}>{t("promo_title")}</h2>
            </div>

            {promoStatus.message && (
                <div style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    marginBottom: 16,
                    fontSize: 13,
                    fontWeight: 600,
                    background: promoStatus.type === "success" ? "#00D2A81A" : "#FF4D6A1A",
                    border: `1px solid ${promoStatus.type === "success" ? "#00D2A833" : "#FF4D6A33"}`,
                    color: promoStatus.type === "success" ? "#00D2A8" : "#FF4D6A",
                    display: "flex",
                    gap: 8,
                    alignItems: "center"
                }}>
                    <span>{promoStatus.type === "success" ? "✅" : "❌"}</span>
                    <p style={{ margin: 0 }}>{promoStatus.message}</p>
                </div>
            )}

            <div style={{ position: "relative", marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "#44444F", marginBottom: 12 }}>{t("promo_desc")}</p>
                <input
                    type="text"
                    value={promoCodeValue}
                    onChange={(e) => setPromoCodeValue(e.target.value)}
                    disabled={promoLoading}
                    placeholder={t("promo_placeholder")}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: "#111118",
                        border: "1px solid #1E1E2A",
                        borderRadius: 14,
                        color: "#FFFFFF",
                        padding: "14px 16px",
                        fontSize: 14,
                        outline: "none",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                    }}
                />
            </div>

            <button
                onClick={handleClaimPromo}
                disabled={promoLoading || !promoCodeValue.trim()}
                style={{
                    width: "100%",
                    background: promoCodeValue.trim() && !promoLoading ? "#5C6BFF" : "#1E1E2A",
                    color: promoCodeValue.trim() && !promoLoading ? "#FFFFFF" : "#44444F",
                    border: "none",
                    borderRadius: 14,
                    padding: "15px 0",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: promoCodeValue.trim() && !promoLoading ? "pointer" : "not-allowed",
                    transition: "all 0.2s"
                }}
            >
                {promoLoading ? t("loading") || "Загрузка..." : t("promo_btn")}
            </button>
        </div>
    );
}

// РЕДИЗАЙН: Компонент Поддержки в стиле приложения с поддержкой нативной кнопки Back в TG
function SupportSheet({ t, base, currentView, onViewChange, tickets, loadTickets }) {
    const [activeTicketId, setActiveTicketId] = useState(null);
    const [messageText, setMessageText] = useState("");
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [errorStatus, setErrorStatus] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeTicket: any = tickets.find((t: any) => t.id === activeTicketId);
    const hasActiveOpenTicket = tickets.some((t: any) => t.status === "OPEN");

    useEffect(() => {
        if (currentView === "chat") {
            messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
        }
    }, [activeTicket?.messages, currentView]);

    const openChat = (ticketId) => {
        setActiveTicketId(ticketId);
        onViewChange("chat");
    };

    const sendMessage = async () => {
        if (!messageText.trim() || !activeTicketId || activeTicket?.status === "CLOSED") return;
        const tok = window.Telegram?.WebApp?.initData || "";
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/support/message`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tok}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: messageText.trim(),
                    ticketId: activeTicketId
                })
            });
            if (!res.ok) throw new Error("Send failed");
            setMessageText("");
            await loadTickets();
        } catch (e: any) {
            setErrorStatus(e.message || "Send error");
        } finally {
            setLoading(false);
        }
    };

    const Card = ({children, style = {}}: { children: React.ReactNode; style?: React.CSSProperties }) => (
        <div style={{
            background: "#111118",
            border: "1px solid #1E1E2A",
            borderRadius: 20,
            overflow: "hidden", ...style
        }}>{children}</div>
    );

    // =========================
    // ЭКРАН 1: СПИСОК ТИКЕТОВ (INBOX)
    // =========================
    if (currentView === "list") {
        return (
            <div style={{
                ...base,
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                paddingLeft: 16,
                paddingRight: 16
            }}>
                <div style={{paddingBottom: 16, marginBottom: 20, borderBottom: "1px solid #1E1E2A"}}>
                    <h2 style={{
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: "-0.5px",
                        color: "#fff",
                        margin: 0
                    }}> {t("support_title")}</h2>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    paddingBottom: 20
                }}>
                    {tickets.length === 0 && (
                        <div
                            style={{padding: 40, color: "#44444F", textAlign: "center", fontSize: 13, fontWeight: 600}}>
                            No conversations yet
                        </div>
                    )}

                    {tickets.map((ticket: any) => (
                        <Card key={ticket.id}>
                            <button
                                onClick={() => openChat(ticket.id)}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "16px 20px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#fff",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div>
                                    <div style={{fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4}}>
                                        {ticket.subject || `Ticket #${ticket.id}`}
                                    </div>
                                </div>
                                <span style={{
                                    background: ticket.status === "OPEN" ? "#00D2A81A" : "#FF4D6A1A",
                                    color: ticket.status === "OPEN" ? "#00D2A8" : "#FF4D6A",
                                    border: `1px solid ${ticket.status === "OPEN" ? "#00D2A833" : "#FF4D6A33"}`,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: "0.04em",
                                    padding: "3px 10px",
                                    borderRadius: 99
                                }}>
                                    {ticket.status === "CLOSED" ? "CLOSED" : "OPEN"}
                                </span>
                            </button>
                        </Card>
                    ))}
                </div>

                {!hasActiveOpenTicket && (
                    <button
                        disabled={isCreating}
                        onClick={async () => {
                            if (isCreating) return;
                            const tok = window.Telegram?.WebApp?.initData || "";
                            try {
                                setIsCreating(true);
                                setErrorStatus(null);

                                const res = await fetch(`${API_BASE_URL}/support/message`, {
                                    method: "POST",
                                    headers: {
                                        Authorization: `Bearer ${tok}`,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        message: "👋 New support request"
                                    })
                                });

                                if (!res.ok) {
                                    throw new Error(`Error ${res.status}`);
                                }

                                const updatedTickets: any = await fetch(`${API_BASE_URL}/support/tickets`, {
                                    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }
                                }).then(r => {
                                    if (!r.ok) throw new Error(`Error ${r.status}`);
                                    return r.json();
                                }).catch((err) => {
                                    throw err;
                                });

                                const newOpenTicket = updatedTickets.find((t: any) => t.status === "OPEN");
                                if (newOpenTicket) {
                                    setActiveTicketId(newOpenTicket.id);
                                }

                                await loadTickets?.();

                                setTimeout(() => {
                                    onViewChange("chat");
                                    setIsCreating(false);
                                }, 300);
                            } catch (e: any) {
                                console.error(e);
                                setErrorStatus(e.message || "Send error");
                                setIsCreating(false);
                            }
                        }}
                        style={{
                            width: "100%",
                            padding: "15px 0",
                            borderRadius: 14,
                            border: "none",
                            background: isCreating ? "#1E1E2A" : errorStatus ? "#FF4D6A2A" : "#5C6BFF",
                            color: isCreating ? "#44444F" : errorStatus ? "#FF4D6A" : "#fff",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: isCreating ? "not-allowed" : "pointer",
                            marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
                            transition: "all 0.2s"
                        }}
                    >
                        {isCreating ? "Creating..." : errorStatus ? `${errorStatus} - Try Again` : "Start new conversation"}
                    </button>
                )}
            </div>
        );
    }

    // =========================
    // ЭКРАН 2: ЧАТ С ПОДДЕРЖКОЙ
    // =========================
    const isClosed = activeTicket?.status === "CLOSED";

    return (
        <div style={{
            ...base,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            paddingLeft: 16,
            paddingRight: 16
        }}>
            <div style={{
                paddingBottom: 16,
                marginBottom: 20,
                borderBottom: "1px solid #1E1E2A",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 16
            }}>
                <div style={{display: "flex", alignItems: "center", gap: 12}}>
                    <div>
                        <h2 style={{fontSize: 15, fontWeight: 800, color: "#fff", margin: 0}}>
                            {activeTicket?.subject || `Ticket #${activeTicketId}`}
                        </h2>
                    </div>
                </div>
                <span style={{
                    background: isClosed ? "#FF4D6A1A" : "#00D2A81A",
                    color: isClosed ? "#FF4D6A" : "#00D2A8",
                    border: `1px solid ${isClosed ? "#FF4D6A33" : "#00D2A833"}`,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 99
                }}>
                    {isClosed ? "CLOSED" : "OPEN"}
                </span>
            </div>

            <div style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                paddingBottom: 20
            }}>
                {(activeTicket?.messages || []).map((msg: any, i: number) => {
                    const isUser = msg.sender === "USER";
                    return (
                        <div
                            key={i}
                            style={{
                                alignSelf: isUser ? "flex-end" : "flex-start",
                                maxWidth: "75%",
                                background: isUser ? "#5C6BFF" : "#111118",
                                border: isUser ? "none" : "1px solid #1E1E2A",
                                padding: "12px 16px",
                                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                fontSize: 13,
                                lineHeight: 1.5,
                                color: "#fff",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                            }}
                        >
                            {msg.message}
                        </div>
                    );
                })}
                <div ref={messagesEndRef}/>
            </div>

            {isClosed ? (
                <div style={{
                    padding: "15px 0",
                    borderTop: "1px solid #1E1E2A",
                    color: "#FF4D6A",
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: "center",
                    letterSpacing: "0.02em",
                    marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)"
                }}>
                    🔒 This conversation is closed by administrator.
                </div>
            ) : (
                <div style={{
                    display: "flex",
                    gap: 10,
                    paddingTop: 12,
                    paddingBottom: 12,
                    marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
                    borderTop: "1px solid #1E1E2A"
                }}>
                    <input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        disabled={loading}
                        style={{
                            flex: 1,
                            background: "#111118",
                            border: "1px solid #1E1E2A",
                            borderRadius: 14,
                            padding: "14px 16px",
                            color: "#fff",
                            fontSize: 14,
                            outline: "none",
                            transition: "border 0.2s"
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !messageText.trim()}
                        style={{
                            background: messageText.trim() && !loading ? "#5C6BFF" : "#1E1E2A",
                            border: "none",
                            borderRadius: 14,
                            padding: "0 20px",
                            color: messageText.trim() && !loading ? "#fff" : "#44444F",
                            fontSize: 15,
                            fontWeight: 800,
                            cursor: messageText.trim() && !loading ? "pointer" : "not-allowed",
                            transition: "all 0.2s"
                        }}
                    >
                        ➤
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState("home");
    const [user, setUser] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]); // Lifted up from SupportSheet
    const [activeSheet, setActiveSheet] = useState<SheetType>(null);
    const [supportView, setSupportView] = useState<"list" | "chat">("list");
    const [lang, setLang] = useState<Lang>("en");

    const requestInitialized = useRef(false);
    const [topupAmount, setTopupAmount] = useState("");
    const [topupLoading, setTopupLoading] = useState(false);

    const [ totalOrders, setTotalOrders ] = useState(0)

    const t = useCallback((key: string) => translations[lang][key] ?? key, [lang]);

    useEffect(() => {
        const saved = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
        if (saved && translations[saved]) setLang(saved);
    }, []);

    const changeLang = (l: Lang) => {
        setLang(l);
        localStorage.setItem(LANG_STORAGE_KEY, l);
        triggerHaptic("selection");
    };

    function triggerHaptic(type = "impact", style = "medium") {
        const hf = window.Telegram?.WebApp?.HapticFeedback;
        if (!hf) return;
        try {
            if (type === "impact") hf.impactOccurred(style);
            else if (type === "notification") hf.notificationOccurred(style);
            else if (type === "selection") hf.selectionChanged();
        } catch {}
    }

    const fetchUserData = useCallback((token: string) => {
        return fetch(`${API_BASE_URL}/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "any-value",
            },
        })
            .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
            .then((d) => { if (d) setUser(d); })
            .catch((e) => console.error("❌", e));
    }, []);

    const loadTickets = useCallback(async () => {
        const tok = window.Telegram?.WebApp?.initData || "";
        try {
            const res = await fetch(`${API_BASE_URL}/support/tickets`, {
                headers: {
                    Authorization: `Bearer ${tok}`,
                    "Content-Type": "application/json"
                }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setTickets(data || []);
        } catch (e: any) {
            console.error("Load tickets error", e);
        }
    }, []);

    // Single consolidated application polling lifecycle loop
    useEffect(() => {
        if (typeof window === "undefined" || !window.Telegram?.WebApp) { setLoading(false); return; }
        if (requestInitialized.current) return;
        requestInitialized.current = true;
        const tg = window.Telegram.WebApp;
        tg.disableVerticalSwipes();
        tg.expand();
        if (tg?.platform === "android" || tg?.platform === "ios") tg.requestFullscreen?.();
        tg.ready();

        let id: NodeJS.Timeout;
        const go = async () => {
            const tok = () => tg.initData || "/*no-auth*/";
            await Promise.all([
                fetchUserData(tok()).catch(() => {}),
                loadTickets().catch(() => {})
            ]);
            setLoading(false);

            id = setInterval(() => {
                const currentToken = tok();
                fetchUserData(currentToken).catch(() => {});
                loadTickets().catch(() => {});
            }, 5000);
        };
        go();
        return () => clearInterval(id);
    }, [fetchUserData, loadTickets]);

    useEffect(() => {
        const bb = window.Telegram?.WebApp?.BackButton;
        if (!bb) return;

        if (activeSheet !== null) {
            bb.show();
            const handleBackPress = () => {
                triggerHaptic("impact", "light");

                if (activeSheet === "support" && supportView === "chat") {
                    setSupportView("list");
                } else {
                    setActiveSheet(null);
                }
            };
            bb.onClick(handleBackPress);
            return () => { bb.offClick(handleBackPress); bb.hide(); };
        } else {
            bb.hide();
        }
    }, [activeSheet, supportView]);

    const handleTopup = async () => {
        const amountNum = Number(topupAmount);
        if (!topupAmount || isNaN(amountNum) || amountNum <= 0) return;
        try {
            setTopupLoading(true);
            triggerHaptic("impact", "medium");

            const tg = window.Telegram?.WebApp;
            const tok = tg?.initData || "/*no-auth*/";

            const r = await fetch(`${API_BASE_URL}/balance/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
                body: JSON.stringify({ amount: amountNum, userId: user?.id }),
            });

            if (!r.ok) throw new Error("Backend returned error status");
            const d = await r.json();

            if (d?.payUrl) {
                triggerHaptic("notification", "success");
                if (tg) {
                    if (d.payUrl.includes("t.me/") || d.payUrl.includes("telegram.me/")) {
                        tg.openTelegramLink(d.payUrl);
                    } else if (tg.openLink) {
                        tg.openLink(d.payUrl);
                    } else {
                        window.open(d.payUrl, "_blank");
                    }
                } else {
                    window.open(d.payUrl, "_blank");
                }
                setTopupAmount("");
            } else {
                triggerHaptic("notification", "error");
            }
        } catch (error) {
            console.error("Topup error details:", error);
            triggerHaptic("notification", "error");
        } finally {
            // ЗДЕСЬ БЫЛА ОШИБКА: теперь блок finally прописан корректно
            setTopupLoading(false);
        }
    };

    const Pill = ({ label, color = "#5C6BFF" }: { label: string; color?: string }) => (
        <span style={{ background: color + "22", color, border: `1px solid ${color}44`, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 99 }}>
            {label}
        </span>
    );

    const Card = ({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
        <div className={className} style={{ background: "#111118", border: "1px solid #1E1E2A", borderRadius: 20, overflow: "hidden", ...style }}>
            {children}
        </div>
    );

    const SheetHeader = ({ title, sub }: { title: string; sub?: string }) => (
        <div style={{ paddingBottom: 16, marginBottom: 24, borderBottom: "1px solid #1E1E2A" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff", margin: 0 }}>{title}</h2>
            {sub && <p style={{ fontSize: 12, color: "#8A8A9A", margin: "4px 0 0" }}>{sub}</p>}
        </div>
    );

    const renderSubPage = () => {
        const base: React.CSSProperties = {
            position: "fixed",
            inset: 0,
            background: "#0A0A0F",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 24,
            paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)",
        };

        switch (activeSheet) {
            case "firstaid": return (
                <div style={base}>
                    <SheetHeader title={`🚨 ${t("firstaid_title")}`} sub={t("firstaid_subtitle")} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto", width: "100%" }}>
                        <Card style={{ borderColor: "#FF4D6A33" }}>
                            <div style={{ padding: "4px 16px 4px", background: "#FF4D6A11", borderBottom: "1px solid #FF4D6A22" }}>
                                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#FF4D6A", textTransform: "uppercase", margin: "8px 0" }}>{t("firstaid_s1_title")}</p>
                            </div>
                            <div style={{ padding: 16, fontSize: 12, color: "#8A8A9A", lineHeight: 1.7 }}>
                                <p style={{ color: "#fff", fontWeight: 600, marginBottom: 8 }}>{t("firstaid_s1_signs")}</p>
                                <ul style={{ paddingLeft: 16, margin: "0 0 12px" }}>
                                    {[t("firstaid_s1_sign1"), t("firstaid_s1_sign2"), t("firstaid_s1_sign3"), t("firstaid_s1_sign4")].map((s, i) => (
                                        <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                                    ))}
                                </ul>
                                <div style={{ borderTop: "1px solid #1E1E2A", paddingTop: 12 }}>
                                    <p style={{ color: "#fff", fontWeight: 600, marginBottom: 8 }}>{t("firstaid_s1_steps")}</p>
                                    <ol style={{ paddingLeft: 16, margin: 0 }}>
                                        {[
                                            [t("firstaid_s1_step1_title"), t("firstaid_s1_step1"), "#FF4D6A"],
                                            [t("firstaid_s1_step2_title"), t("firstaid_s1_step2"), "#fff"],
                                            [t("firstaid_s1_step3_title"), t("firstaid_s1_step3"), "#fff"],
                                            [t("firstaid_s1_step4_title"), t("firstaid_s1_step4"), "#fff"],
                                        ].map(([title, body, col], i) => (
                                            <li key={i} style={{ marginBottom: 8 }}>
                                                <strong style={{ color: col as string }}>{title}</strong> {body}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        </Card>
                        <Card style={{ borderColor: "#F59E0B33" }}>
                            <div style={{ padding: "4px 16px", background: "#F59E0B11", borderBottom: "1px solid #F59E0B22" }}>
                                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#F59E0B", textTransform: "uppercase", margin: "8px 0" }}>{t("firstaid_s2_title")}</p>
                            </div>
                            <div style={{ padding: 16, fontSize: 12, color: "#8A8A9A", lineHeight: 1.7 }}>
                                <p style={{ marginBottom: 12 }}>{t("firstaid_s2_desc")}</p>
                                {[
                                    [t("firstaid_s2_p1_title"), t("firstaid_s2_p1")],
                                    [t("firstaid_s2_p2_title"), t("firstaid_s2_p2")],
                                    [t("firstaid_s2_p3_title"), t("firstaid_s2_p3")],
                                    [t("firstaid_s2_p4_title"), t("firstaid_s2_p4")],
                                ].map(([title, body], i) => (
                                    <div key={i} style={{ marginBottom: 10 }}>
                                        <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 2px" }}>{title}</p>
                                        <p style={{ margin: 0 }}>{body}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card>
                            <div style={{ padding: 16, fontSize: 12, color: "#8A8A9A", lineHeight: 1.7 }}>
                                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#44444F", textTransform: "uppercase", margin: "0 0 10px" }}>{t("firstaid_s3_title")}</p>
                                <p style={{ margin: "0 0 8px" }}><strong style={{ color: "#fff" }}>{t("firstaid_s3_p1_title")}</strong> {t("firstaid_s3_p1")}</p>
                                <p style={{ margin: 0 }}><strong style={{ color: "#fff" }}>{t("firstaid_s3_p2_title")}</strong> {t("firstaid_s3_p2")}</p>
                            </div>
                        </Card>
                    </div>
                </div>
            );

            case "promo": return (
                <PromoSheet
                    t={t}
                    user={user}
                    fetchUserData={fetchUserData}
                    base={base}
                />
            );

            case "support": return (
                <SupportSheet
                    t={t}
                    base={base}
                    currentView={supportView}
                    onViewChange={setSupportView}
                    tickets={tickets}
                    loadTickets={loadTickets}
                />
            );

            case "orders":
                return <OrdersSheet onClose={() => { setActiveSheet(null); triggerHaptic("impact"); }} lang={lang} />;

            default: return null;
        }
    };

    const renderTab = () => {

        const faq = [
            { q: t("faq_q1"), a: t("faq_a1") },
            { q: t("faq_q2"), a: t("faq_a2") },
            { q: t("faq_q3"), a: t("faq_a3") },
            { q: t("faq_q4"), a: t("faq_a4") },
        ];
        const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
            <div style={{ background: "#111118", border: "1px solid #1E1E2A", borderRadius: 20, overflow: "hidden", ...style }}>{children}</div>
        );

        if (selectedTab === "home") return (
            <div style={{ padding: "0 16px 120px", maxWidth: 480, margin: "0 auto", overflowY: "auto", height: "90vh" }}>

                <br />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 8, paddingBottom: 24 }}>
                    <div style={{ position: "relative" }}>
                        <img src={user?.avatar_url} alt="avatar"
                             style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2.5px solid #1E1E2A" }} />
                        <div style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#00D2A8", border: "2px solid #0A0A0F" }} />
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.4px", color: "#fff", margin: "12px 0 0" }}>
                        {user ? `${user.first_name} ${user.last_name}` : "—"}
                    </p>
                    <p style={{ fontSize: 12, color: "#8A8A9A", margin: "2px 0 0" }}>@{user?.id ?? "loading"}</p>
                </div>

                <Card style={{ marginBottom: 12, background: 'none', border: 'none' }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
                        {[
                            { label: t("btn_firstaid"), icon: "🚨", color: "#FF4D6A", sheet: "firstaid" as SheetType },
                            { label: t("btn_promo"), icon: "🎁", color: "#5C6BFF", sheet: "promo" as SheetType },
                            { label: t("btn_support"), icon: "💬", color: "#8A8A9A", sheet: "support" as SheetType },
                            { label: t("btn_orders"), icon: "📦", color: "#00D2A8", sheet: "orders" as SheetType },
                        ].map(({ label, icon, color, sheet }, i, arr) => (
                            <button key={sheet} onClick={() => { setSupportView("list"); setActiveSheet(sheet); triggerHaptic("impact"); }}
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 8px", background: "transparent", border: "none",  cursor: "pointer", transition: "background 0.15s" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#1E1E2A")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <div style={{ width: 46, height: 46, borderRadius: 10, background: color + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                                    {icon}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#8A8A9A", letterSpacing: "0.02em" }}>{label}</span>
                            </button>
                        ))}
                    </div>
                </Card>

                {/*<Card style={{ marginBottom: 12 }}>*/}
                {/*    <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>*/}
                {/*        <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span>*/}
                {/*        <div>*/}
                {/*            <p style={{ fontSize: 12, fontWeight: 700, color: "#5C6BFF", margin: "0 0 4px" }}>{t("alert_new_features")}</p>*/}
                {/*            <p style={{ fontSize: 11, color: "#8A8A9A", margin: 0, lineHeight: 1.6 }}>*/}
                {/*                • {t("alert_payment")}<br />*/}
                {/*                • {t("alert_currency")}*/}
                {/*            </p>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</Card>*/}

                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#44444F", textTransform: "uppercase", margin: "20px 0 8px 4px" }}>{t("faq_title")}</p>
                <Card>
                    {faq.map((item, i) => (
                        <details key={i} style={{ borderBottom: i < faq.length - 1 ? "1px solid #1E1E2A" : "none" }}>
                            <summary style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                     onClick={() => triggerHaptic("impact")}>
                                {item.q}
                                <span style={{ color: "#44444F", fontSize: 10, flexShrink: 0, marginLeft: 8 }}>▾</span>
                            </summary>
                            <p style={{ padding: "0 16px 14px", fontSize: 12, color: "#8A8A9A", margin: 0, lineHeight: 1.7 }}>{item.a}</p>
                        </details>
                    ))}
                </Card>
            </div>
        );

        if (selectedTab === "shop") return <RenderShop lang={lang} />;

        if (selectedTab === "wallet") {
            const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
                <div style={{ background: "#111118", border: "1px solid #1E1E2A", borderRadius: 20, overflow: "hidden", ...style }}>{children}</div>
            );
            return (
                <div style={{ padding: "0 16px 120px", maxWidth: 480, margin: "0 auto", overflowY: "auto", height: "90vh" }}>
                    <div style={{ paddingTop: 8 }} />
                    <br />

                    <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", border: "1px solid #5C6BFF33", borderRadius: 24, padding: 24, marginBottom: 12, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "#5C6BFF0D" }} />
                        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "#00D2A80D" }} />
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#8A8A9A", textTransform: "uppercase", margin: "0 0 6px" }}>{t("wallet_balance_label")}</p>
                        <p style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff", margin: "0 0 20px", lineHeight: 1 }}>
                            {user ? `$${user.balance}` : "$—"}
                        </p>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #ffffff0f" }}>
                            <div>
                                <p style={{ fontSize: 10, color: "#8A8A9A", margin: "0 0 2px" }}>{t("wallet_user_id")}</p>
                                <p style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#fff", margin: 0 }}>{user?.id ? `#${user.id}` : "#———"}</p>
                            </div>
                            {/*<div style={{ textAlign: "right" }}>*/}
                            {/*    <p style={{ fontSize: 10, color: "#8A8A9A", margin: "0 0 2px" }}>{t("wallet_currency")}</p>*/}
                            {/*    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>USD</p>*/}
                            {/*</div>*/}
                            {/*<div style={{ textAlign: "right" }}>*/}
                            {/*    <p style={{ fontSize: 10, color: "#8A8A9A", margin: "0 0 2px" }}>Status</p>*/}
                            {/*    <span style={{ fontSize: 11, fontWeight: 700, color: "#00D2A8" }}>{t("wallet_active")}</span>*/}
                            {/*</div>*/}
                        </div>
                    </div>

                    <Card style={{ marginBottom: 12, marginTop: '1em' }}>
                        <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 15 }}>⚡</span>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>{t("wallet_instant_title")}</p>
                                <p style={{ fontSize: 11, color: "#8A8A9A", margin: 0 }}>{t("wallet_instant_desc")}</p>
                            </div>
                        </div>
                    </Card>

                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#44444F", textTransform: "uppercase", margin: "20px 0 8px 4px" }}>{t("wallet_topup_title")}</p>
                    <Card>
                        <div style={{ padding: 16 }}>
                            <p style={{ fontSize: 11, color: "#8A8A9A", margin: "0 0 10px" }}>{t("wallet_topup_desc")}</p>
                            <div style={{ position: "relative", marginBottom: 12 }}>
                                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#8A8A9A", pointerEvents: "none" }}>$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={topupAmount}
                                    onChange={e => {
                                        let val = e.target.value;
                                        val = val.replace(",", ".");
                                        if (/^\d*\.?\d*$/.test(val)) {
                                            setTopupAmount(val);
                                        }
                                    }}
                                    placeholder={t("wallet_topup_placeholder")}
                                    style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        background: "#0A0A0F",
                                        border: "1px solid #1E1E2A",
                                        borderRadius: 12,
                                        color: "#fff",
                                        padding: "13px 14px 13px 30px",
                                        fontSize: 15,
                                        fontWeight: 700,
                                        outline: "none",
                                        fontFamily: "inherit"
                                    }}
                                />
                            </div>
                            <button onClick={handleTopup} disabled={topupLoading || !topupAmount}
                                    style={{ width: "100%", background: topupAmount ? "#00D2A8" : "#1E1E2A", color: topupAmount ? "#000" : "#44444F", border: "none", borderRadius: 12, padding: "14px 0", fontSize: 14, fontWeight: 800, cursor: topupAmount ? "pointer" : "not-allowed", transition: "all 0.2s", letterSpacing: "0.01em" }}>
                                {topupLoading ? t("wallet_topup_loading") : t("wallet_topup_btn")}
                            </button>
                        </div>
                        <div style={{ borderTop: "1px solid #1E1E2A", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#00D2A81A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>₿</div>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>{t("wallet_cryptobot")}</p>
                                    <p style={{ fontSize: 10, color: "#8A8A9A", margin: 0 }}>{t("wallet_cryptobot_sub")}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#00D2A8", margin: 0 }}>{t("wallet_instant")}</p>
                                <p style={{ fontSize: 10, color: "#8A8A9A", margin: 0 }}>{t("wallet_auto")}</p>
                            </div>
                        </div>
                        <div style={{ borderTop: "1px solid #1E1E2A", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,105,210,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>₿</div>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0 }}>{t("wallet_direct")}</p>
                                    <p style={{ fontSize: 10, color: "#8A8A9A", margin: 0 }}>{t("wallet_direct_sub")}</p>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#00D2A8", margin: 0 }}>{t("wallet_instant_d")}</p>
                                <p style={{ fontSize: 10, color: "#8A8A9A", margin: 0 }}>{t("wallet_auto_d")}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            );
        }

        if (selectedTab === "settings") {

            const token = window.Telegram?.WebApp?.initData || "/*no-auth*/";

            fetch(`${API_BASE_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((r) => {
                    if (!r.ok) throw new Error("Network response was not ok");
                    return r.json();
                })
                .then((data) => {
                    if (Array.isArray(data)) {
                        setTotalOrders(data.length);
                    } else if (data && Array.isArray(data.orders)) {
                        setTotalOrders(data.orders.length);
                        window.sessionStorage.setItem("total_orders", data.orders.length)
                    }
                })

            const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
                <div style={{ background: "#111118", border: "1px solid #1E1E2A", borderRadius: 20, overflow: "hidden", ...style }}>{children}</div>
            );
            const Divider = () => <div style={{ height: 1, background: "#1E1E2A", margin: "0 16px" }} />;

            // Dynamic Counter Values Computed directly from system State hooks
            const totalDisputes = tickets.length || 0;

            return (
                <div style={{ padding: "0 16px 120px", maxWidth: 480, margin: "0 auto", overflowY: "auto", height: "90vh" }}>
                    <div style={{ paddingTop: 8 }} />
                    <br />

                    <Card style={{ margin: "0 0 12px" }}>
                        <div style={{ padding: "20px 16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                            <img src={user?.avatar_url} alt="avatar" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #1E1E2A", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>
                                    {user ? `${user.first_name} ${user.last_name}` : "—"}
                                </p>
                                <p style={{ fontSize: 12, color: "#8A8A9A", margin: "2px 0 0" }}>@{user?.id ?? ""}</p>
                            </div>
                            {/*<Pill label="User" color="#5C6BFF" />*/}
                        </div>
                        <Divider />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "12px 0" }}>
                            {[
                                { label: t("settings_orders"), val: String(totalOrders), color: "#10cb82" },
                                { label: t("settings_disputes"), val: String(totalDisputes), color: "orange" },
                                { label: t("settings_level"), val: String(user?.level ?? 1), color: "#5C6BFF" },
                            ].map(({ label, val, color }, i, arr) => (
                                <div key={label} style={{ textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid #1E1E2A" : "none", padding: "4px 0" }}>
                                    <p style={{ fontSize: 18, fontWeight: 900, color, margin: 0 }}>{val}</p>
                                    <p style={{ fontSize: 10, color: "#44444F", margin: "2px 0 0", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#44444F", textTransform: "uppercase", margin: "20px 0 8px 4px" }}>{t("settings_language")}</p>
                    <Card style={{ marginBottom: 12 }}>
                        <div style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(Object.keys(langLabels) as Lang[]).map(l => (
                                <button key={l} onClick={() => changeLang(l)}
                                        style={{
                                            fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s",
                                            background: lang === l ? "#5C6BFF" : "#1E1E2A",
                                            color: lang === l ? "#fff" : "#8A8A9A",
                                        }}>
                                    {langLabels[l]}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#44444F", textTransform: "uppercase", margin: "20px 0 8px 4px" }}>{t("settings_notif_section")}</p>
                    <Card style={{ marginBottom: 12 }}>
                        {[
                            { id: "ess", title: t("settings_notif_essential"), sub: t("settings_notif_essential_desc") },
                            { id: "add", title: t("settings_notif_additional"), sub: t("settings_notif_additional_desc") },
                        ].map(({ id, title, sub }, i, arr) => (
                            <React.Fragment key={id}>
                                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{title}</p>
                                        <p style={{ fontSize: 11, color: "#8A8A9A", margin: "2px 0 0" }}>{sub}</p>
                                    </div>
                                    <div style={{ width: 44, height: 26, borderRadius: 13, background: "#5C6BFF", position: "relative", flexShrink: 0, opacity: 0.5 }}>
                                        <div style={{ position: "absolute", right: 3, top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
                                    </div>
                                </div>
                                {i < arr.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </Card>

                    <Card>
                        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#5C6BFF1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>＋</div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{t("settings_add_home")}</p>
                                <p style={{ fontSize: 11, color: "#8A8A9A", margin: "2px 0 0" }}>{t("settings_add_home_desc")}</p>
                            </div>
                            <button onClick={() => window.Telegram?.WebApp?.addToHomeScreen?.()}
                                    style={{ background: "#5C6BFF", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {t("settings_add_home_btn")}
                            </button>
                        </div>
                    </Card>
                </div>
            );
        }

        return null;
    };

    if (loading) return (
        <div style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0A0A0F" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <Spinner size="lg" />
            </div>
        </div>
    );

    const tabs = [
        {
            id: "home", label: t("tab_home"),
            icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
        },
        {
            id: "shop", label: t("tab_shop"),
            icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
        },
        {
            id: "wallet", label: t("tab_wallet"),
            icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01" strokeWidth="2.5" strokeLinecap="round"/><path d="M2 10h20"/></svg>,
        },
        {
            id: "settings", label: t("tab_settings"),
            icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        },
        // {
        //     id: "My shop", label: t("my_shop"),
        //     icon: (a: boolean) => <svg
        //         width="22"
        //         height="22"
        //         viewBox="0 0 24 24"
        //         fill="none"
        //         stroke="currentColor"
        //         strokeWidth={a ? 2.2 : 1.5}
        //         strokeLinecap="round"
        //         strokeLinejoin="round"
        //     >
        //         {/* Store Roof / Awning */}
        //         <path d="M2 22V12l1-2V4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6l1 2v10" />
        //
        //         {/* Store Front Columns */}
        //         <path d="M4 12V22M20 12V22" />
        //
        //         {/* Admin Shield / Clipboard shape in the center window */}
        //         <path d="M9 12h6v6a3 3 0 0 1-6 0v-6z" />
        //     </svg>,
        // },
    ];

    return (
        <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", display: "flex", flexDirection: "column" }}>
            {activeSheet !== null && renderSubPage()}

            <main style={{ flex: 1, paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 1rem)" }}>
                {renderTab()}
            </main>

            <nav style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
                background: "#0A0A0Ff0",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderTop: "1px solid #1E1E2A",
                display: "flex", justifyContent: "center",
            }}>
                <div style={{ width: "100%", maxWidth: 480, display: "flex" }}>
                    {tabs.map(({ id, label, icon }) => {
                        const active = selectedTab === id;
                        return (
                            <button key={id}
                                    onClick={() => { setActiveSheet(null); setSelectedTab(id); triggerHaptic("selection"); }}
                                    style={{
                                        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                        gap: 4, paddingTop: 10, border: "none", background: "transparent", cursor: "pointer",
                                        color: active ? "#5C6BFF" : "#44444F",
                                        paddingBottom: "calc(10px + var(--tg-safe-area-inset-bottom, 0px))",
                                        position: "relative", transition: "color 0.15s",
                                    }}>
                                {active && (
                                    <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, borderRadius: 99, background: "#5C6BFF" }} />
                                )}
                                {icon(active)}
                                <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: "0.02em" }}>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}