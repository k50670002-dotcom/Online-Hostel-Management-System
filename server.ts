/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

const dbPath = path.join(process.cwd(), 'database.json');

// Database Read/Write Utility
function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      // Create with fallback empty schema if missing
      const emptySchema = {
        users: [],
        hostels: [],
        rooms: [],
        bookings: [],
        payments: [],
        reviews: [],
        wishlists: [],
        notifications: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(emptySchema, null, 2), 'utf8');
      return emptySchema;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database.json:', error);
    return {
      users: [],
      hostels: [],
      rooms: [],
      bookings: [],
      payments: [],
      reviews: [],
      wishlists: [],
      notifications: []
    };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database.json:', error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Log Requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // ==========================================
  // API ENDPOINTS
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // ------------------------------------------
  // AUTHENTICATION APIs
  // ------------------------------------------
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }

    const db = readDb();
    const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = {
      id: generateId('u'),
      name,
      email: email.toLowerCase(),
      role,
      phone: phone || '',
      profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);
    writeDb(db);

    res.status(201).json({
      message: 'Registration successful',
      user: newUser,
      token: `mock-jwt-token-for-${newUser.id}`
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = readDb();
    const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Role verification (if supplied, match it to prevent wrong dashboard entry)
    if (role && user.role !== role) {
      return res.status(403).json({ error: `Not registered as a ${role}` });
    }

    res.json({
      message: 'Login successful',
      user,
      token: `mock-jwt-token-for-${user.id}`
    });
  });

  // Get current user session via Authorization header
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    const userId = token.replace('mock-jwt-token-for-', '');

    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'User session not found' });
    }

    res.json(user);
  });

  // Profile Update
  app.put('/api/auth/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const { name, phone, profilePic } = req.body;

    const db = readDb();
    const userIndex = db.users.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users[userIndex] = {
      ...db.users[userIndex],
      name: name || db.users[userIndex].name,
      phone: phone !== undefined ? phone : db.users[userIndex].phone,
      profilePic: profilePic || db.users[userIndex].profilePic
    };

    writeDb(db);
    res.json({ message: 'Profile updated successfully', user: db.users[userIndex] });
  });

  // ------------------------------------------
  // HOSTEL APIs
  // ------------------------------------------

  // GET ALL HOSTELS (with query filtering)
  app.get('/api/hostels', (req, res) => {
    const db = readDb();
    let results = [...db.hostels];

    const { area, type, wifi, ac, laundry, parking, mess, security, maxPrice, search, onlyApproved } = req.query;

    // Apply Live Search (by name, area, address)
    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(h => 
        h.name.toLowerCase().includes(q) || 
        h.area.toLowerCase().includes(q) || 
        h.address.toLowerCase().includes(q)
      );
    }

    // Filter by Area
    if (area) {
      results = results.filter(h => h.area.toLowerCase() === String(area).toLowerCase());
    }

    // Filter by Hostel Type (Boys, Girls, Co-Ed)
    if (type) {
      results = results.filter(h => h.type.toLowerCase() === String(type).toLowerCase());
    }

    // Filter by Facilities
    if (wifi === 'true') results = results.filter(h => h.facilities.includes('WiFi'));
    if (ac === 'true') results = results.filter(h => h.facilities.includes('AC'));
    if (laundry === 'true') results = results.filter(h => h.facilities.includes('Laundry'));
    if (parking === 'true') results = results.filter(h => h.facilities.includes('Parking'));
    if (mess === 'true') results = results.filter(h => h.facilities.includes('Mess Facility'));
    if (security === 'true') results = results.filter(h => h.facilities.includes('Security') || h.facilities.includes('CCTV'));

    // Filter by Approved (non-admins generally only see approved; admins see all)
    // By default, let's filter for Guest and Students (onlyApproved=true)
    if (onlyApproved === 'true') {
      results = results.filter(h => h.isApproved === true);
    }

    // Hydrate each hostel with its Rooms for price filtering and listings
    const hydratedResults = results.map(h => {
      const rooms = db.rooms.filter((r: any) => r.hostelId === h.id);
      return { ...h, rooms };
    });

    // Filter by Max Price
    if (maxPrice) {
      const budget = Number(maxPrice);
      results = results.filter(h => {
        const rooms = db.rooms.filter((r: any) => r.hostelId === h.id);
        const minPrice = rooms.length > 0 ? Math.min(...rooms.map((r: any) => r.pricePerMonth)) : Number.MAX_VALUE;
        return minPrice <= budget;
      });
    }

    // Double hydration before sending final
    const finalResults = results.map(h => {
      const rooms = db.rooms.filter((r: any) => r.hostelId === h.id);
      return { ...h, rooms };
    });

    res.json(finalResults);
  });

  // GET SINGLE HOSTEL
  app.get('/api/hostels/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const hostel = db.hostels.find((h: any) => h.id === id);

    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    const rooms = db.rooms.filter((r: any) => r.hostelId === id);
    const reviews = db.reviews.filter((rev: any) => rev.hostelId === id);

    res.json({
      ...hostel,
      rooms,
      reviews
    });
  });

  // POST CREATE HOSTEL (Owner)
  app.post('/api/hostels', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const ownerId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const { name, type, address, area, googleMapsLocation, description, contactNumber, email, facilities, images } = req.body;

    if (!name || !type || !address || !area || !contactNumber || !email) {
      return res.status(400).json({ error: 'Missing required hostel information' });
    }

    const hId = generateId('h');
    const newHostel = {
      id: hId,
      name,
      type,
      address,
      city: 'Gondia',
      area,
      googleMapsLocation: googleMapsLocation || `https://maps.google.com/?q=${encodeURIComponent(name + ' Gondia')}`,
      description: description || 'No description provided.',
      contactNumber,
      email,
      facilities: facilities || [],
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=800'],
      ownerId,
      averageRating: 0,
      isApproved: false // Requires admin approval
    };

    const db = readDb();
    db.hostels.push(newHostel);
    writeDb(db);

    res.status(201).json({ message: 'Hostel submitted successfully. Awaiting Admin Approval.', hostel: newHostel });
  });

  // PUT EDIT HOSTEL (Owner)
  app.put('/api/hostels/:id', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const ownerId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const index = db.hostels.findIndex((h: any) => h.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    // Enforce owner / admin permission
    const user = db.users.find((u: any) => u.id === ownerId);
    if (db.hostels[index].ownerId !== ownerId && user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You do not own this hostel listing' });
    }

    const { name, type, address, area, googleMapsLocation, description, contactNumber, email, facilities, images } = req.body;

    db.hostels[index] = {
      ...db.hostels[index],
      name: name || db.hostels[index].name,
      type: type || db.hostels[index].type,
      address: address || db.hostels[index].address,
      area: area || db.hostels[index].area,
      googleMapsLocation: googleMapsLocation || db.hostels[index].googleMapsLocation,
      description: description || db.hostels[index].description,
      contactNumber: contactNumber || db.hostels[index].contactNumber,
      email: email || db.hostels[index].email,
      facilities: facilities || db.hostels[index].facilities,
      images: images || db.hostels[index].images
    };

    writeDb(db);
    res.json({ message: 'Hostel listing updated successfully', hostel: db.hostels[index] });
  });

  // DELETE HOSTEL (Owner)
  app.delete('/api/hostels/:id', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const ownerId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const index = db.hostels.findIndex((h: any) => h.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Hostel not found' });
    }

    const user = db.users.find((u: any) => u.id === ownerId);
    if (db.hostels[index].ownerId !== ownerId && user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove accompanying rooms as well
    db.hostels.splice(index, 1);
    db.rooms = db.rooms.filter((r: any) => r.hostelId !== id);

    writeDb(db);
    res.json({ message: 'Hostel and all associated rooms deleted successfully' });
  });

  // ADMIN ENDPOINT: APPROVE HOSTEL LISTING
  app.post('/api/hostels/:id/approve', (req, res) => {
    const { id } = req.params;
    const { isApproved } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const adminId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const user = db.users.find((u: any) => u.id === adminId);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin clearance required' });
    }

    const hostelIndex = db.hostels.findIndex((h: any) => h.id === id);
    if (hostelIndex === -1) {
      return res.status(404).json({ error: 'Hostel listing not found' });
    }

    db.hostels[hostelIndex].isApproved = isApproved;
    
    // Add a receipt notification to the owner
    const newNotif = {
      id: generateId('n'),
      userId: db.hostels[hostelIndex].ownerId,
      title: isApproved ? 'Listings Approved!' : 'Listings Revision Requested',
      message: `Your Gondia hostel listing "${db.hostels[hostelIndex].name}" is now ${isApproved ? 'Live & Web Bookable!' : 'placed back into Draft.'}`,
      date: new Date().toISOString(),
      read: false
    };
    db.notifications.push(newNotif);
    
    writeDb(db);
    res.json({ message: `Hostel listing successfully ${isApproved ? 'approved' : 'rejected'}.`, hostel: db.hostels[hostelIndex] });
  });

  // ------------------------------------------
  // ROOM APIs
  // ------------------------------------------

  // ADD ROOM (Owner)
  app.post('/api/hostels/:hostelId/rooms', (req, res) => {
    const { hostelId } = req.params;
    const { roomType, capacity, pricePerMonth, availableBeds, images } = req.body;

    if (!roomType || !capacity || !pricePerMonth || availableBeds === undefined) {
      return res.status(400).json({ error: 'Missing required room specs' });
    }

    const db = readDb();
    const hostel = db.hostels.find((h: any) => h.id === hostelId);
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel listing not found' });
    }

    const newRoom = {
      id: generateId('r'),
      hostelId,
      roomType,
      capacity: Number(capacity),
      pricePerMonth: Number(pricePerMonth),
      availableBeds: Number(availableBeds),
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&q=80&w=500']
    };

    db.rooms.push(newRoom);
    writeDb(db);

    res.status(201).json({ message: 'Room added successfully', room: newRoom });
  });

  // EDIT ROOM Specs
  app.put('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const { roomType, capacity, pricePerMonth, availableBeds, images } = req.body;

    const db = readDb();
    const roomIndex = db.rooms.findIndex((r: any) => r.id === roomId);

    if (roomIndex === -1) {
      return res.status(404).json({ error: 'Room specs not found' });
    }

    db.rooms[roomIndex] = {
      ...db.rooms[roomIndex],
      roomType: roomType || db.rooms[roomIndex].roomType,
      capacity: capacity !== undefined ? Number(capacity) : db.rooms[roomIndex].capacity,
      pricePerMonth: pricePerMonth !== undefined ? Number(pricePerMonth) : db.rooms[roomIndex].pricePerMonth,
      availableBeds: availableBeds !== undefined ? Number(availableBeds) : db.rooms[roomIndex].availableBeds,
      images: images || db.rooms[roomIndex].images
    };

    writeDb(db);
    res.json({ message: 'Room specs updated', room: db.rooms[roomIndex] });
  });

  // DELETE ROOM
  app.delete('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    const db = readDb();
    const index = db.rooms.findIndex((r: any) => r.id === roomId);

    if (index === -1) {
      return res.status(404).json({ error: 'Room specs not found' });
    }

    db.rooms.splice(index, 1);
    writeDb(db);
    res.json({ message: 'Room deleted successfully' });
  });

  // ------------------------------------------
  // BOOKINGS & TRANSACTION GATEWAY
  // ------------------------------------------

  // GET SPECIFIC ROLES BOOKINGS
  app.get('/api/bookings', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'User session not found' });
    }

    if (user.role === 'ADMIN') {
      // Admin sees absolutely everything
      return res.json(db.bookings);
    } else if (user.role === 'OWNER') {
      // Owners see bookings of hostels owned by them
      const ownerHostelIds = db.hostels.filter((h: any) => h.ownerId === userId).map((h: any) => h.id);
      const ownerBookings = db.bookings.filter((b: any) => ownerHostelIds.includes(b.hostelId));
      return res.json(ownerBookings);
    } else {
      // Students see their own bookings
      const studentBookings = db.bookings.filter((b: any) => b.userId === userId);
      return res.json(studentBookings);
    }
  });

  // CREATE BED / ROOM BOOKING (Student)
  app.post('/api/bookings', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const studentId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const { hostelId, roomId, bookingType, startDate, durationMonths } = req.body;

    if (!hostelId || !roomId || !bookingType || !startDate || !durationMonths) {
      return res.status(400).json({ error: 'Missing booking configuration params' });
    }

    const db = readDb();
    const student = db.users.find((u: any) => u.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student account not found' });

    const hostel = db.hostels.find((h: any) => h.id === hostelId);
    if (!hostel) return res.status(404).json({ error: 'Hostel listing not found' });

    const roomIndex = db.rooms.findIndex((r: any) => r.id === roomId);
    if (roomIndex === -1) return res.status(404).json({ error: 'Room specs not found' });

    // Enforce live bed check
    if (db.rooms[roomIndex].availableBeds <= 0) {
      return res.status(400).json({ error: 'No beds currently vacant in this room tier.' });
    }

    // Deduct available bed vacancy
    db.rooms[roomIndex].availableBeds -= 1;

    const totalAmount = Number(db.rooms[roomIndex].pricePerMonth) * Number(durationMonths);
    const bookingId = generateId('b');

    const newBooking = {
      id: bookingId,
      userId: studentId,
      userName: student.name,
      userEmail: student.email,
      hostelId,
      hostelName: hostel.name,
      hostelType: hostel.type,
      roomId,
      roomType: db.rooms[roomIndex].roomType,
      pricePerMonth: db.rooms[roomIndex].pricePerMonth,
      bookingType,
      startDate,
      durationMonths: Number(durationMonths),
      totalAmount,
      status: 'Pending', // Pending owner approval
      bookingDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'Pending'
    };

    db.bookings.push(newBooking);

    // Notification for hostel owner
    const newNotif = {
      id: generateId('n'),
      userId: hostel.ownerId,
      title: 'New Booking Request',
      message: `${student.name} is requesting a ${bookingType} booking. Total Estimate: ₹${totalAmount.toLocaleString('en-IN')}`,
      date: new Date().toISOString(),
      read: false
    };
    db.notifications.push(newNotif);

    writeDb(db);
    res.status(201).json({ message: 'Reservation secured. Please proceeds to payments.', booking: newBooking });
  });

  // UPDATE BOOKING STATUS (Owner approval / cancellation)
  app.put('/api/bookings/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Approved, Rejected, Cancelled, Completed
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userSessionId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const bIndex = db.bookings.findIndex((b: any) => b.id === id);

    if (bIndex === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = db.bookings[bIndex];
    const user = db.users.find((u: any) => u.id === userSessionId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate permission (Only hostel owner or admin can approve/reject, student can cancel his own)
    const hostel = db.hostels.find((h: any) => h.id === booking.hostelId);
    const isOwner = hostel && hostel.ownerId === userSessionId;
    const isAdmin = user.role === 'ADMIN';
    const isStudentApplicant = booking.userId === userSessionId;

    if (!isOwner && !isAdmin && !isStudentApplicant) {
      return res.status(403).json({ error: 'Forbidden: You do not have permissions to alter status' });
    }

    if ((status === 'Approved' || status === 'Rejected') && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only owners or admins can Approve/Reject bookings' });
    }

    // Capture state check for vacant beds compensation
    // If transitioning to Rejected, Cancelled, return bed vacancy
    const originalStatus = booking.status;
    db.bookings[bIndex].status = status;

    if ((status === 'Cancelled' || status === 'Rejected') && originalStatus !== 'Cancelled' && originalStatus !== 'Rejected') {
      const roomIndex = db.rooms.findIndex((r: any) => r.id === booking.roomId);
      if (roomIndex !== -1) {
        db.rooms[roomIndex].availableBeds += 1;
      }
    }

    // Also alert corresponding user of confirmation via notification
    const recipientId = isStudentApplicant ? hostel.ownerId : booking.userId;
    const alertMessage = {
      id: generateId('n'),
      userId: recipientId,
      title: `Booking Status: ${status}`,
      message: `The booking for "${booking.hostelName}" [Booking ID: ${booking.id}] has been marked as ${status}.`,
      date: new Date().toISOString(),
      read: false
    };
    db.notifications.push(alertMessage);

    // If payment was made and booking gets cancelled/rejected, fake refunds notification
    if (status === 'Cancelled' && booking.paymentStatus === 'Paid') {
      const pIndex = db.payments.findIndex((p: any) => p.bookingId === booking.id);
      if (pIndex !== -1) {
        db.payments[pIndex].refunded = true;
      }
    }

    writeDb(db);
    res.json({ message: `Booking status updated to ${status}`, booking: db.bookings[bIndex] });
  });

  // ------------------------------------------
  // PAYMENTS GATEWAY APIs
  // ------------------------------------------
  app.get('/api/payments', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);

    if (!user) return res.status(404).json({ error: 'User session not found' });

    if (user.role === 'ADMIN') {
      res.json(db.payments);
    } else if (user.role === 'OWNER') {
      const hostelsOwned = db.hostels.filter((h: any) => h.ownerId === userId).map((h: any) => h.id);
      const hostalBookings = db.bookings.filter((b: any) => hostelsOwned.includes(b.hostelId)).map((b: any) => b.id);
      res.json(db.payments.filter((p: any) => hostalBookings.includes(p.bookingId)));
    } else {
      res.json(db.payments.filter((p: any) => p.userId === userId));
    }
  });

  // PROCESS DUMMY PAYMENT
  app.post('/api/payments/process', (req, res) => {
    const { bookingId, amount, paymentMethod, cardNumber } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const studentId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Missing invoice booking or pricing' });
    }

    const db = readDb();
    const student = db.users.find((u: any) => u.id === studentId);
    if (!student) return res.status(404).json({ error: 'User session invalid' });

    const bIndex = db.bookings.findIndex((b: any) => b.id === bookingId);
    if (bIndex === -1) {
      return res.status(404).json({ error: 'Target booking not found' });
    }

    // Fail safe: If payment is failing for certain cards for demonstration
    const isSuccess = !(cardNumber && cardNumber.startsWith('4000 0000')); // Prearranged failure code

    const txnId = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const paymentId = generateId('p');

    const newPayment = {
      id: paymentId,
      bookingId,
      userId: studentId,
      userName: student.name,
      amount: Number(amount),
      paymentDate: new Date().toISOString().split('T')[0],
      status: isSuccess ? 'Success' : 'Failure',
      transactionId: txnId,
      refunded: false
    };

    db.payments.push(newPayment);

    if (isSuccess) {
      db.bookings[bIndex].paymentStatus = 'Paid';
      db.bookings[bIndex].paymentId = paymentId;

      // Automatically approve booking (or keep pending, but standard payment usually facilitates approval updates!)
      db.bookings[bIndex].status = 'Approved';

      // Alert notification to user
      db.notifications.push({
        id: generateId('n'),
        userId: studentId,
        title: 'Payment Successful',
        message: `Your payment of ₹${Number(amount).toLocaleString('en-IN')} for Booking ${bookingId} was captured successfully. Txn ID: ${txnId}`,
        date: new Date().toISOString(),
        read: false
      });
    } else {
      db.bookings[bIndex].paymentStatus = 'Failed';
      db.notifications.push({
        id: generateId('n'),
        userId: studentId,
        title: 'Payment Transaction Failed',
        message: `Declined transaction with merchant gateway. Please review credentials for Booking ID ${bookingId}.`,
        date: new Date().toISOString(),
        read: false
      });
    }

    writeDb(db);
    res.json({
      status: isSuccess ? 'SUCCESS' : 'FAILURE',
      payment: newPayment
    });
  });

  // ------------------------------------------
  // REVIEW APIs
  // ------------------------------------------

  // SUBMIT REVIEW
  app.post('/api/reviews', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const { hostelId, rating, comment } = req.body;

    if (!hostelId || rating === undefined || !comment) {
      return res.status(400).json({ error: 'Hostel ID, Star Rating, and Comment required' });
    }

    const db = readDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User session not found' });

    const newReview = {
      id: generateId('rev'),
      hostelId,
      userId,
      userName: user.name,
      rating: Number(rating),
      comment,
      reviewDate: new Date().toISOString().split('T')[0]
    };

    db.reviews.push(newReview);

    // Recalculate Average Rating for Hostel
    const hostelReviews = db.reviews.filter((r: any) => r.hostelId === hostelId);
    const sum = hostelReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
    const avg = parseFloat((sum / hostelReviews.length).toFixed(1));

    const hIndex = db.hostels.findIndex((h: any) => h.id === hostelId);
    if (hIndex !== -1) {
      db.hostels[hIndex].averageRating = avg;
    }

    writeDb(db);
    res.status(201).json({ message: 'Review published successfully', review: newReview, averageRating: avg });
  });

  // EDIT REVIEW
  app.put('/api/reviews/:id', (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const revIndex = db.reviews.findIndex((r: any) => r.id === id);

    if (revIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (db.reviews[revIndex].userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to edit someone else\'s review' });
    }

    db.reviews[revIndex].rating = rating !== undefined ? Number(rating) : db.reviews[revIndex].rating;
    db.reviews[revIndex].comment = comment || db.reviews[revIndex].comment;
    db.reviews[revIndex].reviewDate = new Date().toISOString().split('T')[0];

    // Recalc
    const hostelId = db.reviews[revIndex].hostelId;
    const hostelReviews = db.reviews.filter((r: any) => r.hostelId === hostelId);
    const sum = hostelReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
    const avg = parseFloat((sum / hostelReviews.length).toFixed(1));

    const hIndex = db.hostels.findIndex((h: any) => h.id === hostelId);
    if (hIndex !== -1) {
      db.hostels[hIndex].averageRating = avg;
    }

    writeDb(db);
    res.json({ message: 'Review updated successfully', review: db.reviews[revIndex], averageRating: avg });
  });

  // DELETE REVIEW (Owner / Admin / Author)
  app.delete('/api/reviews/:id', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const revIndex = db.reviews.findIndex((r: any) => r.id === id);

    if (revIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = db.reviews[revIndex];
    const user = db.users.find((u: any) => u.id === userId);

    if (review.userId !== userId && user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to delete this review' });
    }

    const hostelId = review.hostelId;
    db.reviews.splice(revIndex, 1);

    // Recalc Rating
    const hostelReviews = db.reviews.filter((r: any) => r.hostelId === hostelId);
    const avg = hostelReviews.length > 0 
      ? parseFloat((hostelReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / hostelReviews.length).toFixed(1))
      : 0;

    const hIndex = db.hostels.findIndex((h: any) => h.id === hostelId);
    if (hIndex !== -1) {
      db.hostels[hIndex].averageRating = avg;
    }

    writeDb(db);
    res.json({ message: 'Review deleted successfully', averageRating: avg });
  });

  // ------------------------------------------
  // WISHLIST APIs
  // ------------------------------------------
  app.get('/api/wishlist', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const userWishlists = db.wishlists.filter((w: any) => w.userId === userId);
    const hostelIds = userWishlists.map((w: any) => w.hostelId);
    const wishlistedHostels = db.hostels.filter((h: any) => hostelIds.includes(h.id)).map(h => {
      const rooms = db.rooms.filter((r: any) => r.hostelId === h.id);
      return { ...h, rooms };
    });

    res.json(wishlistedHostels);
  });

  app.post('/api/wishlist', (req, res) => {
    const { hostelId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    if (!hostelId) return res.status(400).json({ error: 'Hostel ID is required' });

    const db = readDb();
    const index = db.wishlists.findIndex((w: any) => w.userId === userId && w.hostelId === hostelId);

    let wishlisted = false;
    if (index === -1) {
      db.wishlists.push({ id: generateId('w'), userId, hostelId });
      wishlisted = true;
    } else {
      db.wishlists.splice(index, 1);
    }

    writeDb(db);
    res.json({ wishlisted, message: wishlisted ? 'Added to wishlist' : 'Removed from wishlist' });
  });

  // ------------------------------------------
  // NOTIFICATIONS APIs
  // ------------------------------------------
  app.get('/api/notifications', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const userId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const userNotifs = db.notifications
      .filter((n: any) => n.userId === userId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(userNotifs);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const db = readDb();
    const index = db.notifications.findIndex((n: any) => n.id === id);

    if (index !== -1) {
      db.notifications[index].read = true;
      writeDb(db);
    }

    res.json({ success: true });
  });

  // ------------------------------------------
  // ADMIN CONTROL & REPORTS APIs
  // ------------------------------------------
  app.get('/api/admin/reports', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const adminId = authHeader.replace('Bearer mock-jwt-token-for-', '');

    const db = readDb();
    const userObj = db.users.find((u: any) => u.id === adminId);
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access forbidden: Admin credentials required' });
    }

    // Calculations
    const totalUsers = db.users.filter((u: any) => u.role === 'STUDENT').length;
    const totalOwners = db.users.filter((u: any) => u.role === 'OWNER').length;
    const totalHostels = db.hostels.length;
    const totalBookings = db.bookings.length;
    const totalPendingHostels = db.hostels.filter((h: any) => !h.isApproved).length;

    // Revenue totals
    const successfulPayments = db.payments.filter((p: any) => p.status === 'Success');
    const totalRevenue = successfulPayments.reduce((acc: number, p: any) => acc + p.amount, 0);

    // Bookings breakdown
    const bookingsByStatus = {
      Pending: db.bookings.filter((b: any) => b.status === 'Pending').length,
      Approved: db.bookings.filter((b: any) => b.status === 'Approved').length,
      Rejected: db.bookings.filter((b: any) => b.status === 'Rejected').length,
      Cancelled: db.bookings.filter((b: any) => b.status === 'Cancelled').length,
      Completed: db.bookings.filter((b: any) => b.status === 'Completed').length,
    };

    // Revenue by month (grouped)
    const revenueByMonth = successfulPayments.reduce((acc: any, p: any) => {
      const monthStr = p.paymentDate.split('-').slice(0, 2).join('-'); // e.g. "2026-05"
      acc[monthStr] = (acc[monthStr] || 0) + p.amount;
      return acc;
    }, {});

    res.json({
      summary: {
        totalUsers,
        totalOwners,
        totalHostels,
        totalBookings,
        totalRevenue,
        totalPendingHostels
      },
      bookingsByStatus,
      revenueByMonth,
      users: db.users,
      hostels: db.hostels
    });
  });

  // ADMIN: DELETE USER
  app.delete('/api/admin/users/:userId', (req, res) => {
    const { userId } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const db = readDb();
    const adminUser = db.users.find((u: any) => u.id === authHeader.replace('Bearer mock-jwt-token-for-', ''));
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const index = db.users.findIndex((u: any) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users.splice(index, 1);
    
    // Purge related records
    db.bookings = db.bookings.filter((b: any) => b.userId !== userId);
    db.payments = db.payments.filter((p: any) => p.userId !== userId);
    db.reviews = db.reviews.filter((r: any) => r.userId !== userId);
    db.wishlists = db.wishlists.filter((w: any) => w.userId !== userId);

    writeDb(db);
    res.json({ message: 'User and all related activities purged successfully.' });
  });

  // ==========================================
  // VITE / STATIC SERVING MIDDLEWARE
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully routed and listening on http://localhost:${PORT}`);
  });
}

startServer();
