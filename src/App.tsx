/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Shield, Activity, Wifi, MapPin, Star, User, 
  Home as HomeIcon, Heart, CreditCard, Plus, Trash2, Edit, Check, X, 
  FileText, Bell, LogOut, DollarSign, Sliders, Eye, BookOpen, Award, CheckSquare, RefreshCw
} from 'lucide-react';
import { api } from './utils/api';
import { Hostel, Room, Booking, Payment, Review, User as UserType, Notification } from './types';

// Area constants found in Gondia
const AREAS = ['Kudwa', 'Ramnagar', 'Civil Lines', 'Bajaj Nagar'];
const FACILITIES_LIST = [
  'WiFi', 'Laundry', 'Parking', 'Security', 'CCTV', 'Water Purifier', 
  'AC', 'Non-AC', 'Study Room', 'Library', 'Gym', 'Mess Facility'
];

export default function App() {
  // Navigation & Authentication state
  const [currentTab, setCurrentTab] = useState<'browse' | 'details' | 'dashboard' | 'admin' | 'wishlist'>('browse');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form Fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authRole, setAuthRole] = useState<'STUDENT' | 'OWNER' | 'ADMIN'>('STUDENT');
  const [authError, setAuthError] = useState('');

  // Hostels list & filter state
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const [filterGender, setFilterGender] = useState<'All' | 'Boys' | 'Girls' | 'Co-Ed'>('All');
  const [filterArea, setFilterArea] = useState<string>('All');
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(12000);
  const [filterFacilities, setFilterFacilities] = useState<string[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(false);

  // Detail Modal / Booking interaction
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingMonths, setBookingMonths] = useState<number>(3);
  const [bookingStartDate, setBookingStartDate] = useState<string>('2026-06-01');
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  
  // Review state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Checkouts & Transactions
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [bookingTransactions, setBookingTransactions] = useState<Payment[]>([]);

  // User Dashboard State
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myWishlist, setMyWishlist] = useState<Hostel[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Hostel Owner States
  const [ownerStats, setOwnerStats] = useState({ totalBeds: 0, occupiedBeds: 0, revenue: 0 });
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [editingHostelId, setEditingHostelId] = useState<string | null>(null);
  const [hostelForm, setHostelForm] = useState({
    name: '', type: 'Boys' as 'Boys' | 'Girls' | 'Co-Ed', address: '', area: 'Kudwa',
    googleMapsLocation: '', description: '', contactNumber: '', email: '',
    facilities: [] as string[], images: [] as string[]
  });
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedHostelForRoom, setSelectedHostelForRoom] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    roomType: 'Double sharing', capacity: 2, pricePerMonth: 4500, availableBeds: 4, images: []
  });

  // Admin Reports and Management
  const [adminReports, setAdminReports] = useState<any>(null);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'listings' | 'users' | 'reports'>('listings');

  // Load Initial Session and Hostels
  useEffect(() => {
    const cachedToken = localStorage.getItem('hostel_token');
    if (cachedToken) {
      setAuthToken(cachedToken);
    }
    fetchHostels();
  }, []);

  // Sync state on login changes
  useEffect(() => {
    if (authToken) {
      fetchCurrentUser();
    } else {
      setCurrentUser(null);
      setMyBookings([]);
      setMyWishlist([]);
      setNotifications([]);
    }
  }, [authToken]);

  useEffect(() => {
    if (currentUser) {
      fetchUserDashboardData();
    }
  }, [currentUser]);

  // Read hostels with custom filters
  const fetchHostels = async () => {
    setLoadingHostels(true);
    try {
      const criteria: Record<string, any> = {
        search: searchVal,
        type: filterGender === 'All' ? '' : filterGender,
        area: filterArea === 'All' ? '' : filterArea,
        maxPrice: filterMaxPrice,
        onlyApproved: currentUser?.role === 'ADMIN' ? 'false' : 'true' // Admins can see raw drafts
      };
      
      // Map facilities
      filterFacilities.forEach(f => {
        criteria[f.toLowerCase().replace(' ', '')] = 'true';
      });

      const data = await api.getHostels(criteria);
      setHostels(data);
      
      // If a hostel was deeply selected, sync its detail parameters
      if (selectedHostel) {
        const updatedSelection = data.find(h => h.id === selectedHostel.id);
        if (updatedSelection) {
          // If approved only, retrieve details via specific fetch
          const fullDetail = await api.getHostel(selectedHostel.id);
          setSelectedHostel(fullDetail);
        }
      }
    } catch (err) {
      console.error('Error fetching hostels:', err);
    } finally {
      setLoadingHostels(false);
    }
  };

  // Re-fetch when filter options change
  useEffect(() => {
    fetchHostels();
  }, [filterGender, filterArea, filterMaxPrice, filterFacilities, searchVal, currentUser?.role]);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  const fetchUserDashboardData = async () => {
    try {
      const bookingsData = await api.getBookings();
      setMyBookings(bookingsData);

      if (currentUser?.role === 'STUDENT') {
        const wishData = await api.getWishlist();
        setMyWishlist(wishData);
      }

      const notifs = await api.getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);

      const payments = await api.getPayments();
      setBookingTransactions(payments);

      if (currentUser?.role === 'OWNER') {
        calculateOwnerMetrics(bookingsData);
      } else if (currentUser?.role === 'ADMIN') {
        const reports = await api.getAdminReports();
        setAdminReports(reports);
      }
    } catch (err) {
      console.error('Error hydrating dashboards:', err);
    }
  };

  const calculateOwnerMetrics = (bookings: Booking[]) => {
    // Collect stats from owner's hostels
    const ownerHostels = hostels.filter(h => h.ownerId === currentUser?.id);
    let totalB = 0;
    let occB = 0;
    
    ownerHostels.forEach(h => {
      h.rooms?.forEach(r => {
        totalB += r.capacity;
        occB += (r.capacity - r.availableBeds);
      });
    });

    const successPayments = bookingTransactions.filter(p => p.status === 'Success');
    const ownerHostelIds = ownerHostels.map(h => h.id);
    const approvedBookings = bookings.filter(b => b.status === 'Approved' && ownerHostelIds.includes(b.hostelId));
    const revenue = approvedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    setOwnerStats({
      totalBeds: totalB || 12, // fallback
      occupiedBeds: occB || 8,
      revenue
    });
  };

  // Trigger registration or entry
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const res = await api.login({ email: authEmail, password: authPassword, role: authRole });
        localStorage.setItem('hostel_token', res.token);
        setAuthToken(res.token);
        setIsAuthModalOpen(false);
      } else {
        const res = await api.register({
          name: authName,
          email: authEmail,
          password: authPassword,
          role: authRole,
          phone: authPhone
        });
        localStorage.setItem('hostel_token', res.token);
        setAuthToken(res.token);
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hostel_token');
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentTab('browse');
    setSelectedHostel(null);
  };

  // Switch design layouts safely
  const viewHostelDetails = async (hostel: Hostel) => {
    try {
      const detailed = await api.getHostel(hostel.id);
      setSelectedHostel(detailed);
      setCurrentTab('details');
      // default selection
      if (detailed.rooms && detailed.rooms.length > 0) {
        setSelectedRoom(detailed.rooms[0]);
      } else {
        setSelectedRoom(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWishlist = async (hostelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      await api.toggleWishlist(hostelId);
      // reload
      await fetchHostels();
      if (currentUser) {
        const wishData = await api.getWishlist();
        setMyWishlist(wishData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Initiate bed booking
  const handleBookNow = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!selectedHostel || !selectedRoom) return;

    try {
      const payload = {
        hostelId: selectedHostel.id,
        roomId: selectedRoom.id,
        bookingType: 'Monthly',
        startDate: bookingStartDate,
        durationMonths: bookingMonths
      };

      const res = await api.createBooking(payload);
      setCheckoutBooking(res.booking);
      // Reset card entries
      setCardNumber('');
      setCardHolder('');
      setCardExpiry('');
      setCardCvv('');
      setPaymentSuccess(null);
      // view details / checkout
    } catch (err: any) {
      alert(err.message || 'Room occupied or booking failed');
    }
  };

  // Complete Simulated payment
  const handleCheckoutPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBooking) return;
    setPaymentProcessing(true);

    try {
      const res = await api.processPayment({
        bookingId: checkoutBooking.id,
        amount: checkoutBooking.totalAmount,
        cardNumber,
        cardHolder
      });

      if (res.status === 'SUCCESS') {
        setPaymentSuccess(true);
        fetchUserDashboardData();
        fetchHostels();
      } else {
        setPaymentSuccess(false);
      }
    } catch (err) {
      setPaymentSuccess(false);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Submit/Edit Review of a Hostel
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedHostel) return;

    try {
      if (editingReviewId) {
        await api.editReview(editingReviewId, { rating: reviewRating, comment: reviewComment });
        setEditingReviewId(null);
      } else {
        await api.submitReview({ hostelId: selectedHostel.id, rating: reviewRating, comment: reviewComment });
      }
      setReviewComment('');
      // update details
      const detailed = await api.getHostel(selectedHostel.id);
      setSelectedHostel(detailed);
      fetchHostels();
    } catch (err: any) {
      alert(err.message || 'Failed to publish review');
    }
  };

  const handleEditReview = (rev: Review) => {
    setEditingReviewId(rev.id);
    setReviewRating(rev.rating);
    setReviewComment(rev.comment);
  };

  const handleDeleteReview = async (revId: string) => {
    if (!selectedHostel) return;
    try {
      await api.deleteReview(revId);
      const detailed = await api.getHostel(selectedHostel.id);
      setSelectedHostel(detailed);
      fetchHostels();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Facilitate notification clearances
  const markAsRead = async (notifId: string) => {
    try {
      await api.markNotificationRead(notifId);
      fetchUserDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Change interactive roles quickly for testing/demo purposes
  const quickSwitchRole = async (targetRole: 'STUDENT' | 'OWNER' | 'ADMIN') => {
    try {
      // Find a user of this role from standard profiles
      const targetEmails: Record<string, string> = {
        STUDENT: 'student@gondia.com',
        OWNER: 'owner@gondia.com',
        ADMIN: 'admin@gondia.com'
      };

      const res = await api.login({ email: targetEmails[targetRole], password: 'password', role: targetRole });
      localStorage.setItem('hostel_token', res.token);
      setAuthToken(res.token);
      setCurrentTab('browse');
    } catch (err) {
      console.error('Quick switch user error:', err);
    }
  };

  // Owner listing managers
  const openAddHostel = () => {
    setEditingHostelId(null);
    setHostelForm({
      name: '', type: 'Boys', address: '', area: 'Kudwa',
      googleMapsLocation: '', description: '', contactNumber: '', email: '',
      facilities: [], images: []
    });
    setIsListingModalOpen(true);
  };

  const openEditHostel = (hostel: Hostel) => {
    setEditingHostelId(hostel.id);
    setHostelForm({
      name: hostel.name,
      type: hostel.type,
      address: hostel.address,
      area: hostel.area,
      googleMapsLocation: hostel.googleMapsLocation,
      description: hostel.description,
      contactNumber: hostel.contactNumber,
      email: hostel.email,
      facilities: hostel.facilities,
      images: hostel.images
    });
    setIsListingModalOpen(true);
  };

  const handleSaveHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHostelId) {
        await api.updateHostel(editingHostelId, hostelForm);
      } else {
        await api.createHostel(hostelForm);
      }
      setIsListingModalOpen(false);
      fetchHostels();
      fetchUserDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteHostel = async (hostelId: string) => {
    if (confirm('Are you sure you want to permanently delete this listing?')) {
      try {
        await api.deleteHostel(hostelId);
        fetchHostels();
        fetchUserDashboardData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Room config loaders
  const openAddRoom = (hostelId: string) => {
    setSelectedHostelForRoom(hostelId);
    setRoomForm({
      roomType: 'Double sharing',
      capacity: 2,
      pricePerMonth: 4500,
      availableBeds: 4,
      images: []
    });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostelForRoom) return;

    try {
      await api.addRoom(selectedHostelForRoom, roomForm);
      setIsRoomModalOpen(false);
      fetchHostels();
      fetchUserDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (confirm('Delete this room pricing category?')) {
      try {
        await api.deleteRoom(roomId);
        fetchHostels();
        fetchUserDashboardData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Booking action handlers for Admin/Owner
  const handleStatusTransition = async (bookingId: string, status: string) => {
    try {
      await api.updateBookingStatus(bookingId, status);
      fetchUserDashboardData();
    } catch (err: any) {
      alert(err.message || 'Status transition invalid');
    }
  };

  // Admin listing actions
  const handleToggleApprove = async (hostelId: string, currentApproved: boolean) => {
    try {
      await api.approveHostel(hostelId, !currentApproved);
      fetchHostels();
      fetchUserDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdminDeleteUser = async (userId: string) => {
    if (confirm('Permanently purge this account? All associated bookings & activity will be wiped.')) {
      try {
        await api.deleteUser(userId);
        fetchUserDashboardData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0C10] text-[#E2E8F0] font-sans antialiased">
      
      {/* GLOBAL SYSTEM HEADER */}
      <header className="sticky top-0 z-40 bg-[#13161C] border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setCurrentTab('browse'); setSelectedHostel(null); }}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">G</div>
            <span className="text-lg font-bold tracking-tight text-white hover:opacity-90">
              Gondia<span className="text-blue-500">Hostels</span>
            </span>
          </div>

          {/* Quick-Access Search (Global in Header) */}
          <div className="flex-1 max-w-sm mx-8 hidden md:block">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search hosts, areas like Kudwa, Civil Lines..." 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-[#1A1D23] text-gray-200 border border-gray-700 rounded-full py-1.5 px-10 text-xs focus:outline-none focus:border-blue-500 placeholder-gray-500"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-2 text-gray-500" />
              {searchVal && (
                <button onClick={() => setSearchVal('')} className="absolute right-3.5 top-2 text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => { setCurrentTab('browse'); setSelectedHostel(null); }}
              className={`text-xs font-medium cursor-pointer transition-colors ${currentTab === 'browse' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
            >
              Browse
            </button>

            {/* If Student, access wishlist */}
            {currentUser?.role === 'STUDENT' && (
              <button 
                onClick={() => setCurrentTab('wishlist')}
                className={`text-xs font-medium cursor-pointer transition-colors flex items-center space-x-1 ${currentTab === 'wishlist' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Wishlist</span>
              </button>
            )}

            {/* Conditional Dashboards based on roles */}
            {currentUser && (
              <button 
                onClick={() => setCurrentTab(currentUser.role === 'ADMIN' ? 'admin' : 'dashboard')}
                className={`text-xs font-medium cursor-pointer transition-colors ${currentTab === 'dashboard' || currentTab === 'admin' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
              >
                {currentUser.role === 'ADMIN' ? 'Admin Panel' : 'My Dashboard'}
              </button>
            )}

            {/* Notification Indicator badge */}
            {currentUser && (
              <div className="relative">
                <button 
                  onClick={() => setCurrentTab('dashboard')}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span id="notif-badge" className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Profile trigger or Register/Login Button */}
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <img 
                  src={currentUser.profilePic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                  className="w-7 h-7 rounded-full border border-gray-700 bg-gray-800 object-cover" 
                  alt="Profile"
                />
                <span className="text-xs text-semibold truncate max-w-[80px] hidden sm:inline-block">
                  {currentUser.name}
                </span>
                <button 
                  onClick={handleLogout} 
                  className="text-gray-400 hover:text-red-400 cursor-pointer p-1"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
                className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-all cursor-pointer shadow"
              >
                Account Login
              </button>
            )}
          </div>

        </div>
      </header>

      {/* SUB-HEADER STATS INFO */}
      <div className="bg-[#13161C] border-b border-gray-800/80 text-[10.5px] uppercase tracking-wider text-gray-400/90 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex space-x-6">
            <span>Verified Listings: <strong className="text-white">{hostels.filter(h => h.isApproved).length}</strong></span>
            <span>Room Capacity: <strong className="text-white">{hostels.reduce((sum, h) => sum + (h.rooms?.length || 0), 0) * 4}+ Beds</strong></span>
            <span>Region: <strong className="text-white">Gondia, MH, India</strong></span>
          </div>

          {/* Quick Mock Mode Switche Indicator for Sandbox reviewers */}
          <div className="flex items-center space-x-2 bg-[#0A0C10] px-2 py-0.5 rounded border border-gray-800 text-[9.5px]">
            <span className="text-gray-500">Quick Test Roles:</span>
            <button onClick={() => quickSwitchRole('STUDENT')} className="hover:text-blue-400 cursor-pointer font-bold mr-1">Student</button> |
            <button onClick={() => quickSwitchRole('OWNER')} className="hover:text-amber-400 cursor-pointer font-bold ml-1 mr-1">Owner</button> |
            <button onClick={() => quickSwitchRole('ADMIN')} className="hover:text-red-400 cursor-pointer font-bold ml-1">Admin</button>
          </div>
        </div>
      </div>

      {/* CORE ROOT WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        
        {/* ======================= TAB 1: BROWSE HOSTELS ======================= */}
        {currentTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Sidebar Filter Section */}
            <aside className="lg:col-span-1 bg-[#13161C] rounded-2xl border border-gray-800 p-5 self-start">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
                <span className="text-xs uppercase tracking-wider font-bold text-gray-400 flex items-center space-x-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Interactive Filters</span>
                </span>
                <button 
                  onClick={() => {
                    setFilterGender('All');
                    setFilterArea('All');
                    setFilterMaxPrice(12000);
                    setFilterFacilities([]);
                  }}
                  className="text-[10px] text-blue-500 hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                
                {/* Search on mobile */}
                <div className="block md:hidden">
                  <label className="text-xs text-gray-400 block mb-1">Search Keywords</label>
                  <input 
                    type="text" 
                    placeholder="Search by hotel name..." 
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-700 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Gender preference */}
                <div>
                  <label id="gender-pref-label" className="text-xs text-gray-400 block mb-2">Gender Category</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['All', 'Boys', 'Girls', 'Co-Ed'].map((gender) => (
                      <button
                        key={gender}
                        onClick={() => setFilterGender(gender as any)}
                        className={`text-[11px] py-1.5 rounded-lg font-medium transition-all cursor-pointer border ${
                          filterGender === gender 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                            : 'bg-[#1A1D23] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area filter */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Locality in Gondia</label>
                  <select 
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full bg-[#1A1D23] text-xs text-gray-200 border border-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Areas</option>
                    {AREAS.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400">Max Budget (/mo)</label>
                    <span className="text-xs font-mono font-bold text-blue-400">₹{filterMaxPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2000" 
                    max="12000" 
                    step="500"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-[#1A1D23] h-1.5 rounded-lg cursor-pointer transition-all"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>₹2,000</span>
                    <span>₹12,000</span>
                  </div>
                </div>

                {/* Facilities Multi-selector */}
                <div className="pt-3 border-t border-gray-800">
                  <label className="text-xs text-gray-400 block mb-2">Amenities & Facilities</label>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {FACILITIES_LIST.map(fac => {
                      const has = filterFacilities.includes(fac);
                      return (
                        <label key={fac} className="flex items-center text-xs text-gray-400 cursor-pointer hover:text-white">
                          <input 
                            type="checkbox" 
                            checked={has}
                            onChange={() => {
                              if (has) {
                                setFilterFacilities(filterFacilities.filter(f => f !== fac));
                              } else {
                                setFilterFacilities([...filterFacilities, fac]);
                              }
                            }}
                            className="mr-2 rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span>{fac}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>
            </aside>

            {/* Right Main Grid */}
            <section className="lg:col-span-3">

              {/* Browse Hero banner block */}
              <div id="hero-banner" className="bg-gradient-to-r from-[#1E293B]/60 to-[#0F172A]/80 border border-gray-800 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Stay Comfortably in Gondia</h1>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-xl">
                    Discover handpicked hostels tailored for students, interns, and working professionals. Secure booking with verified ratings, active mess yards, and zero brokerage.
                  </p>
                </div>
                <div className="flex space-x-1.5 shrink-0 bg-[#0A0C10]/60 p-1 border border-gray-800 rounded-xl">
                  <span id="popular-badge" className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg text-blue-400 bg-blue-950/40">Student Hubs</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg text-gray-400">Gondia College Approved</span>
                </div>
              </div>

              {/* Sorting information & counts */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Recommended Hostels</h2>
                  <p className="text-xs text-gray-500">Showing {hostels.length} approved local stays in Gondia city limit</p>
                </div>
                
                {/* List Search Bar on tablets/smaller desktop */}
                <div className="relative w-full sm:w-64">
                  <input 
                    type="text" 
                    placeholder="Search name, landmark..." 
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    className="w-full bg-[#13161C] border border-gray-800 rounded-lg py-1 px-3.5 pl-8 text-xs text-white focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
                </div>
              </div>

              {/* Hostels Loader or Grid */}
              {loadingHostels ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500 font-mono">Fetching coordinates...</span>
                </div>
              ) : hostels.length === 0 ? (
                <div id="no-listings-card" className="bg-[#13161C] rounded-2xl border border-gray-800 py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 mx-auto mb-3">⌂</div>
                  <h3 className="text-sm font-semibold text-white">No Matching Hostels Found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Try adjusting the budget slider, changing the gender filter, or searching for other keywords.
                  </p>
                  <button 
                    onClick={() => {
                      setFilterGender('All');
                      setFilterArea('All');
                      setFilterMaxPrice(12000);
                      setFilterFacilities([]);
                      setSearchVal('');
                    }}
                    className="mt-4 bg-[#1A1D23] border border-gray-700 hover:border-gray-600 text-xs text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
                  >
                    Clear Filter Criteria
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hostels.map((hostel) => {
                    const lowestPrice = hostel.rooms && hostel.rooms.length > 0 
                      ? Math.min(...hostel.rooms.map(r => r.pricePerMonth)) 
                      : 3500;
                    const isFav = myWishlist.some(w => w.id === hostel.id);

                    return (
                      <div 
                        key={hostel.id} 
                        className="bg-[#13161C] rounded-2xl border border-gray-800 overflow-hidden flex flex-col group hover:border-gray-700 transition-all shadow-md hover:shadow-lg"
                      >
                        {/* Image Header with gender and prices */}
                        <div id={`hostel-img-${hostel.id}`} className="h-44 bg-slate-900 relative overflow-hidden">
                          <img 
                            src={hostel.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                            alt="Hostel Exterior"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          
                          {/* Wishlist toggle */}
                          <button
                            onClick={(e) => toggleWishlist(hostel.id, e)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-red-500 transition-all cursor-pointer border border-white/10"
                            title="Add to Wishlist"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                          </button>

                          {/* Gender category Badge */}
                          <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            hostel.type === 'Boys' ? 'bg-blue-600 text-white' : 
                            hostel.type === 'Girls' ? 'bg-pink-600/90 text-white' : 'bg-purple-600 text-white'
                          }`}>
                            {hostel.type} Only
                          </span>

                          {/* Monthly Rent label */}
                          <div id={`price-tag-${hostel.id}`} className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-xs text-white font-mono border border-gray-800">
                            Fr. <strong className="text-blue-400">₹{lowestPrice.toLocaleString('en-IN')}</strong> /mo
                          </div>
                        </div>

                        {/* Description & specs info block */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="text-base font-bold text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors">
                                {hostel.name}
                              </h4>
                              {hostel.averageRating > 0 && (
                                <span className="flex items-center space-x-1 text-yellow-500 text-xs font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded leading-none shrink-0 ml-2">
                                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                  <span>{hostel.averageRating}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                              <MapPin className="w-3.5 h-3.5 text-gray-600 mr-1 shrink-0" />
                              <span className="truncate">{hostel.area}, Gondia</span>
                            </p>

                            <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">
                              {hostel.description}
                            </p>

                            {/* Facilities chips */}
                            <div className="flex flex-wrap gap-1 mt-4">
                              {hostel.facilities.slice(0, 4).map((f) => (
                                <span key={f} className="text-[9px] bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-md text-gray-400 font-mono uppercase tracking-wide">
                                  {f}
                                </span>
                              ))}
                              {hostel.facilities.length > 4 && (
                                <span className="text-[9px] bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded-md text-gray-500 font-mono">
                                  +{hostel.facilities.length - 4}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-gray-800/60 flex items-center gap-2">
                            <button 
                              onClick={() => viewHostelDetails(hostel)}
                              className="w-full bg-[#1A1D23] hover:bg-blue-600 hover:text-white border border-gray-700/80 hover:border-blue-500 text-gray-300 text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <span>Explore Rooms & Book</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ======================= TAB 2: DETAILED HOSTEL INFO & IN-DEPTH SCHEDULING ======================= */}
        {currentTab === 'details' && selectedHostel && (
          <div className="space-y-6">
            
            {/* Back to Catalog trigger */}
            <button 
              onClick={() => { setCurrentTab('browse'); setSelectedHostel(null); }}
              className="px-4 py-1.5 bg-[#13161C] hover:bg-gray-800 border border-gray-800/80 rounded-xl text-xs font-semibold text-gray-300 cursor-pointer transition-colors"
            >
              ← Back to Gondia Hostels catalog
            </button>

            {/* Main detail banner block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Image gallery and review forms */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Images and Basic Information card */}
                <div className="bg-[#13161C] rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="h-[320px] bg-slate-900 relative">
                    <img 
                      src={selectedHostel.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800'} 
                      className="w-full h-full object-cover"
                      alt="Hostel Primary"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    <span className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                      {selectedHostel.type} ONLY
                    </span>

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">★ {selectedHostel.averageRating || 'New'}</span>
                        <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded font-mono">{selectedHostel.area} Area</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight mt-1">{selectedHostel.name}</h2>
                      <p className="text-xs text-gray-300 flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {selectedHostel.address}, {selectedHostel.city}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Hostel Biography</h3>
                      <p className="text-xs text-gray-400 leading-relaxed text-justify">
                        {selectedHostel.description}
                      </p>
                    </div>

                    {/* Hostel Facilities */}
                    <div className="pt-3 border-t border-gray-800/60">
                      <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">Amenities & Security Features</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-400">
                        {selectedHostel.facilities.map((fac) => (
                          <span key={fac} className="flex items-center space-x-1.5 p-2 rounded bg-[#0A0C10] border border-gray-800/60 font-mono text-[10px] uppercase tracking-wide">
                            <span className="text-emerald-500 select-none">✓</span>
                            <span>{fac}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Maps location */}
                    <div className="pt-3 border-t border-gray-800/60 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-400">
                      <div>
                        <strong className="text-white block">Stays Address location Map</strong>
                        <span className="text-[11px] text-gray-500">Kudwa, Near KTS Government Hospital, Gondia</span>
                      </div>
                      <a 
                        href={selectedHostel.googleMapsLocation} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-800/50 py-1.5 px-3 rounded-lg font-semibold transition-colors"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                </div>

                {/* Reviews section */}
                <div className="bg-[#13161C] rounded-2xl border border-gray-800 p-6 space-y-6">
                  
                  <div className="pb-3 border-b border-gray-800/60 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wider uppercase">Verified Guest Reviews ({selectedHostel.reviews?.length || 0})</h3>
                      <p className="text-xs text-gray-500">Real verified student feedback of stays in Gondia</p>
                    </div>
                    {selectedHostel.averageRating > 0 && (
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-yellow-500">★ {selectedHostel.averageRating}</span>
                        <span className="text-[10px] text-gray-500 block">Out of 5 stars</span>
                      </div>
                    )}
                  </div>

                  {/* Submit review Form */}
                  {currentUser ? (
                    <form onSubmit={handleReviewSubmit} className="bg-[#0A0C10] border border-gray-800/60 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-gray-300 uppercase">
                        {editingReviewId ? 'Edit Your Star review & feedback' : 'Share your living experiences here'}
                      </h4>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-400">Score Rating:</span>
                        <div className="flex space-x-1 text-yellow-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="cursor-pointer font-bold focus:outline-none"
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <span className="text-xs text-blue-400 font-mono">({reviewRating} / 5 stars)</span>
                      </div>
                      <div>
                        <textarea
                          placeholder="What did you think of the wifi speed, hygiene standards, mess food quality or safety?"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          required
                          rows={3}
                          className="w-full bg-[#13161C] text-xs text-gray-200 border border-gray-700 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        {editingReviewId && (
                          <button 
                            type="button" 
                            onClick={() => { setEditingReviewId(null); setReviewComment(''); }}
                            className="bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-white font-semibold">
                          {editingReviewId ? 'Save Changes' : 'Submit My review'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="bg-[#0A0C10] border border-gray-800/60 rounded-xl p-4 text-center text-xs">
                      <p className="text-gray-400">Only verified students can submit reviews.</p>
                      <button 
                        onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
                        className="text-blue-500 font-semibold hover:underline mt-1.5"
                      >
                        Login to Add Review
                      </button>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {!selectedHostel.reviews || selectedHostel.reviews.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No reviews published yet for this listing. Be the first to add!</p>
                    ) : (
                      selectedHostel.reviews.map((rev) => {
                        const isAuthor = currentUser?.id === rev.userId;
                        return (
                          <div key={rev.id} className="p-4 rounded-xl border border-gray-800/60 bg-[#0D0F14] space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-bold text-white block">{rev.userName}</span>
                                <span className="text-[10px] text-gray-500 block">{rev.reviewDate}</span>
                              </div>
                              <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded leading-none shrink-0 inline-flex items-center">
                                ★ {rev.rating}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed text-justify italic">
                              "{rev.comment}"
                            </p>
                            {isAuthor && (
                              <div className="flex items-center space-x-2 justify-end pt-1.5 border-t border-gray-800/40">
                                <button 
                                  onClick={() => handleEditReview(rev)}
                                  className="text-[10.5px] text-orange-400 font-medium hover:underline flex items-center space-x-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="text-[10.5px] text-red-400 font-medium hover:underline flex items-center space-x-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </div>

              {/* Right Column: Room selector & Bed Bookings widget drawer */}
              <div id="booking-sidebar" className="lg:col-span-1 space-y-6">
                
                {/* Bed Reservation Module widget */}
                <div className="bg-[#13161C] rounded-2xl border border-gray-800 p-5 self-start">
                  
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-500 block mb-1">Book Your Stay</span>
                  <h3 className="text-base font-bold text-white tracking-tight mb-4">Select Bed Space Tier</h3>

                  {/* Room Categories */}
                  {!selectedHostel.rooms || selectedHostel.rooms.length === 0 ? (
                    <div className="p-4 bg-[#0A0C10] rounded-xl text-center text-xs text-gray-500">
                      There are no room tier details defined for this hostel yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedHostel.rooms.map((room) => {
                        const isSel = selectedRoom?.id === room.id;
                        return (
                          <div 
                            key={room.id}
                            onClick={() => setSelectedRoom(room)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              isSel 
                                ? 'bg-blue-950/20 border-blue-500 text-white' 
                                : 'bg-[#1A1D23] border-gray-800 text-gray-300 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold block">{room.roomType}</span>
                              <span className="text-xs font-mono font-bold text-blue-400">₹{room.pricePerMonth.toLocaleString('en-IN')}/mo</span>
                            </div>

                            <p className="text-[10.5px] text-gray-500 mt-1.5 flex justify-between">
                              <span>Max Capacity: <strong className="text-gray-300">{room.capacity} beds</strong></span>
                              <span>Vacant: <strong className="text-emerald-500">{room.availableBeds} beds available</strong></span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Duration Slider and parameters */}
                  {selectedRoom && (
                    <div className="mt-5 pt-4 border-t border-gray-800 space-y-4">
                      
                      {/* Booking timeline configurations */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Target Start Date</span>
                        </div>
                        <input 
                          type="date"
                          value={bookingStartDate}
                          onChange={(e) => setBookingStartDate(e.target.value)}
                          className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 py-1.5 px-3 text-xs rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Stay Duration</span>
                          <span className="text-gray-300 font-bold">{bookingMonths} Months</span>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="12"
                          value={bookingMonths}
                          onChange={(e) => setBookingMonths(Number(e.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>

                      {/* Pricing Estimate Card breakdown */}
                      <div className="bg-[#0A0C10] rounded-xl p-3 border border-gray-800 text-xs">
                        <div className="flex justify-between py-1 border-b border-gray-800/40">
                          <span className="text-gray-500">Base monthly rent:</span>
                          <span className="font-mono text-gray-300">₹{selectedRoom.pricePerMonth.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-800/40">
                          <span className="text-gray-500">Taxes & Booking fee:</span>
                          <span className="font-mono text-gray-300">₹0 (Zero Brokerage!)</span>
                        </div>
                        <div className="flex justify-between py-1.5 pt-2">
                          <span className="font-bold text-white">Estimated Invoice:</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm">₹{(selectedRoom.pricePerMonth * bookingMonths).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Trigger booking submission */}
                      <div>
                        {selectedRoom.availableBeds > 0 ? (
                          <button
                            onClick={handleBookNow}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <span>Book & Generate Receipt</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-gray-800 border border-gray-700 text-gray-500 text-xs font-semibold py-2.5 rounded-xl cursor-not-allowed"
                          >
                            Occupancy Full
                          </button>
                        )}
                        <p className="text-[10px] text-gray-500 text-center mt-2">
                          Instant automated confirmation. Local support hotline active.
                        </p>
                      </div>

                    </div>
                  )}

                  {/* Owner specs drawer quick view */}
                  <div className="mt-5 pt-4 border-t border-gray-800 flex items-center space-x-3 text-xs text-gray-400">
                    <div className="w-8 h-8 rounded bg-blue-600/10 flex items-center justify-center text-blue-500 font-bold shrink-0">✆</div>
                    <div>
                      <strong className="text-white block">Hostel Owner Assistance</strong>
                      <span className="block font-mono text-[11px] mt-0.5">{selectedHostel.contactNumber}</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        )}

        {/* ===================== SIMULATED PAYMENTS TRANSACTION POPUP/IFRAME MODAL ===================== */}
        {checkoutBooking && (
          <div className="fixed inset-0 z-50 bg-[#0A0C10]/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#13161C] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-6 relative">
              
              <button 
                onClick={() => setCheckoutBooking(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div id="hotel-icon" className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center text-lg mx-auto mb-2">₹</div>
                <h3 className="text-lg font-bold text-white">Gondia Hostels Gateway</h3>
                <p className="text-xs text-gray-500">Proceed to clear booking deposit invoice on encrypted port.</p>
              </div>

              {paymentSuccess === null ? (
                <form id="payment-form" onSubmit={handleCheckoutPayment} className="space-y-4">
                  {/* Summary Invoice */}
                  <div className="bg-[#0A0C10] border border-gray-800 p-4 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stays Title:</span>
                      <strong className="text-white">{checkoutBooking.hostelName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Room Tier Selection:</span>
                      <strong className="text-gray-300">{checkoutBooking.roomType}</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-800/40 text-sm">
                      <span className="text-gray-400 font-semibold">Consolidated Fee:</span>
                      <strong className="text-emerald-400 font-bold font-mono">₹{checkoutBooking.totalAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Card Holder Name</label>
                      <input 
                        type="text"
                        placeholder="John Doe"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Debit/Credit Card Number</label>
                      <input 
                        type="text"
                        placeholder="XXXX XXXX XXXX XXXX"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-[10px] text-gray-500 block mt-1">Hint: Type standard card. To test card decline failures, enter card prefix <span className="font-mono text-red-500">4000 0000</span>.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">MM/YY Expiration</label>
                        <input 
                          type="text"
                          placeholder="12/29"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 text-center font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">CVV Security Code</label>
                        <input 
                          type="password"
                          placeholder="***"
                          required
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 text-center font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={paymentProcessing}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold rounded-xl flex items-center justify-center space-x-1"
                  >
                    {paymentProcessing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing with Gondia Bank...</span>
                      </>
                    ) : (
                      <span>Complete Deposit Transaction</span>
                    )}
                  </button>
                </form>
              ) : paymentSuccess === true ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-xl mx-auto">✓</div>
                  <div>
                    <h3 className="text-md font-bold text-white">Reservations Clear!</h3>
                    <p className="text-xs text-gray-500 mt-1">Hostel bed reserved successfully. Bed Booking ID: {checkoutBooking.id}</p>
                  </div>
                  <div className="bg-[#0A0C10] border border-gray-800 p-3 rounded-xl text-xs font-mono text-left text-gray-400">
                    <span className="block border-b border-gray-800 pb-1 mb-1 font-bold text-white text-[10px]">DIGITAL INDENT RECEIPT</span>
                    <span>Merchant: MH-Gondia Hostels</span><br/>
                    <span>Transaction ID: TXN_GND_{Math.floor(Math.random() * 9000000)}</span><br/>
                    <span>Captured Date: 2026-05-30</span><br/>
                    <span>Bed Approval Status: Approved</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setCheckoutBooking(null); setCurrentTab('dashboard'); }}
                      className="w-full py-2 bg-blue-600 text-xs text-white font-semibold rounded-lg"
                    >
                      Retrieve Booking histories
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-xl mx-auto">!</div>
                  <div>
                    <h3 className="text-md font-bold text-white">Payment Declined</h3>
                    <p className="text-xs text-gray-500 mt-1">Gondia local payment processor was unable to capture credit specifications.</p>
                  </div>
                  <p className="text-xs text-gray-400">Please review card limits or utilize secondary test cards.</p>
                  <button 
                    onClick={() => setPaymentSuccess(null)}
                    className="w-full py-2 bg-gray-800 border border-gray-700 text-xs text-white font-semibold rounded-lg"
                  >
                    Adjust credentials & Retry
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ======================= TAB 3: USER DASHBOARD (STUDENT / OWNER ONLY) ======================= */}
        {currentTab === 'dashboard' && currentUser && (
          <div className="space-y-6">
            
            {/* Minimal banner dashboard header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#13161C] border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center space-x-4">
                <img 
                  src={currentUser.profilePic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                  className="w-12 h-12 rounded-full border border-gray-700 bg-gray-800 object-cover" 
                  alt="avatar"
                />
                <div>
                  <h2 className="text-lg font-bold text-white">{currentUser.name} ({currentUser.role})</h2>
                  <p className="text-xs text-gray-500">Joined our portal on: {currentUser.joinedDate}</p>
                </div>
              </div>
              <button 
                onClick={fetchUserDashboardData}
                className="self-start sm:self-center text-xs bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync parameters</span>
              </button>
            </div>

            {/* Dashboard Content split for Student vs Hostel Owner */}
            {currentUser.role === 'STUDENT' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Bookings history and transactions */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Bookings widget */}
                  <div id="student-bookings" className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-3">Your Booked Stay histories</h3>
                    
                    {myBookings.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">
                        No active stay reservations booked yet. Discover best hostels in Gondia right now.
                        <button onClick={() => setCurrentTab('browse')} className="text-blue-500 block mx-auto mt-2 hover:underline">Browse Listings</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myBookings.map((b) => (
                          <div key={b.id} className="p-4 rounded-xl border border-gray-800 bg-[#0D0F14] text-xs space-y-3">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <h4 className="font-bold text-white text-sm">{b.hostelName}</h4>
                                <span className="text-gray-500">Scheduled: <strong className="text-gray-400">{b.startDate} ({b.durationMonths} Months)</strong></span>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  b.status === 'Approved' ? 'bg-emerald-950/40 text-emerald-400' :
                                  b.status === 'Pending' ? 'bg-orange-950/40 text-orange-400' : 'bg-red-950/40 text-red-400'
                                }`}>
                                  {b.status}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2.5 border-t border-gray-800/60 leading-normal text-gray-400">
                              <div>
                                <span className="text-gray-500 block">Bed tier category</span>
                                <strong>{b.roomType}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Security Fee</span>
                                <strong className="font-mono text-emerald-400">₹{b.totalAmount.toLocaleString('en-IN')}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Payments State</span>
                                <strong className="text-white">{b.paymentStatus}</strong>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Docket ID</span>
                                <span className="font-mono text-[10px] block">{b.id}</span>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800/40">
                              {b.paymentStatus === 'Pending' && (
                                <button 
                                  onClick={() => setCheckoutBooking(b)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1 px-3.5 rounded font-bold"
                                >
                                  Complete Payments
                                </button>
                              )}
                              
                              {b.status === 'Approved' && b.paymentStatus === 'Paid' && (
                                <a 
                                  href={`/api/bookings/${b.id}/receipt`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    // Generate print alert
                                    alert(`Generating Booking Invoice Docket for ${b.hostelName}\nGuest Name: ${b.userName}\nRoom Tier: ${b.roomType}\nConsolidated amount: ₹${b.totalAmount.toLocaleString('en-IN')}\nStatus: Cleared`);
                                  }}
                                  className="bg-[#1A1D23] border border-gray-700 text-gray-300 text-[10px] py-1 px-3 rounded font-bold"
                                >
                                  Print Slip Document
                                </a>
                              )}

                              {b.status !== 'Cancelled' && b.status !== 'Rejected' && (
                                <button 
                                  onClick={() => handleStatusTransition(b.id, 'Cancelled')}
                                  className="text-[10px] text-red-400/90 font-semibold hover:underline"
                                >
                                  Cancel Booking
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Transaction timeline history */}
                  <div className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-3">Deposit Transaction Ledger Receipts</h3>
                    {bookingTransactions.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No payments processed yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {bookingTransactions.map(p => (
                          <div key={p.id} className="p-3 rounded-lg border border-gray-800/60 bg-[#0A0C10] flex justify-between items-center text-xs">
                            <div>
                              <strong className="text-white block">Receipt Voucher: {p.transactionId}</strong>
                              <span className="text-gray-500 text-[10.5px]">Timestamp: {p.paymentDate}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-emerald-400 block font-bold">₹{p.amount.toLocaleString('en-IN')}</span>
                              <span className={`text-[10px] ${p.status === 'Success' ? 'text-emerald-500' : 'text-red-500'}`}>{p.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right side: Notifications & Account parameters */}
                <div id="sidebar-notifications" className="lg:col-span-1 space-y-6">
                  
                  {/* Realtime Alert Board */}
                  <div className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-blue-500 mb-3">Gondia Stay Alerts</h3>
                    
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">You have no new inbox updates.</p>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              n.read 
                                ? 'bg-[#0A0C10] border-gray-800 text-gray-400' 
                                : 'bg-blue-950/20 border-blue-800 text-white font-semibold'
                            }`}
                          >
                            <span className="block font-bold">{n.title}</span>
                            <p className="text-[11px] text-gray-300 mt-1">{n.message}</p>
                            <span className="block text-[9.5px] text-gray-500 mt-1.5">{new Date(n.date).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profile Edit configuration */}
                  <div className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-blue-500 mb-3 block">Update Profile details</h3>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const pName = (e.currentTarget.elements.namedItem('profileName') as HTMLInputElement).value;
                        const pPhone = (e.currentTarget.elements.namedItem('profilePhone') as HTMLInputElement).value;
                        try {
                          await api.updateProfile({ name: pName, phone: pPhone });
                          alert('Profile parameters updated on server!');
                          fetchCurrentUser();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="space-y-3 text-xs"
                    >
                      <div>
                        <label className="text-gray-400 block mb-1">Your Full Name</label>
                        <input 
                          type="text" 
                          name="profileName"
                          placeholder="Your Name"
                          defaultValue={currentUser.name}
                          className="w-full bg-[#0A0C10] border border-gray-800 p-2 text-xs rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">Contact Phone</label>
                        <input 
                          type="text" 
                          name="profilePhone"
                          placeholder="Your Phone"
                          defaultValue={currentUser.phone}
                          className="w-full bg-[#0A0C10] border border-gray-800 p-2 text-xs rounded text-white font-mono"
                        />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 font-bold py-2 rounded text-white cursor-pointer">
                        Save profile specs
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            ) : currentUser.role === 'OWNER' ? (
              <div className="space-y-6">
                
                {/* Metric analytics stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#13161C] border border-gray-800 p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Estimated Revenue bookings</span>
                    <p className="text-3xl font-mono text-white mt-2">₹{ownerStats.revenue.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold tracking-tighter">Approved monthly checks only</p>
                  </div>

                  <div className="bg-[#13161C] border border-gray-800 p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Vacant Beds Registry</span>
                    <p className="text-3xl font-mono text-emerald-400 mt-2">
                      {ownerStats.totalBeds - ownerStats.occupiedBeds} / {ownerStats.totalBeds} Vacant
                    </p>
                    <div className="w-full bg-gray-800 h-1.5 mt-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full" 
                        style={{ width: `${(ownerStats.occupiedBeds / (ownerStats.totalBeds || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-[#13161C] border border-gray-800 p-5 rounded-2xl">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Approvals Occupancy Ratio</span>
                    <p className="text-3xl font-mono text-blue-400 mt-2">
                      {ownerStats.totalBeds > 0 ? Math.round((ownerStats.occupiedBeds / ownerStats.totalBeds) * 100) : 75}%
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Active check-ins in your wings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Manage Hostels listings & Add image assets */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    <div id="listings-manager" className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-800">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Gondia Hostel listings</h3>
                          <p className="text-xs text-gray-500">Draft or live approved properties managed by you</p>
                        </div>
                        <button 
                          onClick={openAddHostel}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer flex items-center space-x-1"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Submit Property</span>
                        </button>
                      </div>

                      {hostels.filter(h => h.ownerId === currentUser.id).length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-500">
                          You have not submitted any lists on our portal yet. Start managing your bookings by listing your hostel.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {hostels.filter(h => h.ownerId === currentUser.id).map(h => (
                            <div key={h.id} className="p-4 rounded-xl border border-gray-800 bg-[#0D0F14] text-xs space-y-4">
                              <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                  <h4 className="font-bold text-white text-sm">{h.name}</h4>
                                  <span className="text-gray-500">Locality: <strong className="text-gray-400">{h.area}, Gondia</strong></span>
                                </div>
                                <div className="text-right">
                                  <span id={`listing-badge-${h.id}`} className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    h.isApproved ? 'bg-emerald-950/40 text-emerald-400' : 'bg-yellow-950/40 text-yellow-500'
                                  }`}>
                                    {h.isApproved ? 'Approved & Web Booking live' : 'Awaiting admin Approval'}
                                  </span>
                                </div>
                              </div>

                              {/* Manage rooms inner config */}
                              <div className="bg-[#0A0C10] border border-gray-800 p-3 rounded-lg space-y-2">
                                <div className="flex justify-between items-center mb-2">
                                  <strong className="text-gray-300">Room tiers specs</strong>
                                  <button 
                                    onClick={() => openAddRoom(h.id)}
                                    className="text-[10px] text-blue-400 font-bold hover:underline"
                                  >
                                    + Add custom room variant
                                  </button>
                                </div>
                                
                                {(!h.rooms || h.rooms.length === 0) ? (
                                  <span className="text-gray-500 block text-[11px] italic">No room templates created. Add single/sharing varieties.</span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {h.rooms.map(room => (
                                      <div key={room.id} className="flex justify-between items-center text-[11px] bg-[#13161C] p-2 rounded border border-gray-800/60 text-gray-400">
                                        <span>{room.roomType} (Capacity: {room.capacity} beds) - <strong>₹{room.pricePerMonth}/mo</strong></span>
                                        <div className="flex space-x-2">
                                          <button 
                                            onClick={() => handleDeleteRoom(room.id)}
                                            className="text-red-400 hover:underline"
                                          >
                                            Wipe
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-800/40 text-xs">
                                <button 
                                  onClick={() => openEditHostel(h)}
                                  className="text-orange-400 hover:underline"
                                >
                                  Edit descriptions
                                </button>
                                <span className="text-gray-700">|</span>
                                <button 
                                  onClick={() => handleDeleteHostel(h.id)}
                                  className="text-red-400 hover:underline"
                                >
                                  Wipe property
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right Column: Manage Reservation Approvals & checks */}
                  <div className="lg:col-span-1 space-y-6">
                    
                    <div id="booking-approvals" className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-3 text-amber-500">Pending Reservations</h3>
                      
                      {myBookings.filter(b => b.status === 'Pending').length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-4">No pending seat reservations awaiting clearance.</p>
                      ) : (
                        <div className="space-y-3">
                          {myBookings.filter(b => b.status === 'Pending').map(b => (
                            <div key={b.id} className="p-3.5 rounded-xl border border-gray-800 bg-[#0A0C10] text-xs space-y-3">
                              <div>
                                <strong className="text-white block">{b.userName}</strong>
                                <span className="text-gray-500 text-[10.5px]">Requested property: <strong className="text-gray-400">{b.hostelName}</strong></span><br/>
                                <span className="text-[10px] text-gray-500">Proposed: {b.startDate} ({b.durationMonths} Months)</span>
                              </div>

                              <div className="flex justify-between items-center text-[10px] bg-[#13161C] p-1.5 rounded border border-gray-800 leading-normal">
                                <span className="text-gray-500">Booking Amount:</span>
                                <strong className="text-emerald-400">₹{b.totalAmount.toLocaleString('en-IN')}</strong>
                              </div>

                              <div className="flex justify-end gap-2 text-xs">
                                <button 
                                  onClick={() => handleStatusTransition(b.id, 'Approved')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded leading-none shrink-0"
                                >
                                  Approve Stay
                                </button>
                                <button 
                                  onClick={() => handleStatusTransition(b.id, 'Rejected')}
                                  className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-900/50 font-bold py-1 px-3 rounded leading-none shrink-0"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Active bookings registers */}
                    <div className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-3 text-emerald-500">Live Active Stays</h3>
                      
                      {myBookings.filter(b => b.status === 'Approved').length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No approved tenants active currently.</p>
                      ) : (
                        <div className="space-y-2">
                          {myBookings.filter(b => b.status === 'Approved').map(b => (
                            <div key={b.id} className="p-3 rounded-lg border border-gray-800/60 bg-[#0A0C10] text-xs">
                              <span className="block font-bold text-white">{b.userName}</span>
                              <span className="text-gray-500 text-[10.5px] block">{b.roomType} in {b.hostelName}</span>
                              <div className="flex justify-between text-[10px] mt-2 pt-1 border-t border-gray-800/40 text-gray-500">
                                <span>Pymt: <strong className="text-emerald-500">{b.paymentStatus}</strong></span>
                                <span>End date: {b.startDate}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            ) : null}

          </div>
        )}

        {/* ======================= TAB 4: ADMIN HUB ======================= */}
        {currentTab === 'admin' && currentUser?.role === 'ADMIN' && adminReports && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white">District Super Admin Center</h2>
                <p className="text-xs text-gray-500">Supervise and moderate Gondia Hostel Listings & account activities</p>
              </div>
              
              {/* Grid selectors */}
              <div className="flex space-x-1 shrink-0 bg-[#13161C] p-1 border border-gray-800 rounded-xl text-xs">
                <button 
                  onClick={() => setActiveAdminSubTab('listings')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${activeAdminSubTab === 'listings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Manage Listings ({adminReports.summary.totalPendingHostels} Pending)
                </button>
                <button 
                  onClick={() => setActiveAdminSubTab('users')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${activeAdminSubTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Manage Accounts ({adminReports.users.length})
                </button>
                <button 
                  onClick={() => setActiveAdminSubTab('reports')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${activeAdminSubTab === 'reports' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  District Report Analytics
                </button>
              </div>
            </div>

            {/* Sub Tab: Approve Listings */}
            {activeAdminSubTab === 'listings' && (
              <div className="bg-[#13161C] border border-gray-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Hostel Listings Moderation Queue</h3>
                
                {adminReports.hostels.length === 0 ? (
                  <p className="text-xs text-gray-500 py-10 text-center">No properties listings added globally yet.</p>
                ) : (
                  <div className="space-y-4">
                    {adminReports.hostels.map((h: Hostel) => (
                      <div key={h.id} className="p-4 rounded-xl border border-gray-800 bg-[#0D0F14] text-xs space-y-3">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <h4 className="font-bold text-white text-sm">{h.name}</h4>
                            <span className="text-gray-500 text-[10.5px]">Owner Profile ID: <strong className="text-gray-400">{h.ownerId}</strong> | Locality: <strong className="text-gray-300">{h.area}, Gondia</strong></span>
                          </div>
                          
                          <div className="text-right flex items-center space-x-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              h.isApproved ? 'bg-emerald-950/40 text-emerald-400' : 'bg-orange-950/40 text-orange-400'
                            }`}>
                              {h.isApproved ? 'Live Listings' : 'Under Review / Draft'}
                            </span>

                            <button
                              onClick={() => handleToggleApprove(h.id, h.isApproved)}
                              className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer font-mono ${
                                h.isApproved ? 'bg-red-950/40 border border-red-900/50 text-red-400' : 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400'
                              }`}
                            >
                              {h.isApproved ? 'Suspend Web Access' : 'Approve Listings'}
                            </button>
                          </div>
                        </div>

                        <p className="text-gray-400 text-justify italic">"{h.description}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub Tab: Manage Accounts */}
            {activeAdminSubTab === 'users' && (
              <div className="bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-4">Gondia Student & Owner Accounts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-400">
                    <thead className="bg-[#0A0C10] text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="p-3">User profile</th>
                        <th className="p-3">Security Category</th>
                        <th className="p-3">Email address</th>
                        <th className="p-3">Registered on</th>
                        <th className="p-3 text-right">Moderations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {adminReports.users.map((usr: UserType) => (
                        <tr key={usr.id} className="hover:bg-[#0D0F14]/60">
                          <td className="p-4 flex items-center space-x-3">
                            <img src={usr.profilePic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} className="w-7 h-7 rounded-full bg-slate-800 border border-gray-800" alt="" />
                            <span className="font-bold text-white">{usr.name}</span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold ${
                              usr.role === 'ADMIN' ? 'bg-red-950/40 text-red-500' :
                              usr.role === 'OWNER' ? 'bg-amber-950/40 text-amber-500' : 'bg-blue-950/40 text-blue-500'
                            }`}>
                              {usr.role}
                            </span>
                          </td>
                          <td className="p-4 font-mono select-all text-[11px]">{usr.email}</td>
                          <td className="p-4 text-[10.5px]">{usr.joinedDate}</td>
                          <td className="p-4 text-right">
                            {usr.role !== 'ADMIN' && (
                              <button 
                                onClick={() => handleAdminDeleteUser(usr.id)}
                                className="text-red-400 hover:underline flex items-center justify-center space-x-1 text-[11px] font-medium ml-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Purge user activity</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub Tab: District Reports */}
            {activeAdminSubTab === 'reports' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Aggregate summaries */}
                <div className="lg:col-span-1 bg-[#13161C] border border-gray-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-blue-500">Reservations Analytics</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-[#0A0C10] p-3 rounded-lg border border-gray-800">
                      <span className="text-gray-500 block leading-tight">Pending Approval</span>
                      <strong className="text-lg text-orange-400 mt-1 block">{adminReports.bookingsByStatus.Pending || 0}</strong>
                    </div>
                    <div className="bg-[#0A0C10] p-3 rounded-lg border border-gray-800">
                      <span className="text-gray-500 block leading-tight">Approved/Live</span>
                      <strong className="text-lg text-emerald-400 mt-1 block">{adminReports.bookingsByStatus.Approved || 0}</strong>
                    </div>
                    <div className="bg-[#0A0C10] p-3 rounded-lg border border-gray-800">
                      <span className="text-gray-500 block leading-tight">Cancelled stays</span>
                      <strong className="text-lg text-gray-400 mt-1 block">{adminReports.bookingsByStatus.Cancelled || 0}</strong>
                    </div>
                    <div className="bg-[#0A0C10] p-3 rounded-lg border border-gray-800">
                      <span className="text-gray-500 block leading-tight">Aggregate Revenue</span>
                      <strong className="text-lg text-blue-400 mt-1 block">₹{adminReports.summary.totalRevenue.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="bg-[#0A0C10] p-4 rounded-xl border border-gray-800/60 text-xs text-gray-400 leading-relaxed text-justify">
                    <strong>Administrative Note:</strong> Market occupancy rates inside Gondia district peak during June corresponding to Gondia College registrations and engineering admissions. Verify and authorize listings promptly.
                  </div>
                </div>

                {/* SVG Revenue analytics chart */}
                <div id="analytics-chart" className="lg:col-span-2 bg-[#13161C] border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-blue-500 mb-4 block">District Revenue aggregation (Aggregated Monthly trends)</h3>
                  
                  <div className="h-48 flex items-end justify-between bg-[#0A0C10] p-6 rounded-xl border border-gray-800 relative">
                    <div className="absolute top-3 left-4 text-[10.5px] text-gray-500 font-mono">₹ Values aggregate tally list:</div>
                    
                    {/* SVG representation bars */}
                    <div className="flex-1 flex items-end justify-around h-full pt-6">
                      <div className="flex flex-col items-center space-y-1.5 h-full justify-end">
                        <div className="w-12 bg-blue-600 rounded-t shadow-md h-[40%] text-center p-0.5"><span className="text-[10px] font-bold text-white">40k</span></div>
                        <span className="text-[10.5px] text-gray-500 font-mono">March</span>
                      </div>
                      <div className="flex flex-col items-center space-y-1.5 h-full justify-end">
                        <div className="w-12 bg-blue-600 rounded-t shadow-md h-[55%] text-center p-0.5"><span className="text-[10px] font-bold text-white">55k</span></div>
                        <span className="text-[10.5px] text-gray-500 font-mono">April</span>
                      </div>
                      <div className="flex flex-col items-center space-y-1.5 h-full justify-end">
                        <div className="w-12 bg-emerald-600 rounded-t shadow-md h-[88%] text-center p-0.5"><span className="text-[10px] font-bold text-white">88k</span></div>
                        <span className="text-[10.5px] text-gray-400 font-mono font-bold">May (Live)</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ======================= TAB 5: STUDENT WISHLIST ======================= */}
        {currentTab === 'wishlist' && currentUser?.role === 'STUDENT' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Your Wishlisted Hostels</h2>
            <p className="text-xs text-gray-500">Stays in Gondia you marked as favorite for future semesters</p>

            {myWishlist.length === 0 ? (
              <div className="bg-[#13161C] border border-gray-800 rounded-2xl py-12 px-4 text-center text-xs text-gray-500">
                You have not marked any stays of Gondia into your wishlist yet.
                <button onClick={() => setCurrentTab('browse')} className="text-blue-500 block mx-auto mt-2 hover:underline">Explore matching hotels</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myWishlist.map((hostel) => (
                  <div 
                    key={hostel.id} 
                    onClick={() => viewHostelDetails(hostel)}
                    className="bg-[#13161C] rounded-2xl border border-gray-800 p-5 hover:border-gray-700 transition-all cursor-pointer flex space-x-4 items-center"
                  >
                    <img 
                      src={hostel.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800'} 
                      className="w-16 h-16 rounded-lg object-cover bg-gray-800" 
                      alt=""
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{hostel.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{hostel.area}, Gondia</p>
                      <span className="text-[10px] uppercase font-bold text-blue-400">{hostel.type} Accommodations</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto bg-[#13161C] border-t border-gray-800 py-6 text-center text-xs text-gray-500 leading-normal">
        <p className="max-w-md mx-auto">
          Online Hostel Management System for Gondia, Maharashtra, India. Fully JWT Security authorized database sandbox environment. Built for Student welfare.
        </p>
        <p id="copyright-text" className="mt-2 text-[10.5px]">
          &copy; 2026 GondiaHostels. All rights reserved. Zero Brokerage Guaranteed.
        </p>
      </footer>

      {/* AUTHENTICATION REGISTER/SIGNIN MODAL */}
      {isAuthModalOpen && (
        <div id="auth-modal" className="fixed inset-0 z-50 bg-[#0A0C10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161C] border border-gray-800 rounded-2xl max-w-sm w-full p-6 relative">
            
            <button 
              onClick={() => { setIsAuthModalOpen(false); setAuthError(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <span className="text-xs font-extrabold uppercase text-blue-500 tracking-wider">Stay security pass</span>
              <h3 className="text-lg font-bold text-white mt-1">
                {authMode === 'login' ? 'Access Gondia App' : 'Create Student account'}
              </h3>
            </div>

            {authError && (
              <span id="auth-error-msg" className="block p-2.5 mb-4 bg-red-950/40 border border-red-900/50 text-red-400 rounded text-[11px] font-mono leading-normal">
                {authError}
              </span>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-gray-400 block mb-1">Your Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Kiran Rahangdale"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Contact Handphone Number</label>
                    <input 
                      type="text" 
                      placeholder="+91 XXXXX XXXXX"
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-gray-400 block mb-1">Official Password address</label>
                <input 
                  type="email" 
                  placeholder="name@gondia.com"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Key credentials password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Select Access profile role</label>
                <select 
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value as any)}
                  className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs"
                >
                  <option value="STUDENT">Student Accommodant</option>
                  <option value="OWNER">Hostel Owner / Manager</option>
                  <option value="ADMIN">District Super Admin</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
              >
                {authMode === 'login' ? 'Confirm Login' : 'Register Account'}
              </button>

            </form>

            <div className="text-center mt-5 pt-4 border-t border-gray-800/60 text-xs text-gray-500">
              {authMode === 'login' ? (
                <p>
                  New to Gondia Hostels?{' '}
                  <button 
                    onClick={() => setAuthMode('register')}
                    className="text-blue-500 font-semibold hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p>
                  Already have stay keys?{' '}
                  <button 
                    onClick={() => setAuthMode('login')}
                    className="text-blue-500 font-semibold hover:underline"
                  >
                    Authenticate
                  </button>
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* OWNER: SUBMIT/EDIT HOSTEL LISTINGS SHEET */}
      {isListingModalOpen && (
        <div id="hostel-form-modal" className="fixed inset-0 z-50 bg-[#0A0C10]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#13161C] border border-gray-800 rounded-2xl max-w-lg w-full p-6 relative">
            
            <button 
              onClick={() => setIsListingModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white">
                {editingHostelId ? 'Modify Hostel parameters' : 'List New Gondia Hostel'}
              </h3>
              <p className="text-xs text-gray-400">Provide details for student occupancy evaluations.</p>
            </div>

            <form onSubmit={handleSaveHostel} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Hostel name</label>
                  <input 
                    type="text" 
                    required
                    value={hostelForm.name}
                    onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Accommodant Demography</label>
                  <select 
                    value={hostelForm.type}
                    onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value as any })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                  >
                    <option value="Boys">Boys Accommodations</option>
                    <option value="Girls">Girls Accommodations</option>
                    <option value="Co-Ed">Co-Ed Shared Wing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Locality Area</label>
                  <select 
                    value={hostelForm.area}
                    onChange={(e) => setHostelForm({ ...hostelForm, area: e.target.value })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                  >
                    {AREAS.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Full Postal address</label>
                  <input 
                    type="text" 
                    required
                    value={hostelForm.address}
                    onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Detail description for student catalog</label>
                <textarea 
                  required
                  rows={2}
                  value={hostelForm.description}
                  onChange={(e) => setHostelForm({ ...hostelForm, description: e.target.value })}
                  className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Contact Phone</label>
                  <input 
                    type="text" 
                    required
                    value={hostelForm.contactNumber}
                    onChange={(e) => setHostelForm({ ...hostelForm, contactNumber: e.target.value })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Official Emails</label>
                  <input 
                    type="email" 
                    required
                    value={hostelForm.email}
                    onChange={(e) => setHostelForm({ ...hostelForm, email: e.target.value })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Check Facilities included</label>
                <div className="grid grid-cols-3 gap-2 bg-[#0A0C10] p-3 rounded border border-gray-800">
                  {FACILITIES_LIST.map(fac => {
                    const checked = hostelForm.facilities.includes(fac);
                    return (
                      <label key={fac} className="flex items-center text-gray-400 hover:text-white cursor-pointer text-[10.5px]">
                        <input 
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setHostelForm({ ...hostelForm, facilities: hostelForm.facilities.filter(f => f !== fac) });
                            } else {
                              setHostelForm({ ...hostelForm, facilities: [...hostelForm.facilities, fac] });
                            }
                          }}
                          className="mr-1.5 focus:ring-0"
                        />
                        <span>{fac}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded">
                Confirm Listing Specifications
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OWNER: LIST ROOM TYPE TEMPLATE */}
      {isRoomModalOpen && (
        <div id="room-form-modal" className="fixed inset-0 z-50 bg-[#0A0C10]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13161C] border border-gray-800 rounded-2xl max-w-sm w-full p-6 relative">
            
            <button 
              onClick={() => setIsRoomModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white">Add Pricing bed Variant</h3>
              <p className="text-xs text-gray-400 font-mono">Hostel reference ID: {selectedHostelForRoom}</p>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Room classification code / descriptive name</label>
                <input 
                  type="text" 
                  placeholder="Double Deluxe sharing / Single AC Wing"
                  required
                  value={roomForm.roomType}
                  onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                  className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Max Bed Capacity</label>
                  <input 
                    type="number" 
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Available beds</label>
                  <input 
                    type="number" 
                    required
                    value={roomForm.availableBeds}
                    onChange={(e) => setRoomForm({ ...roomForm, availableBeds: Number(e.target.value) })}
                    className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Monthly Pricing (₹ Rent / month)</label>
                <input 
                  type="number" 
                  required
                  value={roomForm.pricePerMonth}
                  onChange={(e) => setRoomForm({ ...roomForm, pricePerMonth: Number(e.target.value) })}
                  className="w-full bg-[#1A1D23] text-gray-200 border border-gray-800 p-2 rounded font-mono"
                />
              </div>

              <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded">
                Save Rooms Variant
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
