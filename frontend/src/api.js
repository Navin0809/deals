import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

export const fetchDeals = async ({ pageParam = 1, queryKey }) => {
  const [, filters] = queryKey;
  const params = { ...filters, page: pageParam, limit: 8 };

  // Remove undefined filters to fetch all ads by default
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === '') {
      delete params[key];
    }
  });

  const { data } = await api.get('/deals', { params });
  return data;
};

export const normalizeImage = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/${url}`;
};
