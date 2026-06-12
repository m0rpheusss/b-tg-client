"use client";

import {
    Accordion,
    Alert,
    Avatar,
    Button,
    ButtonGroup,
    Spinner,
    Surface,
    ListBox,
    Separator,
    Header, Description, Label, Switch
} from "@heroui/react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import RenderShop from "@/app/conponents/shop/RenderShop";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import OrdersSheet from "@/app/conponents/OrdersSheet";
import { translations, langLabels, type Lang } from "@/app/translations";

// Define our views
type SheetType = "firstaid" | "promo" | "support" | "orders" | null;

const LANG_STORAGE_KEY = "app_lang";

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState("home");
    const [user, setUser] = useState<any>(null);
    const [activeSheet, setActiveSheet] = useState<SheetType>(null);
    const [lang, setLang] = useState<Lang>("en");

    const requestInitialized = useRef(false);

    const [topupAmount, setTopupAmount] = useState("");
    const [topupLoading, setTopupLoading] = useState(false);

    // Shorthand translation helper
    const t = useCallback((key: string) => translations[lang][key] ?? key, [lang]);

    // Persist language preference
    useEffect(() => {
        const saved = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
        if (saved && translations[saved]) setLang(saved);
    }, []);

    const changeLang = (l: Lang) => {
        setLang(l);
        localStorage.setItem(LANG_STORAGE_KEY, l);
        triggerHaptic("selection");
    };

    function triggerHaptic(type = 'impact', style = 'medium') {
        const WebApp = window.Telegram?.WebApp;
        if (!WebApp || !WebApp.HapticFeedback) return;
        try {
            switch (type) {
                case 'impact': WebApp.HapticFeedback.impactOccurred(style); break;
                case 'notification': WebApp.HapticFeedback.notificationOccurred(style); break;
                case 'selection': WebApp.HapticFeedback.selectionChanged(); break;
            }
        } catch (error) {
            console.error("Failed to trigger haptic feedback:", error);
        }
    }

    const fetchUserData = useCallback((token: string) => {
        return fetch(`https://bohemia-api-1.yxwfjh.easypanel.host/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "any-value",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return res.json();
            })
            .then((response) => {
                if (response) setUser(response);
            })
            .catch((error) => {
                console.error("❌ HTTP Fetch Error Context:", error);
            });
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !window.Telegram?.WebApp) {
            setLoading(false);
            return;
        }
        if (requestInitialized.current) return;
        requestInitialized.current = true;

        const tg = window.Telegram.WebApp;
        tg.disableVerticalSwipes();
        tg.expand();
        if (tg?.platform === "android" || tg?.platform === "ios") {
            tg.requestFullscreen?.();
        }
        tg.ready();

        let intervalId: NodeJS.Timeout;

        const startPolling = async () => {
            const getToken = () => tg.initData || "/*no-auth*/";
            const fetchAndUpdate = async () => {
                try { await fetchUserData(getToken()); }
                catch (e) { console.error("Polling error:", e); }
            };
            await fetchAndUpdate();
            setLoading(false);
            intervalId = setInterval(fetchAndUpdate, 5000);
        };

        startPolling();
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [fetchUserData]);

    const closeSheet = () => setActiveSheet(null);

    const handleTopup = async () => {
        if (!topupAmount || isNaN(Number(topupAmount))) return;
        try {
            setTopupLoading(true);
            const tg = window.Telegram.WebApp;
            const token = tg.initData || "/*no-auth*/";
            const res = await fetch("https://bohemia-api-1.yxwfjh.easypanel.host/balance/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ amount: Number(topupAmount), userId: user?.id }),
            });
            if (!res.ok) throw new Error("Failed to create invoice");
            const data = await res.json();
            if (data?.payUrl) window.open(data.payUrl, "_blank");
            setTopupAmount("");
        } catch (err) {
            console.error("Topup error:", err);
        } finally {
            setTopupLoading(false);
        }
    };

    const renderSubPage = () => {
        switch (activeSheet) {
            case "firstaid":
                return (
                    <div className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto" style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold flex items-center gap-2">🚨 {t("firstaid_title")}</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">{t("firstaid_subtitle")}</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => { closeSheet(); triggerHaptic("impact"); }} className="border border-zinc-700 bg-zinc-900/50 rounded-xl">
                                {t("btn_back")}
                            </Button>
                        </div>

                        <div className="flex-grow space-y-4 max-w-2xl mx-auto w-full">
                            {/* SECTION 1 */}
                            <div className="bg-gradient-to-br from-red-950/20 to-zinc-950 border border-red-900/40 rounded-3xl p-5 shadow-xl">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">{t("firstaid_s1_title")}</h3>
                                <div className="space-y-3 text-xs text-zinc-300">
                                    <p className="font-semibold text-white">{t("firstaid_s1_signs")}</p>
                                    <ul className="list-disc list-inside text-zinc-400 space-y-1 pl-1">
                                        <li>{t("firstaid_s1_sign1")}</li>
                                        <li>{t("firstaid_s1_sign2")}</li>
                                        <li>{t("firstaid_s1_sign3")}</li>
                                        <li>{t("firstaid_s1_sign4")}</li>
                                    </ul>
                                    <div className="border-t border-red-900/30 pt-3 mt-2">
                                        <p className="font-semibold text-white mb-2">{t("firstaid_s1_steps")}</p>
                                        <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                                            <li><strong className="text-red-400">{t("firstaid_s1_step1_title")}</strong> {t("firstaid_s1_step1")}</li>
                                            <li><strong>{t("firstaid_s1_step2_title")}</strong> {t("firstaid_s1_step2")}</li>
                                            <li><strong>{t("firstaid_s1_step3_title")}</strong> {t("firstaid_s1_step3")}</li>
                                            <li><strong>{t("firstaid_s1_step4_title")}</strong> {t("firstaid_s1_step4")}</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2 */}
                            <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">{t("firstaid_s2_title")}</h3>
                                <div className="space-y-3 text-xs text-zinc-300">
                                    <p className="text-zinc-400">{t("firstaid_s2_desc")}</p>
                                    <ul className="space-y-3 mt-2">
                                        <li><strong className="text-white block font-semibold">{t("firstaid_s2_p1_title")}</strong>{t("firstaid_s2_p1")}</li>
                                        <li><strong className="text-white block font-semibold">{t("firstaid_s2_p2_title")}</strong>{t("firstaid_s2_p2")}</li>
                                        <li><strong className="text-white block font-semibold">{t("firstaid_s2_p3_title")}</strong>{t("firstaid_s2_p3")}</li>
                                        <li><strong className="text-white block font-semibold">{t("firstaid_s2_p4_title")}</strong>{t("firstaid_s2_p4")}</li>
                                    </ul>
                                </div>
                            </div>

                            {/* SECTION 3 */}
                            <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-4 text-xs text-zinc-400 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">{t("firstaid_s3_title")}</h3>
                                <p>• <strong>{t("firstaid_s3_p1_title")}</strong> {t("firstaid_s3_p1")}</p>
                                <p>• <strong>{t("firstaid_s3_p2_title")}</strong> {t("firstaid_s3_p2")}</p>
                            </div>
                        </div>
                    </div>
                );

            case "promo":
                return (
                    <div className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto" style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                            <h2 className="text-xl font-bold">{t("promo_title")}</h2>
                            <Button size="sm" variant="ghost" onClick={() => { closeSheet(); triggerHaptic("impact"); }} className="border border-zinc-700 bg-zinc-900/50 rounded-xl">{t("btn_back")}</Button>
                        </div>
                        <Alert status="warning" variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl w-full">
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title className="text-xs font-semibold text-zinc-300">{t("promo_unavailable")}</Alert.Title>
                            </Alert.Content>
                        </Alert>
                        <br />
                        <div className="flex flex-col gap-4 flex-grow max-w-md mx-auto w-full">
                            <p className="text-xs text-zinc-400">{t("promo_desc")}</p>
                            <input disabled type="text" placeholder={t("promo_placeholder")} className="w-full rounded-2xl bg-zinc-900/50 text-white px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary border border-zinc-800" />
                            <Button isDisabled color="primary" className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20">{t("promo_btn")}</Button>
                        </div>
                    </div>
                );

            case "support":
                return (
                    <div className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto" style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                            <h2 className="text-xl font-bold">{t("support_title")}</h2>
                            <Button size="sm" variant="ghost" onClick={() => { closeSheet(); triggerHaptic("impact"); }} className="border border-zinc-700 bg-zinc-900/50 rounded-xl">{t("btn_back")}</Button>
                        </div>
                        <div className="flex flex-col gap-4 flex-grow max-w-md mx-auto w-full">
                            <Alert status="warning" variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl w-full">
                                <Alert.Indicator />
                                <Alert.Content>
                                    <Alert.Title className="text-xs font-semibold text-zinc-300">{t("support_unavailable")}</Alert.Title>
                                </Alert.Content>
                            </Alert>
                            <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl w-full">
                                <Alert.Indicator />
                                <Alert.Content>
                                    <Alert.Title className="text-xs font-semibold text-zinc-300">{t("support_no_convos")}</Alert.Title>
                                </Alert.Content>
                            </Alert>
                            <textarea disabled placeholder={t("support_placeholder")} rows={6} className="w-full rounded-2xl bg-zinc-900/50 text-white px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none border border-zinc-800" />
                            <Button isDisabled color="primary" className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20">{t("support_btn")}</Button>
                        </div>
                    </div>
                );

            case "orders":
                return <OrdersSheet onClose={() => { closeSheet(); triggerHaptic("impact"); }} lang={lang} />;

            default:
                return null;
        }
    };

    const renderTab = () => {
        const itemsTips = [
            { title: t("faq_q1"), content: t("faq_a1") },
            { title: t("faq_q2"), content: t("faq_a2") },
            { title: t("faq_q3"), content: t("faq_a3") },
            { title: t("faq_q4"), content: t("faq_a4") },
        ];

        if (selectedTab === "home") {
            return (
                <div className="p-4 max-w-md mx-auto space-y-6 overflow-y-auto" style={{ height: '90vh' }}>
                    {/* USER DISPLAY */}
                    <div className="relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <img className="w-24 h-24 rounded-full border-2 border-zinc-800/80 shadow-md object-cover" src={user?.avatar_url} alt="User avatar" />
                        <h2 className="text-xl font-extrabold mt-4 tracking-tight text-white">
                            {user ? `${user.first_name} ${user.last_name}` : "Loading User..."}
                        </h2>
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
                            <ButtonGroup size="sm" variant="flat" className="w-full flex divide-x divide-zinc-800/60">
                                <Button onClick={() => { setActiveSheet("firstaid"); triggerHaptic("impact"); }} className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-red-500/10 text-red-400">
                                    {t("btn_firstaid")}
                                </Button>
                                <Button onClick={() => { setActiveSheet("promo"); triggerHaptic("impact"); }} className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-zinc-800/60 text-zinc-300">
                                    {t("btn_promo")}
                                </Button>
                                <Button onClick={() => { setActiveSheet("support"); triggerHaptic("impact"); }} className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-zinc-800/60 text-zinc-300">
                                    {t("btn_support")}
                                </Button>
                                <Button onClick={() => { setActiveSheet("orders"); triggerHaptic("impact"); }} className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-zinc-800/60 text-zinc-300">
                                    {t("btn_orders")}
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>

                    {/* ALERTS */}
                    <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <Alert.Indicator>💡</Alert.Indicator>
                        <Alert.Content>
                            <Alert.Title className="text-xs font-semibold text-zinc-300">{t("alert_new_features")}</Alert.Title>
                            <Alert.Description className="text-xs text-zinc-400 mt-1 pl-1 space-y-1 list-none">
                                <li>• {t("alert_localisation")}</li>
                                <li>• {t("alert_payment")}</li>
                                <li>• {t("alert_currency")}</li>
                            </Alert.Description>
                        </Alert.Content>
                    </Alert>

                    <Alert status="warning" variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl w-full">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Title className="text-xs font-semibold text-zinc-300">{t("alert_downtime")}</Alert.Title>
                            <Alert.Description className="text-xs text-zinc-400 mt-1 pl-1 space-y-1 list-none">
                                <li>• {t("alert_downtime_promo")}</li>
                                <li>• {t("alert_downtime_support")}</li>
                            </Alert.Description>
                        </Alert.Content>
                    </Alert>

                    {/* FAQ */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">{t("faq_title")}</h3>
                        <Accordion className="w-full bg-zinc-900/20 border border-zinc-800/60 rounded-2xl px-2">
                            {itemsTips.map((item, index) => (
                                <Accordion.Item key={index} className="border-b border-zinc-800/40 last:border-none">
                                    <Accordion.Heading>
                                        <Accordion.Trigger onClick={() => { triggerHaptic("impact"); }} className="text-xs font-medium py-3 text-zinc-200">
                                            {item.title}
                                            <Accordion.Indicator><ChevronDown /></Accordion.Indicator>
                                        </Accordion.Trigger>
                                    </Accordion.Heading>
                                    <Accordion.Panel>
                                        <Accordion.Body className="text-xs text-zinc-400 pb-3 leading-relaxed">{item.content}</Accordion.Body>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </div>
                    <br /><br /><br />
                </div>
            );
        }

        if (selectedTab === "shop") {
            return <RenderShop lang={lang} />;
        }

        if (selectedTab === "wallet") {
            return (
                <div className="p-4 max-w-md mx-auto space-y-6 overflow-y-auto" style={{ height: '90vh' }}>
                    <br />
                    {/* WALLET CARD */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">{t("wallet_balance_label")}</p>
                                <h2 className="text-3xl font-extrabold mt-1 tracking-tight">
                                    {user ? `${user.balance} $` : "-.-- $"}
                                </h2>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                                {t("wallet_active")}
                            </span>
                        </div>
                        <div className="pt-4 border-t border-zinc-800/60 flex justify-between text-xs text-zinc-400">
                            <div>
                                <p className="text-zinc-500 mb-0.5">{t("wallet_user_id")}</p>
                                <p className="font-mono text-zinc-300">{user?.id ? `#${user.id}` : "#------"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-500 mb-0.5">{t("wallet_currency")}</p>
                                <p className="font-semibold text-zinc-300">USD ($)</p>
                            </div>
                        </div>
                    </div>

                    <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <Alert.Indicator>💡</Alert.Indicator>
                        <Alert.Content>
                            <Alert.Title className="text-xs font-semibold text-zinc-300">{t("wallet_instant_title")}</Alert.Title>
                            <Alert.Description className="text-xs text-zinc-400 mt-0.5">{t("wallet_instant_desc")}</Alert.Description>
                        </Alert.Content>
                    </Alert>

                    {/* TOP UP */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{t("wallet_topup_title")}</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
                                <p className="text-xs text-zinc-400">{t("wallet_topup_desc")}</p>
                                <input
                                    type="number"
                                    value={topupAmount}
                                    onChange={(e) => setTopupAmount(e.target.value)}
                                    placeholder={t("wallet_topup_placeholder")}
                                    className="w-full rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm border border-zinc-800 outline-none focus:ring-2 focus:ring-primary"
                                />
                                <Button onClick={handleTopup} isDisabled={topupLoading || !topupAmount} className="w-full h-12 rounded-xl font-semibold bg-emerald-500 text-black">
                                    {topupLoading ? t("wallet_topup_loading") : t("wallet_topup_btn")}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">$</div>
                                    <div>
                                        <p className="text-xs font-semibold text-white">{t("wallet_cryptobot")}</p>
                                        <p className="text-[10px] text-zinc-500">{t("wallet_cryptobot_sub")}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-emerald-400">{t("wallet_instant")}</p>
                                    <p className="text-[10px] text-zinc-500">{t("wallet_auto")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedTab === "settings") {
            return (
                <div className="p-4 max-w-md mx-auto space-y-6 overflow-y-auto" style={{ height: '90vh' }}>
                    {/* PROFILE CARD */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <img className="w-20 h-20 rounded-full border border-zinc-800 shadow-md object-cover" src={user?.avatar_url} alt="User avatar" />
                        <b className="text-lg font-extrabold mt-3 tracking-tight text-white">
                            {user ? `${user.first_name} ${user.last_name}` : "Loading User..."}
                        </b>
                        <div className="w-full grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-zinc-800/60 text-center">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t("settings_orders")}</span>
                                <span className="text-base font-extrabold text-white mt-0.5">0</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-zinc-800/60">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t("settings_disputes")}</span>
                                <span className="text-base font-extrabold text-white mt-0.5">0</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t("settings_level")}</span>
                                <span className="text-base font-extrabold text-primary mt-0.5">{user?.level ?? 1}</span>
                            </div>
                        </div>
                    </div>

                    {/* LANGUAGE SWITCHER */}
                    <Surface className="w-full bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 border border-zinc-800 rounded-3xl p-3 shadow-xl">
                        <div className="px-2 pb-2 mb-2 border-b border-zinc-800/50">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("settings_language")}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{t("settings_language_desc")}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 p-1">
                            {(Object.keys(langLabels) as Lang[]).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => changeLang(l)}
                                    className={`
                                        text-xs font-semibold px-3 py-2 rounded-xl border transition-all
                                        ${lang === l
                                        ? "bg-primary/20 border-primary/50 text-primary shadow-sm"
                                        : "bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                                    }
                                    `}
                                >
                                    {langLabels[l]}
                                </button>
                            ))}
                        </div>
                    </Surface>

                    {/* NOTIFICATIONS */}
                    <Surface className="w-full bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 border border-zinc-800 rounded-3xl p-3 shadow-xl">
                        <ListBox aria-label="Notifications" className="w-full p-1 bg-transparent" disabledKeys={["delete-file"]} selectionMode="none">
                            <ListBox.Section>
                                <Header className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-2 pb-2 border-b border-zinc-800/50 mb-2">{t("settings_notif_section")}</Header>
                                <ListBox.Item id="essential-notifications" textValue="essential-notifications" className="hover:bg-zinc-800/30 rounded-2xl p-2 transition-colors">
                                    <Switch isSelected isDisabled size="lg">
                                        <Switch.Control><Switch.Thumb /></Switch.Control>
                                        <Switch.Content>
                                            <Label className="text-xs font-semibold text-zinc-200">{t("settings_notif_essential")}</Label>
                                            <Description className="text-[10px] text-zinc-500 mt-0.5">{t("settings_notif_essential_desc")}</Description>
                                        </Switch.Content>
                                    </Switch>
                                </ListBox.Item>
                                <ListBox.Item id="additional-notifications" textValue="additional-notifications" className="hover:bg-zinc-800/30 rounded-2xl p-2 transition-colors mt-1">
                                    <Switch isSelected isDisabled size="lg">
                                        <Switch.Control><Switch.Thumb /></Switch.Control>
                                        <Switch.Content>
                                            <Label className="text-xs font-semibold text-zinc-200">{t("settings_notif_additional")}</Label>
                                            <Description className="text-[10px] text-zinc-500 mt-0.5">{t("settings_notif_additional_desc")}</Description>
                                        </Switch.Content>
                                    </Switch>
                                </ListBox.Item>
                            </ListBox.Section>
                        </ListBox>
                    </Surface>

                    {/* ADD TO HOME */}
                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-base">＋</div>
                            <div>
                                <p className="text-xs font-semibold text-white">{t("settings_add_home")}</p>
                                <p className="text-[10px] text-zinc-500">{t("settings_add_home_desc")}</p>
                            </div>
                        </div>
                        <Button size="sm" variant="flat" onClick={() => window.Telegram?.WebApp?.addToHomeScreen?.()} className="text-[11px] font-semibold rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                            {t("settings_add_home_btn")}
                        </Button>
                    </div>

                    <br /><br /><br />
                </div>
            );
        }

        return <div className="p-4 text-white">{selectedTab.toUpperCase()} content</div>;
    };

    if (loading) {
        return (
            <div style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#0b0f19" }}>
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen justify-between bg-[#0b0f19] text-white pb-20">
            {activeSheet !== null && renderSubPage()}

            <main style={{ paddingTop: "var(--tg-safe-area-inset-top, 0px)", marginTop: "2em" }} className="flex-grow">
                {renderTab()}
            </main>

            {/* CUSTOM ICON TABBAR */}
            <nav style={{
                height: '4em'
            }} className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60">
                <div style={{
                    padding: '0.5em',
                    marginTop: '-0.5em'
                }} className="w-full max-w-md flex items-stretch">
                    {[
                        {
                            id: "home",
                            label: t("tab_home"),
                            icon: (active: boolean) => (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "currentColor"} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                                    <path d="M9 21V12h6v9" />
                                </svg>
                            ),
                        },
                        {
                            id: "shop",
                            label: t("tab_shop"),
                            icon: (active: boolean) => (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                            ),
                        },
                        {
                            id: "wallet",
                            label: t("tab_wallet"),
                            icon: (active: boolean) => (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="5" width="20" height="14" rx="2" />
                                    <path d="M16 12h.01" strokeWidth="2.5" strokeLinecap="round" />
                                    <path d="M2 10h20" />
                                </svg>
                            ),
                        },
                        {
                            id: "settings",
                            label: t("tab_settings"),
                            icon: (active: boolean) => (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            ),
                        },
                    ].map(({ id, label, icon }) => {
                        const active = selectedTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => { closeSheet(); setSelectedTab(id); triggerHaptic("selection"); }}
                                className="flex-1 flex flex-col items-center justify-center gap-1 pt-3 transition-colors relative"
                                style={{ color: active ? "var(--heroui-primary, #6366f1)" : "#71717a", paddingBottom: "calc(0.75rem + var(--tg-safe-area-inset-bottom, 0px))" }}
                                style={{ color: active ? "var(--heroui-primary, #6366f1)" : "#71717a" }}
                            >
                                {active && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-current opacity-80" />
                                )}
                                {icon(active)}
                                <span className="text-[10px] font-semibold tracking-wide leading-none">
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}