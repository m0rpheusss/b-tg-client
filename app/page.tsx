"use client";

import {
    Accordion,
    Alert,
    Avatar,
    Button,
    ButtonGroup,
    Spinner,
    Tabs,
    Surface,
    ListBox,
    Separator,
    Header, Description, Label, Switch
} from "@heroui/react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import RenderShop from "@/app/conponents/shop/RenderShop";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import OrdersSheet from "@/app/conponents/OrdersSheet";

// Define our views
type SheetType = "firstaid" | "promo" | "support" | "orders" | null;

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState("home");
    const [user, setUser] = useState<any>(null);
    const [activeSheet, setActiveSheet] = useState<SheetType>(null);

    const requestInitialized = useRef(false);

    const [topupAmount, setTopupAmount] = useState("");
    const [topupLoading, setTopupLoading] = useState(false);


    const itemsTips = [
        {
            content: "Browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping and payment information to complete your purchase.",
            title: "How do I place an order?",
        },
        {
            content: "Yes, you can modify or cancel your order before it's shipped. Once your order is processed, you can't make changes.",
            title: "How to deal with disputes?",
        },
        {
            content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
            title: "Can I get a refund?",
        },
        {
            content: "We accept all major credit cards, including Visa, Mastercard, and American Express.",
            title: "What payment methods do you accept?",
        },
    ];

    function triggerHaptic(type = 'impact', style = 'medium') {
        // Check if the Telegram WebApp SDK is available
        const WebApp = window.Telegram?.WebApp;

        if (!WebApp || !WebApp.HapticFeedback) {
            console.warn("Telegram HapticFeedback is not available in this environment.");
            return;
        }

        try {
            switch (type) {
                case 'impact':
                    // Styles: 'light', 'medium', 'heavy', 'rigid', 'soft'
                    WebApp.HapticFeedback.impactOccurred(style);
                    break;
                case 'notification':
                    // Styles: 'error', 'success', 'warning'
                    WebApp.HapticFeedback.notificationOccurred(style);
                    break;
                case 'selection':
                    // No style needed for selection change
                    WebApp.HapticFeedback.selectionChanged();
                    break;
                default:
                    console.error(`Unknown haptic type: ${type}`);
            }
        } catch (error) {
            console.error("Failed to trigger haptic feedback:", error);
        }
    }

    // 1. Memoize the fetch function so it can be safely used inside multiple hooks
    const fetchUserData = useCallback((token: string) => {
        return fetch(`https://bohemia-api-1.yxwfjh.easypanel.host/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                // "ngrok-skip-browser-warning": "any-value",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return res.json();
            })
            .then((response) => {
                if (response) {
                    setUser(response);
                }
            })
            .catch((error) => {
                console.error("❌ HTTP Fetch Error Context:", error);
            });
    }, []);

    // 2. Combined initialization and 5-second polling effect
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
        if(tg?.platform === "android" || tg?.platform === "ios"){
            tg.requestFullscreen?.();
        }
        tg.ready();

        let intervalId: NodeJS.Timeout;

        const startPolling = async () => {
            const getToken = () => tg.initData || "/*no-auth*/";

            const fetchAndUpdate = async () => {
                try {
                    await fetchUserData(getToken());
                } catch (e) {
                    console.error("Polling error:", e);
                }
            };

            // initial fetch
            await fetchAndUpdate();
            setLoading(false);

            // repeat every 5s
            intervalId = setInterval(fetchAndUpdate, 5000);
        };

        startPolling();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
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
                body: JSON.stringify({
                    amount: Number(topupAmount),
                    userId: user?.id,
                }),
            });

            if (!res.ok) throw new Error("Failed to create invoice");

            const data = await res.json();

            if (data?.payUrl) {
                // open CryptoBot payment page
                window.open(data.payUrl, "_blank");
            }

            setTopupAmount("");
        } catch (err) {
            console.error("Topup error:", err);
        } finally {
            setTopupLoading(false);
        }
    };

    // Dynamic rendering engine for our full-screen subpages
    const renderSubPage = () => {
        switch (activeSheet) {
            case "firstaid":
                return (
                    <div className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto" style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    🚨 First Aid & Harm Reduction
                                </h2>
                                <p className="text-xs text-zinc-500 mt-0.5">Objective, peer-vetted safety procedures</p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => { closeSheet(); triggerHaptic("impact") }} className="border border-zinc-700 bg-zinc-900/50 rounded-xl">
                                Back
                            </Button>
                        </div>

                        <div className="flex-grow space-y-4 max-w-2xl mx-auto w-full">

                            {/* SECTION 1: MEDICAL CRISIS / OVERDOSE */}
                            <div className="bg-gradient-to-br from-red-950/20 to-zinc-950 border border-red-900/40 rounded-3xl p-5 shadow-xl">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">
                                    1. Suspected Overdose / Depressant Emergency
                                </h3>

                                <div className="space-y-3 text-xs text-zinc-300">
                                    <p className="font-semibold text-white">
                                        Signs of Opioid/Depressant Toxicity:
                                    </p>
                                    <ul className="list-disc list-inside text-zinc-400 space-y-1 pl-1">
                                        <li>Unresponsive to physical stimulation (sternum rub)</li>
                                        <li>Breathing is slow, irregular, shallow, or completely stopped</li>
                                        <li>Choking, snoring, or deep gurgling sounds</li>
                                        <li>Blue, gray, or pale lips, skin, or fingernails</li>
                                    </ul>

                                    <div className="border-t border-red-900/30 pt-3 mt-2">
                                        <p className="font-semibold text-white mb-2">Immediate Steps to Take:</p>
                                        <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                                            <li>
                                                <strong className="text-red-400">Call Emergency Services Immediately:</strong>
                                                State clearly that someone is "unconscious and not breathing." Give the exact location.
                                            </li>
                                            <li>
                                                <strong>Administer Naloxone (Narcan):</strong>
                                                If opioids are suspected, administer nasal or injectable Naloxone. Repeat every 2–3 minutes if no response. *Note: Naloxone will not harm someone if they haven't taken opioids.*
                                            </li>
                                            <li>
                                                <strong>Perform Rescue Breathing:</strong>
                                                If they are not breathing, ensure their airway is clear, tilt the head back, pinch the nose, and deliver 1 breath every 5 seconds.
                                            </li>
                                            <li>
                                                <strong>The Recovery Position:</strong>
                                                If you must leave the person unattended or if they are breathing on their own but remain unconscious, roll them onto their side (recovery position) to prevent choking.
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: PSYCHOLOGICAL / PSYCHEDELIC CRISIS */}
                            <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                                    2. Psychological Crisis (Challenging Experiences)
                                </h3>

                                <div className="space-y-3 text-xs text-zinc-300">
                                    <p className="text-zinc-400">
                                        When someone experiences acute panic, paranoia, or disorientation from psychedelic or psychoactive substances, implement core peer-support protocols:
                                    </p>

                                    <ul className="space-y-3 mt-2">
                                        <li>
                                            <strong className="text-white block font-semibold">✓ Safe Environment (Set & Setting)</strong>
                                            Move the individual away from crowded spaces, loud music, bright or flashing lights, and unfamiliar people. Provide a quiet, warm, and comfortable space to lie down.
                                        </li>
                                        <li>
                                            <strong className="text-white block font-semibold">✓ De-escalate, Don't Control</strong>
                                            Do not attempt to suppress or argue with their experience. Avoid saying "calm down." Instead, ask grounding questions to help them verbalize their energy (e.g., *"Can you feel your feet on the floor?"* or *"What are you feeling right now?"*).
                                        </li>
                                        <li>
                                            <strong className="text-white block font-semibold">✓ Reassure and Stay Present</strong>
                                            Calmly remind them that they have taken a substance, that they are physically safe, and that the drug's effects are temporary and will wear off. Never leave an acutely panicked individual completely unattended.
                                        </li>
                                        <li>
                                            <strong className="text-white block font-semibold">⚠️ Monitor Physical Red Flags</strong>
                                            Distinguish a "bad trip" from a medical issue. If they show a dangerously elevated heart rate, extreme fever/overheating, chest pain, seizures, or become a physical danger to themselves or others, transition immediately to medical emergency procedures.
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* SECTION 3: RECOVERY AND DOSAGE FUNDAMENTALS */}
                            <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-4 text-xs text-zinc-400 space-y-2">
                                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                                    General Harm Reduction Principles
                                </h3>
                                <p>
                                    • <strong>Polysubstance Risks:</strong> Combining multiple substances—especially depressants like alcohol, benzodiazepines, and opioids—exponentially increases the risk of unpredictable interactions and fatal respiratory depression.
                                </p>
                                <p>
                                    • <strong>Hydration & Electrolytes:</strong> Ensure individuals on stimulants or entheogens sip water regularly (approximately 250–500ml per hour), but avoid over-hydration.
                                </p>
                            </div>

                        </div>
                    </div>
                );

            case "promo":
                return (
                    <div className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto" style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                            <h2 className="text-xl font-bold">🎁 Promo Code</h2>
                            <Button size="sm" variant="ghost" onClick={() => { closeSheet(); triggerHaptic("impact") }} className="border border-zinc-700 bg-zinc-900/50 rounded-xl">Back</Button>
                        </div>
                        <div className="flex flex-col gap-4 flex-grow max-w-md mx-auto w-full">
                            <p className="text-xs text-zinc-400">Enter your promo code below to apply a discount to your account balance.</p>
                            <input
                                type="text"
                                placeholder="e.g. BOHEMIA20"
                                className="w-full rounded-2xl bg-zinc-900/50 text-white px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary border border-zinc-800"
                            />
                            <Button isDisabled={true} color="primary" className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20">Apply Code</Button>
                        </div>
                    </div>
                );

            case "support":
                return (
                    <div className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto" style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                            <h2 className="text-xl font-bold">💬 Support</h2>
                            <Button size="sm" variant="ghost" onClick={() => { closeSheet(); triggerHaptic("impact") }} className="border border-zinc-700 bg-zinc-900/50 rounded-xl">Back</Button>
                        </div>

                        <div className="flex flex-col gap-4 flex-grow max-w-md mx-auto w-full">
                            <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl w-full">
                                <Alert.Indicator />
                                <Alert.Content>
                                    <Alert.Title className="text-xs font-semibold text-zinc-300">You don't have any conversations yet.</Alert.Title>
                                </Alert.Content>
                            </Alert>

                            <textarea
                                placeholder="Describe your issue..."
                                rows={6}
                                className="w-full rounded-2xl bg-zinc-900/50 text-white px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none border border-zinc-800"
                            />
                            <Button color="primary" className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20">Start conversation</Button>
                        </div>
                    </div>
                );

            case "orders":
                return <OrdersSheet onClose={() => { closeSheet(); triggerHaptic("impact") }} />;
            default:
                return null;
        }
    };

    const renderTab = () => {
        if (selectedTab === "home") {
            return (
                <div className="p-4 max-w-md mx-auto space-y-6 overflow-y-auto" style={{ height: '90vh' }}>

                    {/* CARD 1: MAIN HOME USER DISPLAY */}
                    <div className="relative overflow-hidden  flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                        <img className="w-24 h-24 rounded-full border-2 border-zinc-800/80 shadow-md object-cover" src={user?.avatar_url} alt="User avatar" />

                        <h2 className="text-xl font-extrabold mt-4 tracking-tight text-white">
                            {user ? `${user.first_name} ${user.last_name}` : "Loading User..."}
                        </h2>
                        {/*<span className="mt-1 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-primary/20">*/}
                        {/*    Member*/}
                        {/*</span>*/}
                    </div>

                    {/* QUICK ACTIONS BUTTON GROUP */}
                    {/* QUICK ACTIONS BUTTON GROUP */}
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">


                            <ButtonGroup
                                size="sm"
                                variant="flat"
                                className="w-full flex divide-x divide-zinc-800/60"
                            >
                                <Button
                                    onClick={() => {setActiveSheet("firstaid"); triggerHaptic("impact")}}
                                    className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-red-500/10 text-red-400"
                                >
                                    First Aid
                                </Button>

                                <Button
                                    onClick={() => {setActiveSheet("promo"); triggerHaptic("impact")}}
                                    className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-zinc-800/60 text-zinc-300"
                                >
                                    Promo
                                </Button>

                                <Button
                                    onClick={() => {setActiveSheet("support"); triggerHaptic("impact")}}
                                    className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-zinc-800/60 text-zinc-300"
                                >
                                    Support
                                </Button>

                                <Button
                                    onClick={() => {setActiveSheet("orders"); triggerHaptic("impact")}}
                                    className="flex-1 text-[11px] font-medium py-3 rounded-none bg-transparent hover:bg-zinc-800/60 text-zinc-300"
                                >
                                    Orders
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>

                    {/* UPCOMING FEATURES ALERT */}
                    <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <Alert.Indicator>💡</Alert.Indicator>
                        <Alert.Content>
                            <Alert.Title className="text-xs font-semibold text-zinc-300">New features coming soon</Alert.Title>
                            <Alert.Description className="text-xs text-zinc-400 mt-1 pl-1 space-y-1 list-none">
                                <li>• Full localisation (en, cz, ru, ua, kz)</li>
                                <li>• More payment methods</li>
                                <li>• Multiple currency options</li>
                            </Alert.Description>
                        </Alert.Content>
                    </Alert>

                    {/* FAQ ACCORDION */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">Frequently Asked Questions</h3>
                        <Accordion className="w-full bg-zinc-900/20 border border-zinc-800/60 rounded-2xl px-2">
                            {itemsTips.map((item, index) => (
                                <Accordion.Item key={index} className="border-b border-zinc-800/40 last:border-none">
                                    <Accordion.Heading>
                                        <Accordion.Trigger onClick={() => { triggerHaptic("impact") }} className="text-xs font-medium py-3 text-zinc-200">
                                            {item.title}
                                            <Accordion.Indicator>
                                                <ChevronDown />
                                            </Accordion.Indicator>
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
            return <RenderShop />;
        }

        if (selectedTab === "wallet") {
            return (
                <div className="p-4 max-w-md mx-auto space-y-6 overflow-y-auto" style={{ height: '90vh' }}>

                    <br />

                    {/* CARD 1: MAIN WALLET DISPLAY */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase">Available Balance</p>
                                <h2 className="text-3xl font-extrabold mt-1 tracking-tight">
                                    {user ? `${user.balance} $` : "-.-- $"}
                                </h2>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                                Active
                            </span>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/60 flex justify-between text-xs text-zinc-400">
                            <div>
                                <p className="text-zinc-500 mb-0.5">User ID</p>
                                <p className="font-mono text-zinc-300">{user?.id ? `#${user.id}` : "#------"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-500 mb-0.5">Currency</p>
                                <p className="font-semibold text-zinc-300">USD ($)</p>
                            </div>
                        </div>
                    </div>

                    {/* CRYPTO EXCHANGES / NETWORKS ALERT INFO */}
                    <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <Alert.Indicator>💡</Alert.Indicator>
                        <Alert.Content>
                            <Alert.Title className="text-xs font-semibold text-zinc-300">Instant Payments Supported</Alert.Title>
                            <Alert.Description className="text-xs text-zinc-400 mt-0.5">
                                We support instant payments via CryptoBot.
                            </Alert.Description>
                        </Alert.Content>
                    </Alert>

                    {/* TRANSACTION HISTORY SECTION */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Top up wallet</h3>
                        </div>

                        {/* List Container */}
                        <div className="space-y-3">

                            {/* INPUT */}
                            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
                                <p className="text-xs text-zinc-400">Enter amount to top up</p>

                                <input
                                    type="number"
                                    value={topupAmount}
                                    onChange={(e) => setTopupAmount(e.target.value)}
                                    placeholder="e.g. 5"
                                    className="w-full rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm border border-zinc-800 outline-none focus:ring-2 focus:ring-primary"
                                />

                                <Button
                                    onClick={handleTopup}
                                    isDisabled={topupLoading || !topupAmount}
                                    className="w-full h-12 rounded-xl font-semibold bg-emerald-500 text-black"
                                >
                                    {topupLoading ? "Creating invoice..." : "Top up with CryptoBot"}
                                </Button>
                            </div>

                            {/* INFO CARD */}
                            <div className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">
                                        $
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-white">CryptoBot</p>
                                        <p className="text-[10px] text-zinc-500">USDT payments</p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs font-bold text-emerald-400">Instant</p>
                                    <p className="text-[10px] text-zinc-500">Auto confirm</p>
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

                    {/* CARD 1: MAIN PROFILE DASHBOARD CARD */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                        <img className="w-20 h-20 rounded-full border border-zinc-800 shadow-md object-cover" src={user?.avatar_url} alt="User avatar" />

                        <b className="text-lg font-extrabold mt-3 tracking-tight text-white">
                            {user ? `${user.first_name} ${user.last_name}` : "Loading User..."}
                        </b>

                        <div className="w-full grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-zinc-800/60 text-center">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Orders</span>
                                <span className="text-base font-extrabold text-white mt-0.5">0</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-zinc-800/60">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Disputes</span>
                                <span className="text-base font-extrabold text-white mt-0.5">0</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Level</span>
                                <span className="text-base font-extrabold text-primary mt-0.5">{user?.level ?? 1}</span>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: CONFIGURATION CONFIG SURFACES */}
                    <Surface className="w-full bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 border border-zinc-800 rounded-3xl p-3 shadow-xl">
                        <ListBox
                            aria-label="File actions"
                            className="w-full p-1 bg-transparent"
                            disabledKeys={["delete-file"]}
                            selectionMode="none"
                        >
                            <ListBox.Section>
                                <Header className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-2 pb-2 border-b border-zinc-800/50 mb-2">Notifications</Header>
                                <ListBox.Item id="essential-notifications" textValue="essential-notifications" className="hover:bg-zinc-800/30 rounded-2xl p-2 transition-colors">
                                    <Switch isSelected={true} isDisabled={true} size="lg">
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                        <Switch.Content>
                                            <Label className="text-xs font-semibold text-zinc-200">Essential notifications</Label>
                                            <Description className="text-[10px] text-zinc-500 mt-0.5">Enables only essential notifications</Description>
                                        </Switch.Content>
                                    </Switch>
                                </ListBox.Item>
                                <ListBox.Item id="additional-notifications" textValue="additional-notifications" className="hover:bg-zinc-800/30 rounded-2xl p-2 transition-colors mt-1">
                                    <Switch isSelected={true} isDisabled={true} size="lg">
                                        <Switch.Control>
                                            <Switch.Thumb />
                                        </Switch.Control>
                                        <Switch.Content>
                                            <Label className="text-xs font-semibold text-zinc-200">Additional notifications</Label>
                                            <Description className="text-[10px] text-zinc-500 mt-0.5">Enables additional notifications (eg. promotions)</Description>
                                        </Switch.Content>
                                    </Switch>
                                </ListBox.Item>
                            </ListBox.Section>
                        </ListBox>
                    </Surface>

                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-base">
                                ＋
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white">Add to Home Screen</p>
                                <p className="text-[10px] text-zinc-500">Quick access from your home screen</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="flat"
                            onClick={() => window.Telegram?.WebApp?.addToHomeScreen?.()}
                            className="text-[11px] font-semibold rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                        >
                            Add
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
            <div style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#0b0f19",
            }}>
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen justify-between bg-[#0b0f19] text-white pb-20">
            {activeSheet !== null && renderSubPage()}

            <main
                style={{
                    paddingTop: "var(--tg-safe-area-inset-top, 0px)",
                    marginTop: "2em",
                }}
                className="flex-grow"
            >
                {renderTab()}
            </main>

            <center className="tabbar">
                <Tabs className="w-full max-w-md tabbar-tabs">
                    <Tabs.ListContainer>
                        <Tabs.List aria-label="Options">
                            <Tabs.Tab onClick={() => { closeSheet(); setSelectedTab("home"); }} id="home">
                                Home
                                <Tabs.Indicator />
                            </Tabs.Tab>
                            <Tabs.Tab onClick={() => { closeSheet(); setSelectedTab("shop"); }} id="shop">
                                Shop
                                <Tabs.Indicator />
                            </Tabs.Tab>
                            <Tabs.Tab onClick={() => { closeSheet(); setSelectedTab("wallet"); }} id="wallet">
                                Wallet
                                <Tabs.Indicator />
                            </Tabs.Tab>
                            <Tabs.Tab onClick={() => { closeSheet(); setSelectedTab("settings"); }} id="settings">
                                Settings
                                <Tabs.Indicator />
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs.ListContainer>
                </Tabs>
            </center>
        </div>
    );
}