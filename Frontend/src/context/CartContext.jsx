import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  function addToCart(item) {
    setCartItems(prev => {
      const existing = prev.find(i => i._id === item._id);
      return existing
        ? prev.map(i =>
            i._id === item._id ? { ...i, qty: i.qty + 1 } : i
          )
        : [...prev, { ...item, qty: 1 }];
    });
  }

  function removeFromCart(id) {
    setCartItems(prev => prev.filter(i => i._id !== id));
  }

  function clearCart() {
    setCartItems([]);
  }

  const cartTotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
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

export const useCart = () => useContext(CartContext);
