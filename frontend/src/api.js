import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

export const fetchDeals = async ({ pageParam = 1, queryKey }) => {
  const [, filters] = queryKey;
  const { data } = await api.get('/deals', { params: { ...filters, page: pageParam, limit: 8 } });
  return data;
};

export const normalizeImage = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/${url}`;
};
