import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishIds, setWishIds] = useState([]);

  const refreshCart = useCallback(async () => {
    try { const { data } = await api.get('/cart'); setCartCount(data.count); } catch { setCartCount(0); }
  }, []);

  const refreshWish = useCallback(async () => {
    try { const { data } = await api.get('/wishlist'); setWishIds(data.ids); } catch { setWishIds([]); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api.get('/auth/me').then((r) => setUser(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);

  useEffect(() => { user?.role === 'customer' ? refreshCart() : setCartCount(0); }, [user, refreshCart]);
  useEffect(() => { user?.role === 'customer' ? refreshWish() : setWishIds([]); }, [user, refreshWish]);

  const saveSession = ({ token, user }) => { localStorage.setItem('token', token); setUser(user); return user; };
  const login = async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data);
  const register = async (form) => saveSession((await api.post('/auth/register', form)).data);
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <Ctx.Provider value={{ user, setUser, ready, login, register, logout, cartCount, refreshCart, wishIds, setWishIds, refreshWish }}>{children}</Ctx.Provider>;
}
