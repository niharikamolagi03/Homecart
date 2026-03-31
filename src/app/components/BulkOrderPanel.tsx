import React, { useState } from "react";
import axios from "axios";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface Vendor {
  id: number;
  name: string;
  products: Product[];
}

interface BulkOrderPanelProps {
  vendorData: Vendor[];
  onClose: () => void;
}

const BulkOrderPanel: React.FC<BulkOrderPanelProps> = ({ vendorData, onClose }) => {
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [message, setMessage] = useState("");

  const updateQty = (productId: number, delta: number) => {
    setCart((c) => {
      const next = { ...c };
      next[productId] = Math.max(0, (next[productId] || 0) + delta);
      if (next[productId] === 0) delete next[productId];
      return next;
    });
  };

  const submitBulk = async () => {
    const items = Object.entries(cart).map(([product_id, quantity]) => ({
      product_id: Number(product_id),
      quantity,
    }));
    if (!items.length) {
      setMessage("Please select at least one item.");
      return;
    }

    try {
      const res = await axios.post("/api/orders/bulk-create/", { items });
      setMessage(`Bulk order created: ${res.data.order_id}`);
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Unable to place bulk order");
    }
  };

  const total = vendorData.reduce((sum, vendor) =>
    sum + vendor.products.reduce((vSum, p) => vSum + (cart[p.id] || 0) * p.price, 0), 0
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1000 }}>
      <div style={{ margin: "5% auto", width: "90%", maxWidth: "800px", background: "white", padding: "20px", borderRadius: "8px" }}>
        <h2>Bulk Vendor Catalog</h2>
        <button onClick={onClose} style={{ float: "right" }}>Close</button>
        <div style={{ clear: "both" }}>
          {vendorData.map((vendor) => (
            <section key={vendor.id} style={{ marginBottom: "20px" }}>
              <h3>{vendor.name}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Product</th>
                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Price</th>
                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Stock</th>
                    <th style={{ border: "1px solid #ddd", padding: "8px" }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>{p.name}</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>₹{p.price.toFixed(2)}</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>{p.stock}</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                        <button onClick={() => updateQty(p.id, -1)}>-</button>
                        {cart[p.id] || 0}
                        <button
                          onClick={() => updateQty(p.id, 1)}
                          disabled={(cart[p.id] || 0) >= p.stock}
                        >+</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <div style={{ marginTop: "20px" }}>
          <strong>Total: ₹{total.toFixed(2)}</strong>
        </div>
        <button onClick={submitBulk} style={{ marginTop: "10px" }}>Submit Bulk Order</button>
        {message && <p style={{ color: message.includes("created") ? "green" : "red" }}>{message}</p>}
      </div>
    </div>
  );
};

export default BulkOrderPanel;