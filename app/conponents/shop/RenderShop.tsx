"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Spinner } from "@heroui/react";
import { translations, type Lang } from "@/app/translations";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Category {
    id: number | string;
    name: string;
}

interface Subcategory {
    id: number | string;
    name: string;
    categoryId: number | string;
}

interface Shop {
    id: number;
    name: string;
}

interface District {
    id: number;
    name: string;
    city_id: number;
}

interface City {
    id: number;
    name: string;
    country: string;
    districts: District[];
}

interface Product {
    id: number;
    name: string;
    description: string;
    price: string | number; // В JSON приходит строка "33.99"
    image: string;
    subcategoryId: number | string;
    shopId: number | string;
    views?: number;
    measureQuantity: string | number;
    measureType: string;
    createdAt?: string;
    subcategory?: {
        id: number | string;
        name: string;
        categoryId: number | string;
    };
    shop?: {
        id: number;
        name: string
    };
}

type SortOption = "popular" | "price_asc" | "price_desc" | "newest";

const RenderShop = ({ lang = "en" }: { lang?: Lang }) => {
    const activeTranslations = translations[lang] || translations["en"];
    const t = (key: string) => activeTranslations[key] ?? key;

    const [loading, setLoading] = useState<boolean>(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [cities, setCities] = useState<City[]>([]);

    // Navigation state
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

    // Filter state
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("all");
    const [selectedShopId, setSelectedShopId] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortOption>("popular");
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });

    // Temporary States for filter modal
    const [tempCategoryId, setTempCategoryId] = useState<string>("all");
    const [tempSubcategoryId, setTempSubcategoryId] = useState<string>("all");
    const [tempShopId, setTempShopId] = useState<string>("all");
    const [tempPriceRange, setTempPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });

    // Product detail state
    const [selectedProductId, setSelectedProductId] = useState<number>(0);
    const [buying, setBuying] = useState(false);
    const [stashUrl, setStashUrl] = useState<string | null>(null);
    const [buyError, setBuyError] = useState<string | null>(null);

    const currentView = useMemo(() => {
        if (selectedProductId !== 0) return "detail";
        if (selectedDistrictId !== null) return "products";
        if (selectedCityId !== null) return "district";
        return "city";
    }, [selectedProductId, selectedDistrictId, selectedCityId]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategoryId !== "all") count++;
        if (selectedSubcategoryId !== "all") count++;
        if (selectedShopId !== "all") count++;
        if (priceRange.min > 0 || priceRange.max < 10000) count++;
        return count;
    }, [selectedCategoryId, selectedSubcategoryId, selectedShopId, priceRange]);

    const triggerHaptic = useCallback((type = "impact", style = "medium") => {
        const WebApp = window.Telegram?.WebApp;
        if (!WebApp || !WebApp.HapticFeedback) return;
        try {
            switch (type) {
                case "impact": WebApp.HapticFeedback.impactOccurred(style); break;
                case "notification": WebApp.HapticFeedback.notificationOccurred(style); break;
                case "selection": WebApp.HapticFeedback.selectionChanged(); break;
            }
        } catch {}
    }, []);

    // Prevent body scroll when filter modal is open
    useEffect(() => {
        if (showFilters) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [showFilters]);

    // Handle Telegram BackButton behaviors smoothly
    useEffect(() => {
        const bb = window.Telegram?.WebApp?.BackButton;
        if (!bb) return;

        if (currentView === "city") {
            bb.hide();
            return;
        }
        bb.show();

        const handler = () => {
            triggerHaptic("impact", "light");
            if (currentView === "detail") {
                setSelectedProductId(0);
                setStashUrl(null);
                setBuyError(null);
            } else if (currentView === "products") {
                setSelectedDistrictId(null);
            } else if (currentView === "district") {
                setSelectedCityId(null);
            }
        };

        bb.onClick(handler);
        return () => { bb.offClick(handler); };
    }, [currentView, triggerHaptic]);

    const selectedCity = useMemo(() => cities.find((c) => c.id === selectedCityId), [cities, selectedCityId]);
    const selectedDistrict = useMemo(() => selectedCity?.districts.find((d) => d.id === selectedDistrictId), [selectedCity, selectedDistrictId]);
    const currentProductData = useMemo(() => products.find((p) => p.id === selectedProductId), [products, selectedProductId]);

    const handleBuy = async () => {
        if (!currentProductData || !selectedDistrictId) return;
        triggerHaptic("impact", "heavy");
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
                body: JSON.stringify({
                    product_id: currentProductData.id,
                    district_id: selectedDistrictId
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                triggerHaptic("notification", "error");
                setBuyError(data?.message || "Purchase failed.");
                return;
            }

            triggerHaptic("notification", "success");
            setStashUrl(data.src_url);
        } catch {
            triggerHaptic("notification", "error");
            setBuyError("Network error. Please try again.");
        } finally {
            setBuying(false);
        }
    };

    // Fetch initial data catalog
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [citiesRes, categoriesRes, subcategoriesRes, shopsRes] = await Promise.all([
                    fetch(`${API_BASE}/shops/cities`),
                    fetch(`${API_BASE}/products/categories`),
                    fetch(`${API_BASE}/products/subcategories`),
                    fetch(`${API_BASE}/shops`),
                ]);

                setCities(await citiesRes.json());
                setCategories(await categoriesRes.json());
                setSubcategories(await subcategoriesRes.json());
                setShops(await shopsRes.json());
            } catch (error) {
                console.error("Error fetching initial catalog data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch products when selected district switches
    useEffect(() => {
        const fetchProducts = async () => {
            if (!selectedDistrictId) {
                setProducts([]);
                return;
            }

            setLoading(true);
            try {
                const url = `${API_BASE}/products?districtId=${selectedDistrictId}`;
                const productsRes = await fetch(url);
                const productsData: Product[] = await productsRes.json();
                setProducts(productsData);
            } catch (error) {
                console.error("Error fetching location products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [selectedDistrictId]);

    // Apply filters and sorting runtime
    useEffect(() => {
        let result = [...products];

        if (selectedCategoryId !== "all") {
            result = result.filter(p => {
                const catId = p.subcategory?.categoryId || p.subcategory?.category?.id;
                return catId ? String(catId) === selectedCategoryId : false;
            });
        }
        if (selectedSubcategoryId !== "all") {
            result = result.filter(p => String(p.subcategoryId) === selectedSubcategoryId);
        }

        if (selectedShopId !== "all") {
            result = result.filter(p => {
                const rootShopId = p.shopId ? String(p.shopId).trim() : null;
                const nestedShopId = p.shop?.id ? String(p.shop.id).trim() : null;

                return rootShopId === selectedShopId || nestedShopId === selectedShopId;
            });
        }

        result = result.filter(p => {
            const numPrice = Number(p.price);
            return numPrice >= priceRange.min && numPrice <= priceRange.max;
        });

        switch (sortBy) {
            case "popular":
                result.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
                break;
            case "price_asc":
                result.sort((a, b) => Number(a.price) - Number(b.price));
                break;
            case "price_desc":
                result.sort((a, b) => Number(b.price) - Number(a.price));
                break;
            case "newest":
                result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                break;
        }

        setFilteredProducts(result);
    }, [products, selectedCategoryId, selectedSubcategoryId, selectedShopId, sortBy, priceRange]);

    const handleProductSelect = async (productId: number) => {
        triggerHaptic("selection");
        setSelectedProductId(productId);
        try {
            await fetch(`${API_BASE}/products/${productId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
        } catch {}
    };

    const openFilters = () => {
        setTempCategoryId(selectedCategoryId);
        setTempSubcategoryId(selectedSubcategoryId);
        setTempShopId(selectedShopId);
        setTempPriceRange(priceRange);
        setShowFilters(true);
        triggerHaptic("impact", "light");
    };

    const applyFilters = () => {
        setSelectedCategoryId(tempCategoryId);
        setSelectedSubcategoryId(tempSubcategoryId);
        setSelectedShopId(tempShopId);
        setPriceRange(tempPriceRange);
        setShowFilters(false);
        triggerHaptic("impact", "medium");
    };

    const resetFilters = () => {
        setTempCategoryId("all");
        setTempSubcategoryId("all");
        setTempShopId("all");
        setTempPriceRange({ min: 0, max: 10000 });
        triggerHaptic("impact", "light");
    };

    const uniqueShops = useMemo(() =>
            Array.from(new Map(products.map(p => [p.shopId, p.shop])).values()).filter(Boolean),
        [products]
    );

    const categoriesWithCount = useMemo(() =>
            categories.map(cat => ({
                ...cat,
                count: products.filter(p => {
                    const catId = p.subcategory?.categoryId || p.subcategory?.category?.id;
                    return catId ? String(catId) === String(cat.id) : false;
                }).length
            })),
        [categories, products]
    );

    const availableSubcategories = useMemo(() => {
        if (tempCategoryId === "all") return [];
        return subcategories
            .filter(s => {
                // Если в объекте подкатегорий из API поле называется categoryId
                const cId = s.categoryId || (s as any).category_id;
                return String(cId) === String(tempCategoryId);
            })
            .map(sub => ({
                ...sub,
                count: products.filter(p => String(p.subcategoryId) === String(sub.id)).length
            }));
    }, [subcategories, products, tempCategoryId]);

    const Breadcrumb = () => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                overflowX: "auto",
                whiteSpace: "nowrap",
                background: "rgba(10, 10, 15, 0.75)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderBottom: "1px solid #1E1E2A",
            }}
        >
            <button
                onClick={() => {
                    triggerHaptic("impact", "light");
                    setSelectedCityId(null);
                    setSelectedDistrictId(null);
                    setSelectedProductId(0);
                }}
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: selectedCityId ? "#8A8A9A" : "#fff",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                }}
            >
                {t("shop_cities") || "Cities"}
            </button>
            {selectedCityId && (
                <>
                    <span style={{ color: "#44444F", fontSize: 12 }}>›</span>
                    <button
                        onClick={() => {
                            triggerHaptic("impact", "light");
                            setSelectedDistrictId(null);
                            setSelectedProductId(0);
                        }}
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: selectedDistrictId ? "#8A8A9A" : "#fff",
                            background: "transparent",
                            border: "none",
                            cursor: selectedDistrictId ? "pointer" : "default",
                            padding: 0,
                        }}
                    >
                        {selectedCity?.name}
                    </button>
                </>
            )}
            {selectedDistrictId && (
                <>
                    <span style={{ color: "#44444F", fontSize: 12 }}>›</span>
                    <button
                        onClick={() => {
                            triggerHaptic("impact", "light");
                            setSelectedProductId(0);
                        }}
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: selectedProductId ? "#8A8A9A" : "#fff",
                            background: "transparent",
                            border: "none",
                            cursor: selectedProductId ? "pointer" : "default",
                            padding: 0,
                        }}
                    >
                        {selectedDistrict?.name}
                    </button>
                </>
            )}
            {selectedProductId && currentProductData && (
                <>
                    <span style={{ color: "#44444F", fontSize: 12 }}>›</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#00D2A8" }}>
                        {currentProductData.name}
                    </span>
                </>
            )}
        </div>
    );

    const FiltersModal = () => (
        <React.Fragment>
            {showFilters && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 200,
                        background: "rgba(10, 10, 15, 0.8)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        display: "flex",
                        alignItems: "flex-end",
                    }}
                    onClick={() => setShowFilters(false)}
                >
                    <div
                        style={{
                            background: "#111118",
                            borderRadius: "24px 24px 0 0",
                            width: "100%",
                            maxHeight: "85vh",
                            overflowY: "auto",
                            padding: "24px 20px",
                            boxSizing: "border-box",
                            borderTop: "1px solid #2A2A35",
                            animation: "slideUp 0.25s cubic-bezier(0.1, 0.76, 0.55, 0.94) forwards"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>
                                {t("shop_filters") || "Filters"}
                            </h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                style={{
                                    background: "#1E1E2A",
                                    border: "none",
                                    color: "#fff",
                                    fontSize: 16,
                                    cursor: "pointer",
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Category Selection Filter Section */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ color: "#8A8A9A", fontSize: 13, fontWeight: 600, marginBottom: 10, display: "block" }}>
                                {t("shop_category") || "Category"}
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <button
                                    onClick={() => {
                                        setTempCategoryId("all");
                                        setTempSubcategoryId("all");
                                        triggerHaptic("selection");
                                    }}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: 20,
                                        background: tempCategoryId === "all" ? "#5C6BFF" : "#1E1E2A",
                                        border: "none",
                                        color: "#fff",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: "pointer",
                                    }}
                                >
                                    {t("all_categories") || "All"}
                                </button>
                                {categoriesWithCount.map(cat => (
                                    <button
                                        key={`cat-${cat.id}`}
                                        onClick={() => {
                                            setTempCategoryId(String(cat.id));
                                            setTempSubcategoryId("all");
                                            triggerHaptic("selection");
                                        }}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: 20,
                                            background: String(tempCategoryId) === String(cat.id) ? "#5C6BFF" : "#1E1E2A",
                                            border: "none",
                                            color: "#fff",
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {cat.name} {cat.count > 0 ? `(${cat.count})` : ""}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subcategory Selection Filter Section */}
                        {tempCategoryId !== "all" && availableSubcategories.length > 0 && (
                            <div style={{ marginBottom: 24, animation: "slideUp 0.2s ease-out" }}>
                                <label style={{ color: "#8A8A9A", fontSize: 13, fontWeight: 600, marginBottom: 10, display: "block" }}>
                                    {t("shop_subcategory") || "Subcategory"}
                                </label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    <button
                                        onClick={() => {
                                            setTempSubcategoryId("all");
                                            triggerHaptic("selection");
                                        }}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: 20,
                                            background: tempSubcategoryId === "all" ? "#5C6BFF" : "#1E1E2A",
                                            border: "none",
                                            color: "#fff",
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {t("all_subcategories") || "All"}
                                    </button>
                                    {availableSubcategories.map(sub => (
                                        <button
                                            key={`sub-${sub.id}`}
                                            onClick={() => {
                                                setTempSubcategoryId(String(sub.id));
                                                triggerHaptic("selection");
                                            }}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: 20,
                                                background: String(tempSubcategoryId) === String(sub.id) ? "#5C6BFF" : "#1E1E2A",
                                                border: "none",
                                                color: "#fff",
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: "pointer",
                                                whiteSpace: "nowrap"
                                            }}
                                        >
                                            {sub.name} {sub.count > 0 ? `(${sub.count})` : "0"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shop Filter */}
                        {uniqueShops.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ color: "#8A8A9A", fontSize: 13, fontWeight: 600, marginBottom: 10, display: "block" }}>
                                    {t("shop_select_shop") || "Shop"}
                                </label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    <button
                                        onClick={() => {
                                            setTempShopId("all");
                                            triggerHaptic("selection");
                                        }}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: 20,
                                            background: tempShopId === "all" ? "#5C6BFF" : "#1E1E2A",
                                            border: "none",
                                            color: "#fff",
                                            fontSize: 13,
                                            fontWeight: 500,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {t("all_shops") || "All Shops"}
                                    </button>
                                    {uniqueShops.map(shop => shop && (
                                        <button
                                            key={`shop-filter-${shop.id}`}
                                            onClick={() => {
                                                setTempShopId(String(shop.id));
                                                triggerHaptic("selection");
                                            }}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: 20,
                                                background: String(tempShopId) === String(shop.id) ? "#5C6BFF" : "#1E1E2A",
                                                border: "none",
                                                color: "#fff",
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: "pointer",
                                            }}
                                        >
                                            {shop.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filter Actions UI */}
                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={resetFilters}
                                style={{
                                    flex: 1,
                                    padding: "16px",
                                    background: "#1E1E2A",
                                    border: "none",
                                    borderRadius: 14,
                                    color: "#FF4D6A",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                {t("shop_reset_filters") || "Reset"}
                            </button>
                            <button
                                onClick={applyFilters}
                                style={{
                                    flex: 1,
                                    padding: "16px",
                                    background: "#5C6BFF",
                                    border: "none",
                                    borderRadius: 14,
                                    color: "#fff",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                {t("shop_apply_filters") || "Apply"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );

    const Card = ({ children, style = {}, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => (
        <div
            onClick={onClick}
            style={{
                background: "rgba(17, 17, 24, 0.65)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid #1E1E2A",
                borderRadius: 20,
                overflow: "hidden",
                cursor: onClick ? "pointer" : "default",
                ...style,
            }}
        >
            {children}
        </div>
    );

    const RowButton = ({ icon, label, sub, onClick }: { icon?: string; label: string; sub: string; onClick?: () => void }) => (
        <button
            onClick={onClick}
            className="row-interactive-btn"
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px",
                background: "transparent",
                border: "none",
                textAlign: "left",
                color: "inherit",
                cursor: "pointer",
                transition: "background 0.2s ease"
            }}
        >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#1E1E2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {icon ?? "📍"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                <p style={{ fontSize: 12, color: "#8A8A9A", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>
            </div>
            <span style={{ color: "#44444F", fontSize: 14, paddingLeft: 4 }}>➔</span>
        </button>
    );

    const BackgroundGradient = () => (
        <div style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none", opacity: 0.2 }}>
            <div style={{ position: "absolute", top: "-10%", right: "-10%", width: "80vw", height: "80vw", borderRadius: "50%", background: "radial-gradient(circle, #5C6BFF 0%, transparent 70%)", filter: "blur(90px)" }} />
            <div style={{ position: "absolute", bottom: "10%", left: "-20%", width: "75vw", height: "75vw", borderRadius: "50%", background: "radial-gradient(circle, #00D2A8 0%, transparent 70%)", filter: "blur(90px)" }} />
        </div>
    );

    useEffect(() => {
        const id = "tg-shop-global-keyframes";
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.innerHTML = `
            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            .row-interactive-btn:active { background: rgba(30, 30, 42, 0.4) !important; }
        `;
        document.head.appendChild(style);
    }, []);

    if (loading && !cities.length) {
        return (
            <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "#0A0A0F" }}>
                <Spinner size="lg" />
            </div>
        );
    }

    // City Layer View
    if (currentView === "city") {
        return (
            <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto", minHeight: "100vh", boxSizing: "border-box" }}>
                <BackgroundGradient />
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#8A8A9A", textTransform: "uppercase", margin: "20px 0 10px 4px" }}>
                    {t("shop_select_location") || "Select City"}
                </p>
                <Card>
                    {cities.map((city, idx) => (
                        <React.Fragment key={`city-${city.id}`}>
                            {idx > 0 && <div style={{ height: 1, background: "#1E1E2A", margin: "0 16px" }} />}
                            <RowButton
                                icon="🌍"
                                label={city.name}
                                sub={city.country}
                                onClick={() => {
                                    triggerHaptic("impact", "medium");
                                    setSelectedCityId(city.id);
                                }}
                            />
                        </React.Fragment>
                    ))}
                </Card>
            </div>
        );
    }

    // District Layer View
    if (currentView === "district") {
        return (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
                <BackgroundGradient />
                <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#8A8A9A", textTransform: "uppercase", margin: "20px 0 10px 4px" }}>
                        {t("shop_select_district") || "Select District"}
                    </p>
                    <Card>
                        {(selectedCity?.districts ?? []).map((district, idx) => (
                            <React.Fragment key={`district-${district.id}`}>
                                {idx > 0 && <div style={{ height: 1, background: "#1E1E2A", margin: "0 16px" }} />}
                                <RowButton
                                    icon="🏘️"
                                    label={district.name}
                                    sub={selectedCity?.name ?? ""}
                                    onClick={() => {
                                        triggerHaptic("impact", "medium");
                                        setSelectedDistrictId(district.id);
                                    }}
                                />
                            </React.Fragment>
                        ))}
                    </Card>
                </div>
            </div>
        );
    }

    // Products Catalog Main View Mesh
    // Products Catalog Main View Mesh
    if (currentView === "products") {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh", // Fixed height viewport wrapper
                    overflow: "hidden" // Keeps sticky bars stable without double scrollbars
                }}
            >
                <BackgroundGradient />

                {/* Header Control Panel (Sticky Container) */}
                <div style={{ background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", flexShrink: 0 }}>
                    <br />
                    {/* Quick Filters Pill Action Tray */}
                    <div style={{ padding: "12px 16px", display: "flex", gap: 8, overflowX: "auto", borderBottom: "1px solid #1E1E2A" }}>
                        <button
                            onClick={openFilters}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 20,
                                background: activeFilterCount > 0 ? "#5C6BFF" : "#1E1E2A",
                                border: "none",
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            Filters
                            {activeFilterCount > 0 && (
                                <span style={{
                                    background: "#FF4D6A",
                                    color: "#fff",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {[
                            { value: "popular", label: "🔥 Popular" },
                            { value: "newest", label: "✨ Newest" },
                            { value: "price_asc", label: "💰 Lowest Price" },
                            { value: "price_desc", label: "💎 Highest Price" },
                        ].map(option => (
                            <button
                                key={`sort-pill-${option.value}`}
                                onClick={() => {
                                    setSortBy(option.value as SortOption);
                                    triggerHaptic("selection");
                                }}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 20,
                                    background: sortBy === option.value ? "#5C6BFF" : "#1E1E2A",
                                    border: "none",
                                    color: "#fff",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub Counter Metric Bar */}
                <div style={{ padding: "14px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box", flexShrink: 0 }}>
                    <p style={{ fontSize: 13, color: "#8A8A9A", margin: 0 }}>
                        {filteredProducts.length} {t("shop_products_found") || "products found"}
                    </p>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => {
                                setSelectedCategoryId("all");
                                setSelectedSubcategoryId("all");
                                setSelectedShopId("all");
                                setPriceRange({ min: 0, max: 10000 });
                                triggerHaptic("impact", "light");
                            }}
                            style={{
                                fontSize: 13,
                                color: "#FF4D6A",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: 500
                            }}
                        >
                            {t("shop_clear_all") || "Clear filters"}
                        </button>
                    )}
                </div>

                {/* Scrollable Container Zone */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch", // Smooth physics scrolling response on iOS/Telegram WebViews
                        width: "100%"
                    }}
                >
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200, height: "100%" }}>
                            <Spinner size="lg" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 20px", gap: 16, height: "100%", boxSizing: "border-box" }}>
                            <span style={{ fontSize: 48 }}>🛒</span>
                            <p style={{ color: "#8A8A9A", fontSize: 14, textAlign: "center" }}>{t("shop_no_products") || "No products match your filters."}</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "8px 16px 80px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
                            {filteredProducts.map((product) => {
                                return (
                                    <Card key={`product-card-${product.id}`} onClick={() => handleProductSelect(product.id)} style={{ display: "flex", flexDirection: "column" }}>
                                        <div style={{ position: "relative", width: "100%", paddingTop: "100%", overflow: "hidden", background: "#161622" }}>
                                            <img
                                                src={product.image || "https://placehold.co/300"}
                                                alt={product.name}
                                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                                            {product.subcategory && (
                                                <span style={{ fontSize: 10, fontWeight: 500, color: "#5C6BFF" }}>
                                                        {product.subcategory.name}
                                                    </span>
                                            )}
                                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: "#8A8A9A", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                                    {product.shop?.name ?? t("shop_unknown_shop")}
                                                </span>
                                            </div>
                                            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {product.name}
                                            </h3>

                                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: -2 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: "#EA8AFA" }}>
                                                    {parseFloat(String(product.measureQuantity || 0))}
                                                </span>
                                                <span style={{ fontSize: 11, fontWeight: 500, color: "#EA8AFA" }}>
                                                    {product.measureType}
                                                </span>
                                            </div>

                                            <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontSize: 15, fontWeight: 700, color: "#00D2A8" }}>
                                                    ${product.price}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                <FiltersModal />
            </div>
        );
    }

    // Deep Item Specifications View Layer
    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <BackgroundGradient />
            <br />
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
            </div>
            <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
                {currentProductData ? (
                    <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <img
                                src={currentProductData.image || "https://placehold.co/300"}
                                alt={currentProductData.name}
                                style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover", border: "1px solid #1E1E2A", background: "#161622" }}
                            />
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, wordBreak: "break-word" }}>{currentProductData.name}</h2>
                                <p style={{ fontSize: 13, color: "#8A8A9A", margin: "4px 0 0" }}>{currentProductData.shop?.name ?? t("shop_unknown_shop")}</p>
                            </div>
                        </div>

                        <div style={{ height: 1, background: "#1E1E2A" }} />
                        <p style={{ fontSize: 14, color: "#BAAABF", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{currentProductData.description}</p>
                        <div style={{ height: 1, background: "#1E1E2A" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#6A6A7A", textTransform: "uppercase", margin: "0 0 4px" }}>{t("shop_quantity")}</p>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>
                                    {parseFloat(String(currentProductData.measureQuantity || 0))} {currentProductData.measureType}
                                </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#6A6A7A", textTransform: "uppercase", margin: "0 0 4px" }}>{t("shop_price")}</p>
                                <p style={{ fontSize: 24, fontWeight: 800, color: "#00D2A8", margin: 0 }}>${currentProductData.price}</p>
                            </div>
                        </div>

                        {stashUrl ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
                                <div style={{ background: "rgba(0, 210, 168, 0.1)", border: "1px solid rgba(0, 210, 168, 0.3)", padding: 14, borderRadius: 14, textAlign: "center" }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "#00D2A8", margin: 0 }}>{t("shop_success") || "Purchase Complete!"}</p>
                                </div>
                                <button
                                    onClick={() => { triggerHaptic("impact", "light"); setStashUrl(null); setSelectedProductId(0); }}
                                    style={{ width: "100%", background: "#1E1E2A", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                                >
                                    {t("shop_back_catalog") || "Back to Catalog"}
                                </button>
                            </div>
                        ) : (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                                {buyError && <p style={{ fontSize: 13, color: "#FF4D6A", textAlign: "center", margin: 0, fontWeight: 500 }}>{buyError}</p>}
                                <button
                                    onClick={handleBuy}
                                    disabled={buying}
                                    style={{
                                        width: "100%",
                                        background: "#5C6BFF",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 14,
                                        padding: "16px 0",
                                        fontSize: 15,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {buying ? <Spinner size="sm" color="white" /> : t("shop_buy")}
                                </button>
                            </div>
                        )}
                    </Card>
                ) : (
                    <p style={{ textAlign: "center", fontSize: 14, color: "#8A8A9A" }}>{t("shop_product_not_found")}</p>
                )}
            </div>
        </div>
    );
};

export default RenderShop;