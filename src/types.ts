/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'GUEST' | 'STUDENT' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePic?: string;
  phone?: string;
  joinedDate: string;
}

export type HostelGenderType = 'Boys' | 'Girls' | 'Co-Ed';

export type FacilityType =
  | 'WiFi'
  | 'Laundry'
  | 'Parking'
  | 'Security'
  | 'CCTV'
  | 'Water Purifier'
  | 'AC'
  | 'Non-AC'
  | 'Study Room'
  | 'Library'
  | 'Gym'
  | 'Mess Facility';

export interface Room {
  id: string;
  hostelId: string;
  roomType: string; // Single, Double, Triple, Quadruple, etc.
  capacity: number;
  pricePerMonth: number;
  availableBeds: number;
  images: string[];
}

export interface Hostel {
  id: string;
  name: string;
  type: HostelGenderType;
  address: string;
  city: string;
  area: string;
  googleMapsLocation: string;
  description: string;
  contactNumber: string;
  email: string;
  facilities: FacilityType[];
  images: string[];
  ownerId: string;
  rooms: Room[];
  averageRating: number;
  isApproved: boolean; // Admin approval
}

export type BookingStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed';

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  hostelId: string;
  hostelName: string;
  hostelType: HostelGenderType;
  roomId: string;
  roomType: string;
  pricePerMonth: number;
  bookingType: 'Bed' | 'Room' | 'Monthly';
  startDate: string;
  durationMonths: number;
  totalAmount: number;
  status: BookingStatus;
  bookingDate: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  paymentId?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  amount: number;
  paymentDate: string;
  status: 'Success' | 'Failure';
  transactionId: string;
  refunded: boolean;
}

export interface Review {
  id: string;
  hostelId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  reviewDate: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  hostelId: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}
