"use client";

import React, { useState, useEffect } from "react";
import { Spinner } from "@heroui/react";
import { translations, type Lang } from "@/app/translations";

const API_BASE = "https://bohemia-api-1.yxwfjh.easypanel.host/";

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string;
    category_id: string | number;
    shop_id: string | number;
    shop?: { id: number; name: string };
    views?: number;
    measure_quantity: string | number;
    measure_type: string;
}

type ShopView = "location" | "grid" | "detail";

const RenderShop = ({ lang = "en" }: { lang?: Lang }) => {
    const t = (key: string) => translations[lang][key] ?? key;

    const [loading, setLoading] = useState<boolean>(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedProduct, setSelectedProduct] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const [buying, setBuying] = useState(false);
    const [stashUrl, setStashUrl] = useState<string | null>(null);
    const [buyError, setBuyError] = useState<string | null>(null);

    const currentView: ShopView =
        selectedProduct !== 0 ? "detail" :
            selectedCity !== "" ? "grid" :
                "location";

    function triggerHaptic(type = 'impact', style = 'medium') {
        const WebApp = window.Telegram?.WebApp;
        if (!WebApp || !WebApp.HapticFeedback) return;
        try {
            switch (type) {
                case 'impact': WebApp.HapticFeedback.impactOccurred(style); break;
                case 'notification': WebApp.HapticFeedback.notificationOccurred(style); break;
                case 'selection': WebApp.HapticFeedback.selectionChanged(); break;
            }
        } catch {}
    }

    useEffect(() => {
        const bb = window.Telegram?.WebApp?.BackButton;
        if (!bb) return;

        if (currentView === "location") {
            bb.hide();
            return;
        }
        bb.show();

        const handler = () => {
            triggerHaptic("impact", "light");
            if (currentView === "detail") {
                setSelectedProduct(0);
                setStashUrl(null);
                setBuyError(null);
            } else if (currentView === "grid") {
                setSelectedCity("");
            }
        };

        bb.onClick(handler);
        return () => { bb.offClick(handler); };
    }, [currentView]);

    const handleBuy = async () => {
        if (!currentProductData) return;
        triggerHaptic('impact', 'heavy');
        setBuying(true);
        setBuyError(null);
        setStashUrl(null);

        try {
            const tg = window.Telegram?.WebApp;
            const token = tg?.initData || "/*no-auth*/";

            const res = await fetch(`${API_BASE}/orders/buy`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ product_id: currentProductData.id }),
            });

            const data = await res.json();

            if (!res.ok) {
                triggerHaptic('notification', 'error');
                setBuyError(data?.message || "Purchase failed.");
                return;
            }

            triggerHaptic('notification', 'success');
            setStashUrl(data.src_url);
        } catch (e) {
            triggerHaptic('notification', 'error');
            setBuyError("Network error. Please try again.");
        } finally {
            setBuying(false);
        }
    };

    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    fetch(`${API_BASE}/products`),
                    fetch(`${API_BASE}/products/categories`)
                ]);

                const productsData: Product[] = await productsRes.json();
                productsData.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

                const categoriesRawPayload = await categoriesRes.json();
                setProducts(productsData);

                let finalCategoriesArray: Category[] = [];
                if (Array.isArray(categoriesRawPayload)) {
                    finalCategoriesArray = categoriesRawPayload;
                } else if (categoriesRawPayload?.categories) {
                    finalCategoriesArray = categoriesRawPayload.categories;
                } else if (categoriesRawPayload?.data) {
                    finalCategoriesArray = categoriesRawPayload.data;
                }

                setCategories([{ id: "all", name: t("tab_shop") }, ...finalCategoriesArray]);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchShopData();
    }, []);

    useEffect(() => {
        setCategories((prev) => {
            if (prev.length === 0) return prev;
            const [, ...rest] = prev;
            return [{ id: "all", name: t("tab_shop") }, ...rest];
        });
    }, [lang]);

    const handleProductSelect = async (productId: number) => {
        triggerHaptic('selection');
        setSelectedProduct(productId);
        try {
            await fetch(`${API_BASE}/products/${productId}/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
        } catch {}
    };

    const productsToRender =
        selectedCategory === "all"
            ? products
            : products.filter((p) => String(p.category_id).trim() === String(selectedCategory).trim());

    const currentProductData = products.find((p) => p.id === selectedProduct);

    // ─── Изменено: Карточки стали полупрозрачными (добавлено "aa"), чтобы пропускать свет ───
    const Card = ({ children, style = {} , onClick}: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => (
        <div onClick={onClick} style={{ background: "#111118aa", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid #1E1E2A", borderRadius: 20, overflow: "hidden", cursor: onClick ? "pointer" : "default", ...style }}>
            {children}
        </div>
    );

    const RowButton = ({ label, sub, disabled, onClick }: { label: string; sub: string; disabled?: boolean; onClick?: () => void }) => (
        <button onClick={onClick} disabled={disabled} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", textAlign: "left", color: "inherit", opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                onMouseEnter={e => !disabled && (e.currentTarget.style.background = "#1E1E2A44")}
                onMouseLeave={e => !disabled && (e.currentTarget.style.background = "transparent")}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1E1E2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, fontWeight: 700 }}>📍</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{label}</p>
                <p style={{ fontSize: 11, color: "#8A8A9A", margin: "2px 0 0" }}>{sub}</p>
            </div>
            {!disabled && <span style={{ color: "#44444F", fontSize: 12 }}>➔</span>}
        </button>
    );

    // Повысили прозрачность до 0.25 и убрали жесткий закрашенный фон у контейнеров
    const BackgroundGradient = () => (
        <>
            <div style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none", opacity: 0.25 }}>
                <div style={{ position: "absolute", top: "-10%", right: "-10%", width: "75vw", height: "75vw", borderRadius: "50%", background: "radial-gradient(circle, #5C6BFF 0%, transparent 70%)", filter: "blur(80px)", animation: "revolutPulse 10s infinite alternate" }} />
                <div style={{ position: "absolute", bottom: "10%", left: "-20%", width: "70vw", height: "70vw", borderRadius: "50%", background: "radial-gradient(circle, #00D2A8 0%, transparent 70%)", filter: "blur(80px)", animation: "revolutPulse 14s infinite alternate-reverse" }} />
            </div>
            <style>{`
                @keyframes revolutPulse {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(6%, -4%) scale(1.1); }
                }
            `}</style>
        </>
    );

    if (loading) {
        return (
            <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "#0A0A0F" }}>
                <Spinner size="lg" />
            </div>
        );
    }

    /* ---- 1. LOCATION SELECT ---- */
    if (selectedCity === "") {
        return (
            <div style={{ padding: "16px 16px 120px", maxWidth: 480, margin: "0 auto", overflowY: "auto", background: "transparent" }}>
                <BackgroundGradient />
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#44444F", textTransform: "uppercase", margin: "24px 0 8px 4px" }}>
                    {t("shop_select_location")}
                </p>
                <Card>
                    <RowButton label="Ostrava-Poruba" sub="Czech Republic" onClick={() => { triggerHaptic('impact', 'medium'); setSelectedCity("ost"); }} />
                    <div style={{ height: 1, background: "#1E1E2A", margin: "0 16px" }} />
                    <RowButton label={`Ostrava-Karolina — ${t("shop_out_of_stock")}`} sub="Czech Republic" disabled />
                    <div style={{ height: 1, background: "#1E1E2A", margin: "0 16px" }} />
                    <RowButton label={`Ostrava-Zabřeh — ${t("shop_out_of_stock")}`} sub="Czech Republic" disabled />
                    <div style={{ height: 1, background: "#1E1E2A", margin: "0 16px" }} />
                    <RowButton label={`Brno-Komarov — ${t("shop_coming_soon")}`} sub="Czech Republic" disabled />
                </Card>
            </div>
        );
    }

    /* ---- 2. PRODUCT GRID ---- */
    if (selectedProduct === 0) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "90vh", background: "transparent" }}>
                <br />
                <BackgroundGradient />
                {/* Изменено: Убрали жесткий #0A0A0F у шапки категорий */}
                <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0A0A0F88", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid #1E1E2A", padding: "10px 16px", display: "flex", gap: 8, overflowX: "auto" }} className="hide-scrollbar">
                    {categories.map((cat) => {
                        const isSelected = String(selectedCategory) === String(cat.id);
                        return (
                            <button key={cat.id} onClick={() => { triggerHaptic('selection'); setSelectedCategory(cat.id); }}
                                    style={{
                                        fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                                        background: isSelected ? "#5C6BFF" : "#11111888",
                                        color: isSelected ? "#fff" : "#8A8A9A",
                                        border: isSelected ? "1px solid transparent" : "1px solid #1E1E2A"
                                    }}>
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {productsToRender.length === 0 ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: "#8A8A9A", fontSize: 13 }}>
                        {t("shop_empty_category")}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 16px 120px", maxWidth: 480, margin: "0 auto", overflowY: "auto", width: "100%", boxSizing: "border-box", background: "transparent" }}>
                        {productsToRender.map((product) => (
                            <Card key={product.id} onClick={() => handleProductSelect(product.id)} style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ position: "relative", width: "100%", paddingBottom: "100%", overflow: "hidden", background: "#11111844" }}>
                                    <img src={product.image || "https://placehold.co/150"} alt={product.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: "#44444F", textTransform: "uppercase", letterSpacing: "0.02em" }}>{product.shop?.name ?? t("shop_unknown_shop")}</span>
                                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</h3>
                                    <p style={{ fontSize: 11, color: "#8A8A9A", margin: 0 }}>{product.measure_quantity} {product.measure_type}</p>
                                    <div style={{ marginTop: "auto", paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: "#00D2A8" }}>{product.price} $</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    /* ---- 3. PRODUCT DETAIL ---- */
    return (
        <div style={{ padding: "16px 16px 120px", maxWidth: 480, margin: "0 auto", overflowY: "auto", width: "100%", boxSizing: "border-box", background: "transparent" }}>
            <br />
            <BackgroundGradient />
            {currentProductData ? (
                <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <img src={currentProductData.image || "https://placehold.co/150"} alt={currentProductData.name} style={{ width: 76, height: 76, borderRadius: 16, objectFit: "cover", border: "1px solid #1E1E2A" }} />
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>{currentProductData.name}</h2>
                            <p style={{ fontSize: 12, color: "#8A8A9A", margin: "2px 0 0" }}>{currentProductData.shop?.name ?? t("shop_unknown_shop")}</p>
                        </div>
                    </div>

                    <div style={{ height: 1, background: "#1E1E2A" }} />
                    <p style={{ fontSize: 13, color: "#8A8A9A", margin: 0, lineHeight: 1.6 }}>{currentProductData.description}</p>
                    <div style={{ height: 1, background: "#1E1E2A" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#44444F", textTransform: "uppercase", margin: "0 0 2px" }}>{t("shop_quantity")}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>{currentProductData.measure_quantity} {currentProductData.measure_type}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#44444F", textTransform: "uppercase", margin: "0 0 2px" }}>{t("shop_price")}</p>
                            <p style={{ fontSize: 22, fontWeight: 900, color: "#00D2A8", margin: 0 }}>{currentProductData.price} $</p>
                        </div>
                    </div>

                    {stashUrl ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                            <Card style={{ background: "#00D2A811", borderColor: "#00D2A833", padding: 12, textAlign: "center" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#00D2A8", margin: 0 }}>{t("shop_success")}</p>
                            </Card>
                            <button onClick={() => { triggerHaptic('impact', 'light'); setStashUrl(null); setSelectedProduct(0); }}
                                    style={{ width: "100%", background: "#1E1E2A", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                {t("shop_back_catalog")}
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                            {buyError && <p style={{ fontSize: 12, color: "#FF4D6A", textAlign: "center", margin: 0 }}>{buyError}</p>}
                            <button onClick={handleBuy} disabled={buying}
                                    style={{ width: "100%", background: "#5C6BFF", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                                {buying ? <Spinner size="sm" color="white" /> : t("shop_buy")}
                            </button>
                        </div>
                    )}
                </Card>
            ) : (
                <p style={{ textAlign: "center", fontSize: 13, color: "#8A8A9A" }}>{t("shop_product_not_found")}</p>
            )}
        </div>
    );
};

export default RenderShop;