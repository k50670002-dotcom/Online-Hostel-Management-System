/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE = '/api';

// Helper to get Auth headers
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('hostel_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle response
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  async register(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async login(data: any) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async updateProfile(data: any) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Hostels
  async getHostels(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/hostels?${query.toString()}`);
    return handleResponse<any[]>(res);
  },

  async getHostel(id: string) {
    const res = await fetch(`${API_BASE}/hostels/${id}`);
    return handleResponse<any>(res);
  },

  async createHostel(data: any) {
    const res = await fetch(`${API_BASE}/hostels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateHostel(id: string, data: any) {
    const res = await fetch(`${API_BASE}/hostels/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteHostel(id: string) {
    const res = await fetch(`${API_BASE}/hostels/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async approveHostel(id: string, isApproved: boolean) {
    const res = await fetch(`${API_BASE}/hostels/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isApproved }),
    });
    return handleResponse<any>(res);
  },

  // Rooms
  async addRoom(hostelId: string, data: any) {
    const res = await fetch(`${API_BASE}/hostels/${hostelId}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateRoom(roomId: string, data: any) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteRoom(roomId: string) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Bookings
  async getBookings() {
    const res = await fetch(`${API_BASE}/bookings`, {
      headers: getHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async createBooking(data: any) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateBookingStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse<any>(res);
  },

  // Payments
  async getPayments() {
    const res = await fetch(`${API_BASE}/payments`, {
      headers: getHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async processPayment(data: any) {
    const res = await fetch(`${API_BASE}/payments/process`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Reviews
  async submitReview(data: any) {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async editReview(id: string, data: any) {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteReview(id: string) {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Wishlist
  async getWishlist() {
    const res = await fetch(`${API_BASE}/wishlist`, {
      headers: getHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async toggleWishlist(hostelId: string) {
    const res = await fetch(`${API_BASE}/wishlist`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ hostelId }),
    });
    return handleResponse<any>(res);
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    return handleResponse<any[]>(res);
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  // Admin and Reports
  async getAdminReports() {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },

  async deleteUser(userId: string) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<any>(res);
  },
};
