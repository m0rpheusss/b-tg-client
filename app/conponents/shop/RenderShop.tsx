"use client";

import React, { useState, useEffect } from "react";
import {
    Avatar,
    Card,
    Description,
    Label,
    ListBox,
    Separator,
    Spinner,
    Surface,
    Button
} from "@heroui/react";
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-label the "All" category when lang changes
    useEffect(() => {
        setCategories((prev) => {
            if (prev.length === 0) return prev;
            const [, ...rest] = prev;
            return [{ id: "all", name: t("tab_shop") }, ...rest];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    const handleProductSelect = async (productId: number) => {
        triggerHaptic('selection');
        setSelectedProduct(productId);
        try {
            await fetch(`${API_BASE}/products/${productId}/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            console.error(error);
        }
    };

    const productsToRender =
        selectedCategory === "all"
            ? products
            : products.filter((p) => String(p.category_id).trim() === String(selectedCategory).trim());

    const currentProductData = products.find((p) => p.id === selectedProduct);

    if (loading) {
        return (
            <div className="fixed inset-0 flex justify-center items-center bg-[#0b0f19]">
                <Spinner size="lg" />
            </div>
        );
    }

    /* ---- LOCATION SELECT ---- */
    if (selectedCity === "") {
        return (
            <div className="h-[25vh] w-full flex justify-center items-center">
                <div className="w-[95%]">
                    <br /><br /><br />
                    <b className="text-xs block mx-1 mb-2">{t("shop_select_location")}</b>

                    <Surface className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/30">
                        <ListBox
                            aria-label="Locations"
                            className="w-full p-2"
                            onAction={(key) => {
                                if (key === "1") {
                                    triggerHaptic('impact', 'medium');
                                    setSelectedCity("ost");
                                }
                            }}
                        >
                            <ListBox.Item id="1">
                                <Avatar size="sm">
                                    <Avatar.Image src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg" />
                                    <Avatar.Fallback>O</Avatar.Fallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <Label>Ostrava-Poruba</Label>
                                    <Description>Czech Republic</Description>
                                </div>
                                <ListBox.ItemIndicator />
                            </ListBox.Item>

                            <ListBox.Item id="2" isDisabled>
                                <Avatar size="sm">
                                    <Avatar.Image src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg" />
                                    <Avatar.Fallback>O</Avatar.Fallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <Label>
                                        Ostrava-Karolina
                                        <span style={{ fontSize: '0.75em', color: 'orangered', marginLeft: '0.5em' }}>
                                            {t("shop_out_of_stock")}
                                        </span>
                                    </Label>
                                    <Description>Czech Republic</Description>
                                </div>
                                <ListBox.ItemIndicator />
                            </ListBox.Item>

                            <ListBox.Item isDisabled id="3">
                                <Avatar size="sm">
                                    <Avatar.Image src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg" />
                                    <Avatar.Fallback>O</Avatar.Fallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <Label>
                                        Ostrava-Zabřeh
                                        <span style={{ fontSize: '0.75em', color: 'orangered', marginLeft: '0.5em' }}>
                                            {t("shop_out_of_stock")}
                                        </span>
                                    </Label>
                                    <Description>Czech Republic</Description>
                                </div>
                                <ListBox.ItemIndicator />
                            </ListBox.Item>

                            <ListBox.Item isDisabled id="4">
                                <Avatar size="sm">
                                    <Avatar.Image src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg" />
                                    <Avatar.Fallback>O</Avatar.Fallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <Label>
                                        Brno-Komarov
                                        <span style={{ fontSize: '0.75em', color: 'orange', marginLeft: '0.5em' }}>
                                            {t("shop_coming_soon")}
                                        </span>
                                    </Label>
                                    <Description>Czech Republic</Description>
                                </div>
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                        </ListBox>
                    </Surface>
                </div>
            </div>
        );
    }

    /* ---- PRODUCT GRID ---- */
    if (selectedProduct === 0) {
        return (
            <div className="w-full overflow-y-auto h-[calc(100vh-120px)]">
                {/* CATEGORY BAR */}
                <div className="sticky top-0 z-10 bg-[#0b0f19]/80 backdrop-blur-md border-b border-zinc-800">
                    <div className="flex gap-2 overflow-x-auto px-4 py-3 hide-scrollbar">
                        {categories.map((cat) => {
                            const isSelected = String(selectedCategory) === String(cat.id);
                            return (
                                <Button
                                    key={cat.id}
                                    size="sm"
                                    radius="lg"
                                    variant={isSelected ? "solid" : "flat"}
                                    color={isSelected ? "primary" : "default"}
                                    onClick={() => {
                                        triggerHaptic('selection');
                                        setSelectedCategory(cat.id);
                                    }}
                                    className={`text-xs font-semibold whitespace-nowrap ${isSelected ? "shadow-md scale-[1.02]" : "opacity-60 bg-zinc-900/40"}`}
                                >
                                    {cat.name}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {productsToRender.length === 0 ? (
                    <div className="flex justify-center items-center h-48 text-zinc-400 text-sm">
                        {t("shop_empty_category")}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 w-[95%] mx-auto pb-28 mt-3">
                        {productsToRender.map((product) => (
                            <Card
                                key={product.id}
                                onClick={() => handleProductSelect(product.id)}
                                className="cursor-pointer overflow-hidden bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 rounded-2xl transition-all"
                            >
                                <div className="relative">
                                    <img src={product.image || "https://placehold.co/150"} className="aspect-square w-full object-cover" alt={product.name} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                </div>
                                <div className="p-3 flex flex-col gap-1">
                                    <span className="text-[10px] text-zinc-500">{product.shop?.name ?? t("shop_unknown_shop")}</span>
                                    <h3 className="text-sm font-bold truncate text-white">{product.name}</h3>
                                    <p className="text-[11px] text-zinc-400">{product.measure_quantity} {product.measure_type}</p>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-emerald-400 font-bold text-sm">{product.price} $</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    /* ---- PRODUCT DETAIL ---- */
    return (
        <div className="w-[95%] mx-auto p-4 flex flex-col gap-4">
            <Button
                size="sm"
                variant="flat"
                onClick={() => {
                    triggerHaptic('impact', 'light');
                    setSelectedProduct(0);
                }}
                className="self-start bg-zinc-900/40 border border-zinc-800"
            >
                {t("shop_back")}
            </Button>

            {currentProductData ? (
                <Card className="w-full p-4 gap-4 bg-zinc-900/30 border border-zinc-800 rounded-3xl shadow-xl">
                    <div className="flex gap-4 items-center">
                        <img
                            src={currentProductData.image || "https://placehold.co/150"}
                            className="w-24 aspect-square rounded-2xl object-cover border border-zinc-800"
                            alt={currentProductData.name}
                        />
                        <div>
                            <h2 className="text-lg font-bold text-white">{currentProductData.name}</h2>
                            <p className="text-xs text-zinc-500">{currentProductData.shop?.name ?? t("shop_unknown_shop")}</p>
                        </div>
                    </div>

                    <Separator className="bg-zinc-800" />
                    <p className="text-sm text-zinc-300">{currentProductData.description}</p>
                    <Separator className="bg-zinc-800" />

                    <div className="flex justify-between">
                        <div>
                            <p className="text-[10px] text-zinc-500">{t("shop_quantity")}</p>
                            <p className="text-sm font-bold text-white">{currentProductData.measure_quantity}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-500">{t("shop_price")}</p>
                            <p className="text-xl font-bold text-emerald-400">{currentProductData.price} $</p>
                        </div>
                    </div>

                    {stashUrl ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-emerald-400 font-semibold text-center">{t("shop_success")}</p>
                            <Button
                                variant="flat"
                                className="w-full rounded-2xl"
                                onClick={() => {
                                    triggerHaptic('impact', 'light');
                                    setStashUrl(null);
                                    setSelectedProduct(0);
                                }}
                            >
                                {t("shop_back_catalog")}
                            </Button>
                        </div>
                    ) : (
                        <>
                            {buyError && <p className="text-xs text-red-400 text-center">{buyError}</p>}
                            <Button color="primary" isLoading={buying} onClick={handleBuy} className="w-full rounded-2xl font-semibold">
                                {t("shop_buy")}
                            </Button>
                        </>
                    )}
                </Card>
            ) : (
                <p className="text-center text-sm text-zinc-400">{t("shop_product_not_found")}</p>
            )}
        </div>
    );
};

export default RenderShop;