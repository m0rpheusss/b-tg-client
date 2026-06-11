"use client";

import React, { useEffect, useState } from "react";
import { Button, Spinner, Alert } from "@heroui/react";

const API_BASE = "https://bohemia-api-1.yxwfjh.easypanel.host/";

interface Order {
    id: number;
    product_id: number;
    stash_id: number;
    amount_paid: number;
    created_at: string;
}

export default function OrdersSheet({ onClose }: { onClose: () => void }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [stashUrls, setStashUrls] = useState<Record<number, string>>({});
    const [stashLoading, setStashLoading] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        const token = tg?.initData || "/*no-auth*/";

        fetch(`${API_BASE}/orders`, {
            headers: {
                Authorization: `Bearer ${token}`,
                // "ngrok-skip-browser-warning": "any-value",
            },
        })
            .then((r) => {
                if (!r.ok) throw new Error("Network response was not ok");
                return r.json();
            })
            .then((data) => {
                // Check if the data itself is the array, or if it's wrapped in an object property (like data.orders)
                if (Array.isArray(data)) {
                    setOrders(data);
                } else if (data && Array.isArray(data.orders)) {
                    setOrders(data.orders); // Adjust 'orders' to whatever key your API uses
                } else {
                    console.error("API did not return an array:", data);
                    setOrders([]); // Fallback to safe empty array
                }
            })
            .catch((err) => {
                console.error(err);
                setOrders([]); // Fallback on error
            })
            .finally(() => setLoading(false));
    }, []);

    const handleExpand = async (order: Order) => {
        if (expandedId === order.id) {
            setExpandedId(null);
            return;
        }

        setExpandedId(order.id);

        // Fetch stash src_url if not yet loaded
        if (!stashUrls[order.id]) {
            setStashLoading((p) => ({ ...p, [order.id]: true }));

            try {
                const tg = window.Telegram?.WebApp;
                const token = tg?.initData || "/*no-auth*/";

                const res = await fetch(`${API_BASE}/orders/${order.id}/stash`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        // "ngrok-skip-browser-warning": "any-value",
                    },
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

    return (
        <div
            className="fixed inset-0 bg-[#0b0f19] z-50 flex flex-col p-6 overflow-y-auto"
            style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + 3rem)" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <h2 className="text-xl font-bold">🛍️ My Orders</h2>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="border border-zinc-700 bg-zinc-900/50 rounded-xl"
                >
                    Back
                </Button>
            </div>

            <div className="max-w-md mx-auto w-full space-y-3">
                {loading ? (
                    <div className="flex justify-center pt-12">
                        <Spinner size="lg" />
                    </div>
                ) : orders.length === 0 ? (
                    <Alert variant="flat" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <Alert.Indicator />
                        <Alert.Content>
                            <Alert.Title className="text-xs font-semibold text-zinc-300">
                                You haven't placed any orders yet.
                            </Alert.Title>
                        </Alert.Content>
                    </Alert>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden"
                        >
                            {/* Order row */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer"
                                onClick={() => handleExpand(order)}
                            >
                                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-white">
                    Order #{order.id}
                  </span>
                                    <span className="text-[10px] text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-sm">
                    ${order.amount_paid}
                  </span>
                                    <span
                                        className={`text-zinc-400 text-xs transition-transform duration-200 ${
                                            expandedId === order.id ? "rotate-180" : ""
                                        }`}
                                    >
                    ▾
                  </span>
                                </div>
                            </div>

                            {/* Expanded stash reveal */}
                            {expandedId === order.id && (
                                <div className="border-t border-zinc-800 p-4">
                                    {stashLoading[order.id] ? (
                                        <div className="flex justify-center py-4">
                                            <Spinner size="sm" />
                                        </div>
                                    ) : stashUrls[order.id] ? (
                                        <div className="flex flex-col gap-3">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                                                Stash location
                                            </p>
                                            <img
                                                src={stashUrls[order.id]}
                                                className="w-full rounded-xl border border-zinc-700 object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-500 text-center">
                                            Could not load stash image.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}