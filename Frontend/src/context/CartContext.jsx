import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Add item to cart with optional quantity (default 1)
  function addToCart(item, quantity = 1) {
    setCartItems(prev => {
      const existing = prev.find(i => i._id === item._id);
      return existing
        ? prev.map(i =>
            i._id === item._id ? { ...i, qty: i.qty + quantity } : i
          )
        : [...prev, { ...item, qty: quantity }];
    });
  }

  // Remove item from cart by id
  function removeFromCart(id) {
    setCartItems(prev => prev.filter(i => i._id !== id));
  }

  // Clear all items from cart
  function clearCart() {
    setCartItems([]);
  }

  // Calculate total price of cart items (price * qty)
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, clearCart, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context easily
export const useCart = () => useContext(CartContext);
