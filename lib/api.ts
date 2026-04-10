/**
 * API Service for connecting to Flask Backend
 */

// API logic now defined inside apiRequest for better validation

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

// API request helper with rigid validation and debugging
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 🔗 URL Logic: Force production URL
  const baseUrl = 'https://prefinity-api.onrender.com/api';

  // Ensure endpoint starts with /
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${sanitizedEndpoint}`;

  // 📝 Debug Log: This will show up in the browser's F12 console
  console.log(`[API] 🚀 Fetching from: ${fullUrl}`);

  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (fetchError) {
    console.error('[API] ❌ Network Error:', fetchError);
    throw new Error('Failed to connect to the server. Check your internet or backend status.');
  }
  
  // 🔍 Fail-Safe: Check for HTML response before JSON parsing
  const responseText = await response.text();
  const isHtml = responseText.trim().toLowerCase().startsWith('<!doctype') || 
                 responseText.trim().toLowerCase().startsWith('<html');

  if (isHtml) {
    console.error('[API] ⚠️ Error: Server returned HTML instead of JSON. Full Response:', responseText.substring(0, 500));
    
    // Help the user identify common causes
    if (fullUrl.includes('localhost') && !responseText.includes('Flask')) {
      throw new Error('Backend not found at localhost. Are you sure your Python server is running?');
    }
    if (responseText.includes('Render') || response.status >= 500) {
      throw new Error('Server is waking up or having trouble. Please wait 30 seconds and try again.');
    }
    throw new Error(`Connectivity error: Server returned an unexpected page (Status ${response.status}).`);
  }
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('[API] ❌ JSON Parse Error. Raw text:', responseText);
    throw new Error('Server returned invalid data. Please refresh the page and try again.');
  }
  
  if (!response.ok) {
    const errorMsg = data.message && data.error ? `${data.error} - ${data.message}` : data.error || data.message;
    throw new Error(errorMsg || `Request failed with status ${response.status}`);
  }
  
  return data;
}

// Auth API
export const authAPI = {
  register: (username: string, email: string, password: string) =>
    apiRequest<{
      message: string;
      token: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
  
  login: (email: string, password: string) =>
    apiRequest<{
      message: string;
      token: string;
      user: User;
      bonus?: { type: string; amount: number; message: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  logout: () =>
    apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }),
  
  getMe: () =>
    apiRequest<{ user: User; preferences: UserPreferences }>('/auth/me'),
  
  refresh: () =>
    apiRequest<{ token: string; message: string }>('/auth/refresh', { method: 'POST' }),
  
  resetPassword: (email: string, newPassword: string) =>
    apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password: newPassword }),
    }),
};

// Users API
export const usersAPI = {
  getProfile: () =>
    apiRequest<{
      profile: User;
      stats: UserStats;
      preferences: UserPreferences;
    }>('/users/profile'),
  
  updateProfile: (data: Partial<User>) =>
    apiRequest<{ message: string }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  updatePreferences: (data: Partial<UserPreferences>) =>
    apiRequest<{ message: string }>('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  rateItem: (itemId: number, rating: number, review?: string) =>
    apiRequest<{ message: string }>('/users/rate', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, rating, review }),
    }),
  
  getRatings: (type?: string) =>
    apiRequest<{ ratings: Rating[] }>(`/users/ratings${type ? `?type=${type}` : ''}`),
  
  getWishlist: (type?: string) =>
    apiRequest<{ wishlist: WishlistItem[] }>(`/users/wishlist${type ? `?type=${type}` : ''}`),
  
  addToWishlist: (itemId: number, notes?: string) =>
    apiRequest<{ message: string }>('/users/wishlist', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, notes }),
    }),
  
  removeFromWishlist: (itemId: number) =>
    apiRequest<{ message: string }>(`/users/wishlist/${itemId}`, { method: 'DELETE' }),
  
  getActivity: (limit?: number) =>
    apiRequest<{ activity: UserActivity[] }>(`/users/activity${limit ? `?limit=${limit}` : ''}`),
};

// Items API
export const itemsAPI = {
  getItems: (params?: {
    type?: string;
    genre?: string;
    ethiopian?: boolean;
    sort?: string;
    page?: number;
    per_page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiRequest<{ items: Item[]; pagination: Pagination }>(
      `/items?${searchParams.toString()}`
    );
  },
  
  getItem: (id: number) =>
    apiRequest<{
      item: Item;
      details: ItemDetails;
      ethiopian_metadata: EthiopianMetadata | null;
      ratings: ItemRating[];
    }>(`/items/${id}`),
  
  search: (query: string, type?: string) =>
    apiRequest<{ results: Item[]; query: string; count: number }>(
      `/items/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}`
    ),
  
  getGenres: (type?: string) =>
    apiRequest<{ genres: string[] }>(`/items/genres${type ? `?type=${type}` : ''}`),
  
  getEthiopianGenres: () =>
    apiRequest<{ ethiopian_genres: string[] }>('/items/ethiopian-genres'),
  
  getPopular: (type?: string, limit?: number) =>
    apiRequest<{ items: Item[] }>(
      `/items/popular?${type ? `type=${type}&` : ''}${limit ? `limit=${limit}` : ''}`
    ),
  
  getEthiopianContent: (type?: string, limit?: number) =>
    apiRequest<{ items: Item[] }>(
      `/items/ethiopian?${type ? `type=${type}&` : ''}${limit ? `limit=${limit}` : ''}`
    ),
    
  getSpotifyUrl: (itemId: number) =>
    apiRequest<{ spotify_id?: string; error?: string }>(`/items/${itemId}/spotify`),
};

// Recommendations API
export const recommendationsAPI = {
  getRecommendations: (params?: {
    type?: string;
    limit?: number;
    algorithm?: 'collaborative' | 'content' | 'hybrid' | 'cross_domain';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiRequest<{
      recommendations: RecommendedItem[];
      algorithm: string;
      count: number;
    }>(`/recommendations?${searchParams.toString()}`);
  },
  
  explainRecommendation: (itemId: number) =>
    apiRequest<{
      item_id: number;
      title: string;
      score: number;
      algorithm: string;
      explanation: string;
    }>(`/recommendations/explain/${itemId}`),
  
  getHistory: (page?: number, perPage?: number) =>
    apiRequest<{ recommendations: RecommendedItem[]; pagination: Pagination }>(
      `/recommendations/history?page=${page || 1}&per_page=${perPage || 20}`
    ),
  
  getSimilarItems: (itemId: number, limit?: number) =>
    apiRequest<{ item_id: number; similar_items: Item[] }>(
      `/recommendations/similar/${itemId}${limit ? `?limit=${limit}` : ''}`
    ),
  
  getColdStart: (type?: string, limit?: number) =>
    apiRequest<{ recommendations: Item[]; type: string }>(
      `/recommendations/cold-start?${type ? `type=${type}&` : ''}${limit ? `limit=${limit}` : ''}`
    ),
  
  getEthiopianRecommendations: (type?: string, limit?: number) =>
    apiRequest<{ recommendations: Item[]; count: number }>(
      `/recommendations/ethiopian?${type ? `type=${type}&` : ''}${limit ? `limit=${limit}` : ''}`
    ),
  
  provideFeedback: (itemId: number, feedback: 'helpful' | 'not_helpful' | 'already_seen') =>
    apiRequest<{ message: string }>('/recommendations/feedback', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, feedback }),
    }),
};

// Credits API
export const creditsAPI = {
  getBalance: () =>
    apiRequest<{
      credits: number;
      costs: CreditCosts;
      rewards: CreditRewards;
    }>('/credits/balance'),
  
  getTransactions: (page?: number, perPage?: number, type?: string) => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (perPage) params.append('per_page', String(perPage));
    if (type) params.append('type', type);
    return apiRequest<{ transactions: CreditTransaction[]; pagination: Pagination }>(
      `/credits/transactions?${params.toString()}`
    );
  },
  
  getSummary: () =>
    apiRequest<{
      current_balance: number;
      summary: CreditSummary[];
      recent_transactions: CreditTransaction[];
    }>('/credits/summary'),
  
  purchaseCredits: (amount: number) =>
    apiRequest<{
      message: string;
      amount: number;
      new_balance: number;
      price: number;
    }>('/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  
  getPackages: () =>
    apiRequest<{ packages: CreditPackage[] }>('/credits/packages'),
};

// Admin API
export const adminAPI = {
  getStats: () =>
    apiRequest<{
      users: AdminUserStats;
      content: AdminContentStats;
      ratings: AdminRatingStats;
      recent_users: User[];
    }>('/admin/stats'),

  searchExternal: (itemType: string, query: string) =>
    apiRequest<{ results: any[] }>(`/admin/import/search?type=${itemType}&q=${query}`),

  importExternalItem: (itemData: any) =>
    apiRequest<{ message: string; item_id: number }>('/admin/import/add', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),
  
  getUsers: (page?: number, perPage?: number, search?: string) => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (perPage) params.append('per_page', String(perPage));
    if (search) params.append('search', search);
    return apiRequest<{ users: User[]; pagination: Pagination }>(
      `/admin/users?${params.toString()}`
    );
  },
  
  updateUser: (userId: number, data: { role?: string; is_active?: boolean; credits?: number }) =>
    apiRequest<{ message: string }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getSettings: () =>
    apiRequest<{ settings: any[] }>('/admin/settings'),

  updateSettingsBatch: (settings: Array<{ key: string; value: string }>) =>
    apiRequest<{ message: string }>('/admin/settings/batch', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),
  
  deleteUser: (userId: number) =>
    apiRequest<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),

  addItem: (data: NewItemData) =>
    apiRequest<{ message: string; item_id: number }>('/admin/add-item', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateItem: (itemId: number, data: Partial<Item>) =>
    apiRequest<{ message: string }>(`/admin/item/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteItem: (itemId: number) =>
    apiRequest<{ message: string }>(`/admin/item/${itemId}`, { method: 'DELETE' }),
  
  updateEthiopianMetadata: (itemId: number, data: Partial<EthiopianMetadata>) =>
    apiRequest<{ message: string }>(`/admin/ethiopian-metadata/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  grantCredits: (userId: number, amount: number, reason?: string) =>
    apiRequest<{ message: string; user_id: number; amount: number; new_balance: number }>(
      '/credits/admin/grant',
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, amount, reason }),
      }
    ),
  
  deductCredits: (userId: number, amount: number, reason?: string) =>
    apiRequest<{ message: string; user_id: number; amount: number; new_balance: number }>(
      '/credits/admin/deduct',
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, amount, reason }),
      }
    ),
  
  getRecentActivity: (limit: number = 20) =>
    apiRequest<{ activities: RecentActivity[] }>(`/admin/activity?limit=${limit}`),
};

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'guest' | 'user' | 'admin';
  credits: number;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  preferred_genres: string[];
  preferred_languages: string[];
  ethiopian_content_preference: boolean;
  notification_enabled: boolean;
}

export interface UserStats {
  total_ratings: number;
  average_rating: number;
  book_ratings: number;
  movie_ratings: number;
  music_ratings: number;
  wishlist_items: number;
}

export interface Item {
  id: number;
  title: string;
  description: string;
  genre: string;
  item_type: 'book' | 'movie' | 'music';
  cover_image: string;
  is_ethiopian: boolean;
  popularity_score: number;
  avg_rating: number;
  rating_count: number;
  creator?: string;
  year?: number;
  created_at?: string;
}

export interface ItemDetails {
  // Book specific
  author?: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  page_count?: number;
  language?: string;
  // Movie specific
  director?: string;
  release_year?: number;
  duration_minutes?: number;
  country?: string;
  cast_members?: string;
  // Music specific
  artist?: string;
  album?: string;
  duration_seconds?: number;
  ethiopian_genre?: string;
  spotify_id?: string;
}

export interface EthiopianMetadata {
  id: number;
  item_id: number;
  amharic_title: string;
  cultural_significance: string;
  region: string;
  traditional_genre: string;
  historical_period?: string;
}

export interface RecentActivity {
  id: number;
  type: 'user' | 'item' | 'rating' | 'credit';
  description: string;
  timestamp: string;
  user_id?: number;
}

export interface Rating {
  id: number;
  user_id: number;
  item_id: number;
  rating: number;
  review: string;
  created_at: string;
  title?: string;
  item_type?: string;
  cover_image?: string;
  genre?: string;
}

export interface ItemRating {
  rating: number;
  review: string;
  created_at: string;
  username: string;
}

export interface WishlistItem extends Item {
  added_at: string;
  notes: string;
}

export interface UserActivity {
  id: number;
  user_id: number;
  activity_type: string;
  item_id: number | null;
  details: Record<string, unknown>;
  created_at: string;
  title?: string;
  item_type?: string;
}

export interface RecommendedItem extends Item {
  score: number;
  explanation: string;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface CreditCosts {
  recommendation: number;
  search: number;
  rating: number;
  view_item: number;
}

export interface CreditRewards {
  rating: number;
  daily_login: number;
  referral: number;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

export interface CreditSummary {
  transaction_type: string;
  count: number;
  total_amount: number;
}

export interface CreditPackage {
  credits: number;
  price: number;
  popular: boolean;
}

export interface AdminUserStats {
  total_users: number;
  admin_count: number;
  active_users: number;
  new_today: number;
}

export interface AdminContentStats {
  total_items: number;
  books: number;
  movies: number;
  music: number;
  ethiopian_content: number;
}

export interface AdminRatingStats {
  total: number;
  average: number;
  unique_raters: number;
}

export interface NewItemData {
  title: string;
  item_type: 'book' | 'movie' | 'music';
  description?: string;
  genre?: string;
  cover_image?: string;
  is_ethiopian?: boolean;
  popularity_score?: number;
  // Type-specific fields
  author?: string;
  director?: string;
  artist?: string;
  publication_year?: number;
  release_year?: number;
  language?: string;
  // Ethiopian metadata
  amharic_title?: string;
  cultural_significance?: string;
  region?: string;
  traditional_genre?: string;
}
// ...existing code...

// Wishlist API
export const wishlistAPI = {
  getWishlist: () =>
    apiRequest<{ wishlist: any[] }>('/wishlist'),
  
  addToWishlist: (itemId: number, notes: string = '') =>
    apiRequest<{ message: string }>('/wishlist/add', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, notes }),
    }),
  
  removeFromWishlist: (itemId: number) =>
    apiRequest<{ message: string }>(`/wishlist/${itemId}`, {
      method: 'DELETE',
    }),
  
  checkWishlist: (itemId: number) =>
    apiRequest<{ in_wishlist: boolean }>(`/wishlist/check/${itemId}`),
};

// Discovery API
export const discoveryAPI = {
  getTrending: (type: string = 'movie') =>
    apiRequest<{ results: any[] }>(`/discover/trending?type=${type}`),
  
  searchExternalPublic: (type: string, query: string) =>
    apiRequest<{ results: any[] }>(`/discover/search?type=${type}&q=${query}`),
  
  syncExternalItem: (itemData: any) =>
    apiRequest<{ message: string; item_id: number }>('/discover/sync', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),
};

// Backwards-compatible camelCase aliases (some files import adminApi, itemsApi, creditsApi, etc.)
export const authApi = authAPI;
export const usersApi = usersAPI;
export const itemsApi = itemsAPI;
export const recommendationsApi = recommendationsAPI;
export const creditsApi = creditsAPI;
export const adminApi = adminAPI;
export const wishlistApi = wishlistAPI;