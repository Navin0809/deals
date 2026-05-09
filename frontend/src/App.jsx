import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Ban,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Copy,
  Gauge,
  HeartPulse,
  Home,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  Lock,
  Map,
  MapPin,
  Navigation,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Ticket,
  Trash2,
  UserRound
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from 'react-query';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, fetchDeals, normalizeImage } from './api';
import { useUiStore } from './store';

const fallbackImages = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'
];

function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,#f4d8c2_0,transparent_28%),radial-gradient(circle_at_92%_8%,#d63a28_0,transparent_18%),#fbf6ec] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <TopBar />
        <main className="flex-1 px-4 pb-28 pt-3 md:px-8 md:pb-10">
          <AnimatedRoutes />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Discover />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/owner" element={<OwnerStudio />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function TopBar() {
  const { data } = useQuery('me', async () => (await api.get('/me')).data);
  const user = data?.user;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation(() => api.post('/auth/logout'), {
    onSuccess: () => {
      queryClient.invalidateQueries('me');
      queryClient.removeQueries('ownerDeals');
      queryClient.removeQueries('adminAnalytics');
      queryClient.removeQueries('adminOwners');
      queryClient.removeQueries('adminDeals');
      navigate('/');
    }
  });
  return (
    <header className="sticky top-0 z-30 border-b border-[#eadfce]/80 bg-[#fbf6ec]/76 px-4 py-3 backdrop-blur-2xl md:px-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-[1.35rem] bg-[#fffaf1] shadow-lift ring-1 ring-[#eadfce]">
            <img src="/logo.jpeg" alt="Deals logo" className="h-full w-full object-cover" />
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight">Deals</span>
            <span className="block text-xs font-medium text-slate-500">Hyperlocal coupons</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to={user ? (user.role === 'admin' ? '/admin' : '/owner') : '/auth'} className="glass-button">
            {user ? <UserRound size={18} /> : <Lock size={18} />}
            <span className="hidden sm:inline">{user?.name || 'Sign in'}</span>
          </Link>
          {user ? (
            <button onClick={() => logout.mutate()} className="icon-button" aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Discover() {
  const queryClient = useQueryClient();
  const { filters, location, locationStatus, setFilter, setLocation, setLocationStatus } = useUiStore();
  const { data: categoriesData } = useQuery('categories', async () => (await api.get('/categories')).data);
  const { data: areasData } = useQuery('areas', async () => (await api.get('/locations/areas')).data);
  const filtersWithLocation = useMemo(
    () => ({
      ...filters,
      lat: location?.latitude,
      lng: location?.longitude,
      best: filters.best ? 'true' : undefined
    }),
    [filters, location]
  );
  const dealsQuery = useInfiniteQuery(['deals', filtersWithLocation], fetchDeals, {
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined)
  });
  const deals = dealsQuery.data?.pages.flatMap((page) => page.deals) || [];

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setFilter('sort', 'nearby');
        queryClient.invalidateQueries('deals');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <section className="space-y-5">
      <div className="liquid-panel overflow-hidden p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Live nearby</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight md:text-6xl">Find offers around you.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              All active ads are shown by default. Select a Hyderabad area or use GPS to sort nearby offers.
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={requestLocation} className="primary-icon" title="Use current location">
            <LocateFixed />
          </motion.button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric label="GPS" value={locationStatus === 'granted' ? 'On' : locationStatus === 'loading' ? '...' : locationStatus === 'denied' ? 'Blocked' : 'Ask'} />
          <Metric label="Area" value={filters.area || 'All'} />
          <Metric label="Deals" value={deals.length || '--'} />
        </div>
        {locationStatus === 'denied' ? <p className="mt-3 text-sm font-semibold text-[#b91f12]">Location permission is blocked. You can still search by Hyderabad area.</p> : null}
        {locationStatus === 'unsupported' ? <p className="mt-3 text-sm font-semibold text-[#b91f12]">This browser does not support GPS location.</p> : null}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <FilterPill active={!filters.categoryId} onClick={() => setFilter('categoryId', '')}>All</FilterPill>
        {categoriesData?.categories?.map((category) => (
          <FilterPill key={category.id} active={String(filters.categoryId) === String(category.id)} onClick={() => setFilter('categoryId', category.id)}>
            {category.name}
          </FilterPill>
        ))}
      </div>

      <div className="liquid-panel grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
        <Select label="Hyderabad area" value={filters.area} onChange={(value) => setFilter('area', value)} options={[['', 'All areas'], ...(areasData?.areas || []).filter((area) => area.name !== 'All Hyderabad').map((area) => [area.name, area.name])]} />
        <Select label="Sort" value={filters.sort} onChange={(value) => setFilter('sort', value)} options={[['latest', 'Latest'], ['popular', 'Popularity'], ['expiring', 'Expiring'], ['nearby', 'Nearby']]} />
        <button onClick={() => setFilter('best', !filters.best)} className={`filter-toggle ${filters.best ? 'is-on' : ''}`}>
          <Sparkles size={17} /> Best offers
        </button>
        <Link to="/map" className="filter-toggle"><Map size={17} /> Map</Link>
      </div>

      {dealsQuery.isLoading ? <SkeletonGrid /> : deals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deals.map((deal, index) => <DealCard key={deal.id} deal={deal} index={index} />)}
        </div>
      ) : <EmptyState title="No deals found" text="Try all areas or another category." />}

      {dealsQuery.hasNextPage && (
        <button onClick={() => dealsQuery.fetchNextPage()} className="wide-button">
          Load more offers
        </button>
      )}
    </section>
  );
}

function DealCard({ deal, index }) {
  const image = normalizeImage(deal.image_url) || fallbackImages[index % fallbackImages.length];
  const mapsUrl = deal.google_maps_url || `https://www.google.com/maps?q=${deal.latitude},${deal.longitude}`;
  const redeem = useMutation(() => api.post(`/deals/${deal.id}/redeem`));
  return (
    <motion.article layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="deal-card">
      <div className="relative aspect-[1.35] overflow-hidden rounded-[1.35rem]">
        <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-x-3 top-3 flex justify-between">
          <span className="chip">{deal.category_name}</span>
          {deal.is_best ? <span className="chip-dark"><Sparkles size={14} /> Best</span> : null}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black leading-tight">{deal.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{deal.description}</p>
          </div>
          <span className="rounded-2xl bg-[#f4e7d2] px-3 py-2 text-sm font-black text-[#b91f12]">{deal.discount_label || priceLabel(deal)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={16} /> {deal.shop_name} · {deal.distance_miles ? `${Number(deal.distance_miles).toFixed(1)} mi` : deal.area || deal.city}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button onClick={() => navigator.clipboard?.writeText(deal.coupon_code)} className="coupon-button">
            <Copy size={16} /> {deal.coupon_code}
          </button>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="icon-button" aria-label="Navigate">
            <Navigation size={18} />
          </a>
        </div>
        <button onClick={() => redeem.mutate()} className="wide-button small">
          Mark as redeemed
        </button>
      </div>
    </motion.article>
  );
}

function MapView() {
  const { filters, location } = useUiStore();
  const { data } = useInfiniteQuery(['deals', { ...filters, lat: location?.latitude, lng: location?.longitude }], fetchDeals, {
    getNextPageParam: () => undefined
  });
  const deals = data?.pages.flatMap((page) => page.deals) || [];
  const [selectedId, setSelectedId] = useState(null);
  const selected = deals.find((deal) => deal.id === selectedId) || deals[0];
  const mapSrc = selected
    ? `https://www.google.com/maps?q=${selected.latitude},${selected.longitude}&z=15&output=embed`
    : 'https://www.google.com/maps?q=Hyderabad&z=12&output=embed';
  return (
    <section className="space-y-4">
      <div className="liquid-panel overflow-hidden p-3">
        <iframe title="Nearby deals map" src={mapSrc} loading="lazy" className="h-[58vh] w-full rounded-[1.35rem] border-0" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {deals.slice(0, 6).map((deal) => (
          <button key={deal.id} onClick={() => setSelectedId(deal.id)} className="mini-row text-left">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#be2316] text-white"><MapPin size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{deal.title}</span>
              <span className="block truncate text-sm text-slate-500">{deal.shop_name} · {deal.area || deal.city}</span>
            </span>
            <a href={deal.google_maps_url || `https://www.google.com/maps?q=${deal.latitude},${deal.longitude}`} target="_blank" rel="noreferrer" className="icon-button" aria-label="Open navigation" onClick={(event) => event.stopPropagation()}>
              <Navigation size={17} />
            </a>
          </button>
        ))}
      </div>
    </section>
  );
}

function OwnerStudio() {
  const { data: me } = useQuery('me', async () => (await api.get('/me')).data);
  const { data: categories } = useQuery('categories', async () => (await api.get('/categories')).data);
  const { data: areasData } = useQuery('areas', async () => (await api.get('/locations/areas')).data);
  const ownerDeals = useQuery('ownerDeals', async () => (await api.get('/owner/deals')).data, { enabled: me?.user?.role === 'shop_owner' });
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultDealForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [shopForm, setShopForm] = useState(null);
  const areaOptions = [['', 'Select area'], ...(areasData?.areas || []).filter((area) => area.name !== 'All Hyderabad').map((area) => [area.name, area.name])];
  const shop = ownerDeals.data?.shop;

  useEffect(() => {
    if (!shop) return;
    setShopForm({
      shopName: shop.shop_name || '',
      ownerPhone: shop.owner_phone || '',
      address: shop.address || '',
      area: shop.area || '',
      googleMapsUrl: shop.google_maps_url || '',
      timings: shop.timings || ''
    });
  }, [shop?.shop_name, shop?.owner_phone, shop?.address, shop?.area, shop?.google_maps_url, shop?.timings]);

  const resetDealForm = () => {
    setForm(defaultDealForm());
    setEditingId(null);
    setShowForm(false);
  };

  const saveDeal = useMutation(
    (payload) => editingId ? api.put(`/owner/deals/${editingId}`, payload) : api.post('/owner/deals', payload),
    {
      onSuccess: () => {
        resetDealForm();
        queryClient.invalidateQueries('ownerDeals');
        queryClient.invalidateQueries('deals');
      }
    }
  );
  const deleteDeal = useMutation((id) => api.delete(`/owner/deals/${id}`), {
    onSuccess: () => {
      queryClient.invalidateQueries('ownerDeals');
      queryClient.invalidateQueries('deals');
    }
  });
  const saveShop = useMutation((payload) => api.patch('/owner/shop', payload), {
    onSuccess: () => {
      queryClient.invalidateQueries('ownerDeals');
      queryClient.invalidateQueries('deals');
    }
  });

  const editDeal = (deal) => {
    setEditingId(deal.id);
    setForm({
      title: deal.title || '',
      description: deal.description || '',
      couponCode: deal.coupon_code || '',
      categoryId: deal.category_id || '',
      discountLabel: deal.discount_label || '',
      regularPrice: deal.regular_price || '',
      dealPrice: deal.deal_price || '',
      isBest: Boolean(deal.is_best),
      googleMapsUrl: deal.google_maps_url || '',
      imageUrl: deal.image_url || ''
    });
    setShowForm(true);
  };

  if (!me?.user) return <Auth compact />;
  if (me.user.role !== 'shop_owner') return <EmptyState title="Shop owner access" text="Create a shop owner account to post free monthly deals." />;
  if (me.user.status !== 'active') return <PendingApproval />;
  const dealErrors = saveDeal.error?.response?.data?.errors || {};
  const shopErrors = saveShop.error?.response?.data?.errors || {};

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        <div className="liquid-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Owner studio</p>
              <h1 className="mt-1 text-3xl font-black">Your ads</h1>
              <p className="mt-2 text-sm text-slate-500">{ownerDeals.data?.postedThisMonth || 0}/{ownerDeals.data?.monthlyLimit || 3} free posts used this month</p>
            </div>
            <button onClick={() => { setEditingId(null); setForm(defaultDealForm()); setShowForm(!showForm); }} className="primary-icon" title="Post an ad">
              <Plus />
            </button>
          </div>
          <button onClick={() => { setEditingId(null); setForm(defaultDealForm()); setShowForm(true); }} className="wide-button mt-5">
            <Plus size={18} /> Post an ad
          </button>
        </div>

        {shopForm ? (
          <div className="liquid-panel p-5">
            <p className="eyebrow">Shop location</p>
            <h2 className="mt-1 text-2xl font-black">Where customers visit</h2>
            <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); saveShop.mutate(shopForm); }}>
              <Input label="Shop name" value={shopForm.shopName} error={shopErrors.shopName} onChange={(shopName) => setShopForm({ ...shopForm, shopName })} />
              <Input label="Phone" value={shopForm.ownerPhone} error={shopErrors.ownerPhone} onChange={(ownerPhone) => setShopForm({ ...shopForm, ownerPhone })} />
              <Input label="Address" value={shopForm.address} error={shopErrors.address} onChange={(address) => setShopForm({ ...shopForm, address })} />
              <Select label="Hyderabad area" value={shopForm.area} error={shopErrors.area} onChange={(area) => setShopForm({ ...shopForm, area })} options={areaOptions} />
              <Input label="Google Maps URL" value={shopForm.googleMapsUrl} error={shopErrors.googleMapsUrl} onChange={(googleMapsUrl) => setShopForm({ ...shopForm, googleMapsUrl })} />
              <Input label="Shop timings" value={shopForm.timings} error={shopErrors.timings} onChange={(timings) => setShopForm({ ...shopForm, timings })} />
              {saveShop.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{saveShop.error.response?.data?.message || 'Could not save shop location.'}</p> : null}
              <button className="wide-button" disabled={saveShop.isLoading}>Save shop location</button>
            </form>
          </div>
        ) : null}

        {showForm ? (
          <div className="liquid-panel p-5">
            <p className="eyebrow">{editingId ? 'Edit ad' : 'New ad'}</p>
            <h2 className="mt-1 text-2xl font-black">{editingId ? 'Update offer' : 'Post an ad'}</h2>
            <form className="mt-5 grid gap-3" onSubmit={(event) => { event.preventDefault(); saveDeal.mutate(form); }}>
              <Input label="Deal title" value={form.title} error={dealErrors.title} onChange={(title) => setForm({ ...form, title })} />
              <Textarea label="Description" value={form.description} error={dealErrors.description} onChange={(description) => setForm({ ...form, description })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Coupon code" value={form.couponCode} error={dealErrors.couponCode} onChange={(couponCode) => setForm({ ...form, couponCode })} />
                <Input label="Discount" value={form.discountLabel} error={dealErrors.discountLabel} onChange={(discountLabel) => setForm({ ...form, discountLabel })} />
              </div>
              <Select label="Category" value={form.categoryId} error={dealErrors.categoryId} onChange={(categoryId) => setForm({ ...form, categoryId })} options={[['', 'Select category'], ...(categories?.categories || []).map((c) => [c.id, c.name])]} />
              <Input label="Google Maps URL" value={form.googleMapsUrl} error={dealErrors.googleMapsUrl} onChange={(googleMapsUrl) => setForm({ ...form, googleMapsUrl })} />
              <Input label="Product image URL" value={form.imageUrl} error={dealErrors.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
              {saveDeal.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{saveDeal.error.response?.data?.message || 'Could not save ad.'}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <button className="wide-button" disabled={saveDeal.isLoading}>{editingId ? 'Update ad' : 'Publish ad'}</button>
                <button type="button" onClick={resetDealForm} className="filter-toggle">Cancel</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black">All posted ads</h2>
          <span className="chip">{ownerDeals.data?.deals?.length || 0}</span>
        </div>
        {(ownerDeals.data?.deals || []).map((deal) => (
          <div key={deal.id} className="mini-row">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4e7d2] text-[#b91f12]"><ShoppingBag size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{deal.title}</span>
              <span className="text-sm text-slate-500">{deal.status} · {deal.category_name} · {deal.coupon_code}</span>
            </span>
            <div className="flex gap-2">
              <button className="icon-button" onClick={() => editDeal(deal)} title="Edit ad"><Settings2 size={17} /></button>
              <button className="icon-button" onClick={() => deleteDeal.mutate(deal.id)} title="Delete ad"><Trash2 size={17} /></button>
            </div>
          </div>
        ))}
        {!ownerDeals.isLoading && !ownerDeals.data?.deals?.length ? <EmptyState title="No ads posted" text="Tap Post an ad to publish your first offer." /> : null}
      </div>
    </section>
  );
}
function PendingApproval() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation(() => api.post('/auth/logout'), {
    onSuccess: () => {
      queryClient.invalidateQueries('me');
      navigate('/auth');
    }
  });

  return (
    <div className="liquid-panel grid min-h-64 place-items-center p-8 text-center">
      <div>
        <Store className="mx-auto mb-3" />
        <h2 className="text-2xl font-black">Approval pending</h2>
        <p className="mt-2 text-sm text-slate-500">Admin approval is required before your offers go live.</p>
        <button onClick={() => logout.mutate()} className="wide-button mt-5">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </div>
  );
}

function AdminPanel() {
  const { data: me } = useQuery('me', async () => (await api.get('/me')).data);
  const queryClient = useQueryClient();
  const analytics = useQuery('adminAnalytics', async () => (await api.get('/admin/analytics')).data, { enabled: me?.user?.role === 'admin' });
  const owners = useQuery('adminOwners', async () => (await api.get('/admin/shop-owners')).data, { enabled: me?.user?.role === 'admin' });
  const deals = useQuery('adminDeals', async () => (await api.get('/admin/deals')).data, { enabled: me?.user?.role === 'admin' });
  const statusMutation = useMutation(({ id, status }) => api.patch(`/admin/shop-owners/${id}/status`, { status }), {
    onSuccess: () => queryClient.invalidateQueries('adminOwners')
  });
  const dealMutation = useMutation(({ id, status }) => api.patch(`/admin/deals/${id}/status`, { status }), {
    onSuccess: () => queryClient.invalidateQueries('adminDeals')
  });

  if (me && me.user?.role !== 'admin') return <EmptyState title="Admin only" text="Sign in with an admin account to manage the platform." />;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetric icon={UserRound} label="Users" value={sumTotals(analytics.data?.users)} />
        <AdminMetric icon={Store} label="Owners" value={analytics.data?.users?.filter((u) => u.role === 'shop_owner').reduce((a, b) => a + b.total, 0) || 0} />
        <AdminMetric icon={Ticket} label="Deals" value={sumTotals(analytics.data?.dealStats)} />
        <AdminMetric icon={Gauge} label="Redeems" value={analytics.data?.redemptions || 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminList title="Shop owner approvals" icon={ShieldCheck}>
          {(owners.data?.shopOwners || []).map((owner) => (
            <div key={owner.id} className="admin-row">
              <div className="min-w-0">
                <p className="truncate font-bold">{owner.shop_name}</p>
                <p className="truncate text-sm text-slate-500">{owner.email} · {owner.status} · limit {owner.monthly_limit}</p>
              </div>
              <div className="flex gap-2">
                <button className="icon-button" onClick={() => statusMutation.mutate({ id: owner.id, status: 'active' })}><BadgeCheck size={17} /></button>
                <button className="icon-button" onClick={() => statusMutation.mutate({ id: owner.id, status: 'suspended' })}><Ban size={17} /></button>
              </div>
            </div>
          ))}
        </AdminList>
        <AdminList title="Deal moderation" icon={BarChart3}>
          {(deals.data?.deals || []).map((deal) => (
            <div key={deal.id} className="admin-row">
              <div className="min-w-0">
                <p className="truncate font-bold">{deal.title}</p>
                <p className="truncate text-sm text-slate-500">{deal.shop_name} · {deal.status} · {deal.category_name}</p>
              </div>
              <button className="icon-button" onClick={() => dealMutation.mutate({ id: deal.id, status: 'blocked' })}><Trash2 size={17} /></button>
            </div>
          ))}
        </AdminList>
      </div>
    </section>
  );
}

function Auth({ compact = false }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ name: '', email: '', password: '', shopName: '', ownerPhone: '', address: '', area: '', googleMapsUrl: '' });
  const { data: areasData } = useQuery('areas', async () => (await api.get('/locations/areas')).data);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authMutation = useMutation(
    () => api.post(mode === 'login' ? '/auth/login' : '/auth/register', mode === 'login' ? { email: form.email, password: form.password } : { ...form, role }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('me');
        navigate(role === 'shop_owner' ? '/owner' : '/');
      }
    }
  );
  const authErrors = authMutation.error?.response?.data?.errors || {};
  return (
    <section className={`mx-auto max-w-xl ${compact ? '' : 'pt-6'}`}>
      <div className="liquid-panel p-5">
        <p className="eyebrow">Secure access</p>
        <h1 className="mt-1 text-3xl font-black">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-[1.25rem] bg-slate-100 p-1">
          <button onClick={() => setMode('login')} className={`seg ${mode === 'login' ? 'active' : ''}`}>Login</button>
          <button onClick={() => setMode('register')} className={`seg ${mode === 'register' ? 'active' : ''}`}>Register</button>
        </div>
        <form className="mt-5 grid gap-3" onSubmit={(event) => { event.preventDefault(); authMutation.mutate(); }}>
          {mode === 'register' ? <Input label="Name" value={form.name} error={authErrors.name} onChange={(name) => setForm({ ...form, name })} /> : null}
          <Input label="Email" type="email" value={form.email} error={authErrors.email} onChange={(email) => setForm({ ...form, email })} />
          <Input label="Password" type="password" value={form.password} error={authErrors.password} onChange={(password) => setForm({ ...form, password })} />
          {mode === 'register' ? (
            <>
              <Select label="Role" value={role} onChange={setRole} options={[['user', 'User'], ['shop_owner', 'Shop owner']]} />
              {role === 'shop_owner' ? (
                <>
                  <Input label="Shop name" value={form.shopName} error={authErrors.shopName} onChange={(shopName) => setForm({ ...form, shopName })} />
                  <Input label="Phone" value={form.ownerPhone} error={authErrors.ownerPhone} onChange={(ownerPhone) => setForm({ ...form, ownerPhone })} />
                  <Input label="Address" value={form.address} error={authErrors.address} onChange={(address) => setForm({ ...form, address })} />
                  <Select label="Shop area" value={form.area} error={authErrors.area} onChange={(area) => setForm({ ...form, area })} options={[['', 'Select area'], ...(areasData?.areas || []).filter((area) => area.name !== 'All Hyderabad').map((area) => [area.name, area.name])]} />
                  <Input label="Google Maps URL" value={form.googleMapsUrl} error={authErrors.googleMapsUrl} onChange={(googleMapsUrl) => setForm({ ...form, googleMapsUrl })} />
                </>
              ) : null}
            </>
          ) : null}
          {authMutation.error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{authMutation.error.response?.data?.message || 'Authentication failed.'}</p> : null}
          <button className="wide-button">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <p className="text-center text-xs text-slate-500">Admin seed: admin@deals.local. Change credentials before production.</p>
        </form>
      </div>
    </section>
  );
}

function BottomNav() {
  const links = [
    ['/', Home, 'Home'],
    ['/map', Map, 'Map'],
    ['/owner', Store, 'Owner'],
    ['/admin', LayoutDashboard, 'Admin']
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-4 pb-4 md:hidden">
      <div className="grid grid-cols-4 gap-1 rounded-[1.65rem] border border-[#eadfce]/80 bg-[#fffaf1]/78 p-2 shadow-glass backdrop-blur-2xl">
        {links.map(([to, Icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-[1.15rem] bg-[#fffaf1]/72 p-3"><p className="text-xs font-bold uppercase text-stone-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}

function FilterPill({ active, children, onClick }) {
  return <button onClick={onClick} className={`pill ${active ? 'active' : ''}`}>{children}</button>;
}

function Select({ label, value, onChange, options, error }) {
  const message = firstError(error);
  return (
    <label className={`field ${message ? 'field-error' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      {message ? <small>{message}</small> : null}
    </label>
  );
}

function Input({ label, value, onChange, type = 'text', error }) {
  const message = firstError(error);
  return <label className={`field ${message ? 'field-error' : ''}`}><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} />{message ? <small>{message}</small> : null}</label>;
}

function Textarea({ label, value, onChange, error }) {
  const message = firstError(error);
  return <label className={`field ${message ? 'field-error' : ''}`}><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows="4" />{message ? <small>{message}</small> : null}</label>;
}

function EmptyState({ title, text }) {
  return <div className="liquid-panel grid min-h-64 place-items-center p-8 text-center"><div><Sparkles className="mx-auto mb-3" /><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div></div>;
}

function SkeletonGrid() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-96 animate-pulse rounded-[1.8rem] bg-[#fffaf1]/70" />)}</div>;
}

function AdminMetric({ icon: Icon, label, value }) {
  return <div className="liquid-panel p-4"><Icon size={20} /><p className="mt-3 text-sm text-slate-500">{label}</p><p className="text-3xl font-black">{value}</p></div>;
}

function AdminList({ title, icon: Icon, children }) {
  return <div className="liquid-panel p-4"><div className="mb-3 flex items-center gap-2 font-black"><Icon size={18} />{title}</div><div className="space-y-2">{children}</div></div>;
}

function priceLabel(deal) {
  if (deal.regular_price && deal.deal_price) return `${Math.round((1 - deal.deal_price / deal.regular_price) * 100)}% off`;
  return 'Offer';
}

function sumTotals(rows = []) {
  return rows.reduce((total, row) => total + Number(row.total || 0), 0);
}

function defaultDealForm() {
  return {
    title: '',
    description: '',
    couponCode: '',
    categoryId: '',
    discountLabel: '',
    regularPrice: '',
    dealPrice: '',
    isBest: false,
    googleMapsUrl: '',
    imageUrl: ''
  };
}

function firstError(error) {
  if (Array.isArray(error)) return error[0];
  return error || '';
}

export default App;
