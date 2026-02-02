# API Verification Results (With JSON Body)

### ⚠️ Auth Register
**Endpoint**: `POST /auth/register`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### ⚠️ Auth Login
**Endpoint**: `POST /auth/login`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### ⚠️ Auth Verify OTP
**Endpoint**: `POST /auth/verify-otp`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### ⚠️ Auth Refresh Token
**Endpoint**: `POST /auth/refresh-token`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### 🔒 Auth Profile
**Endpoint**: `GET /auth/profile`
**Status**: 401 (Protected (Auth Required))
---

### ✅ Dashboard Stats
**Endpoint**: `GET /dashboard/stats`
**Status**: 200 (Success)
**Response Body**:
```json
{
  "pendingRequests": "1",
  "activeShipments": "0",
  "activeDrivers": "7",
  "fleetUtilization": "87%",
  "trends": {
    "pendingRequests": "+8 today",
    "activeShipments": "+12 today",
    "activeDrivers": "+5 today",
    "fleetUtilization": "+3% today"
  }
}
```
---

### ✅ Dashboard Activity
**Endpoint**: `GET /dashboard/activity`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "day": "Tue",
    "requests": 0
  },
  {
    "day": "Wed",
    "requests": 0
  },
  {
    "day": "Thu",
    "requests": 0
  },
  {
    "day": "Fri",
    "requests": 0
  },
  {
    "day": "Sat",
    "requests": 0
  },
  {
    "day": "Sun",
    "requests": 10
  },
  {
    "day": "Mon",
    "requests": 0
  }
]
```
---

### ✅ Dashboard Live Tracking (Mobile)
**Endpoint**: `GET /dashboard/live-tracking`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": 1,
    "name": "Mumbai-Pune Highway",
    "status": "In Transit"
  },
  {
    "id": 2,
    "name": "Ahmedabad City",
    "status": "Loading"
  },
  {
    "id": 3,
    "name": "Delhi NCR",
    "status": "Unloading"
  },
  {
    "id": 4,
    "name": "Virtual Hub A",
    "status": "Active"
  }
]
```
---

### ✅ Dashboard Live Tracking (Web)
**Endpoint**: `GET /dashboard/live-tracking-web`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": 1,
    "name": "MH-12-AB-1234 • Raj Kumar",
    "status": "In Transit"
  },
  {
    "id": 2,
    "name": "DL-01-XY-9876 • Amit Singh",
    "status": "Loading"
  },
  {
    "id": 3,
    "name": "KA-05-CD-4567 • Priya Sharma",
    "status": "Unloading"
  },
  {
    "id": 4,
    "name": "TN-07-EF-3210 • Hub Transfer",
    "status": "Active"
  }
]
```
---

### ✅ Dashboard Recent Absorptions
**Endpoint**: `GET /dashboard/recent-absorptions`
**Status**: 200 (Success)
**Response Body**:
```json
[]
```
---

### ✅ Get All Drivers
**Endpoint**: `GET /drivers`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": "f4fe2a45-82f8-4c1a-a219-d127b5cd3e41",
    "name": "edited",
    "vehicle": "Standard",
    "plate": "3333333333",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "A",
    "color": "bg-blue-500",
    "phone": "3333333333",
    "type": "Standard",
    "loc": "33333333333"
  },
  {
    "id": "1adb5b04-295b-413f-a4d2-7e3a09eadffa",
    "name": "Anil Gupta",
    "vehicle": "Ashok Leyland 4825",
    "plate": "MH-84-DC-2157",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "AG",
    "color": "bg-orange-500",
    "phone": "+919849243591",
    "type": "Ashok Leyland 4825",
    "loc": "Delhi"
  },
  {
    "id": "5c89bb2f-fef7-480b-a7cc-e9af299dd044",
    "name": "Ramesh Verma",
    "vehicle": "Ashok Leyland 4825",
    "plate": "MH-35-IA-2268",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "RV",
    "color": "bg-orange-500",
    "phone": "+919982626582",
    "type": "Ashok Leyland 4825",
    "loc": "Hyderabad"
  },
  {
    "id": "00448db5-0a31-49b5-81d1-64ba4b2d3758",
    "name": "Rajesh Kumar",
    "vehicle": "Volvo FM 440",
    "plate": "MH-89-PC-7646",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "RK",
    "color": "bg-orange-500",
    "phone": "+919054110534",
    "type": "Volvo FM 440",
    "loc": "Jaipur"
  },
  {
    "id": "7885694d-ed5b-4acd-8759-fb6bb3d8be40",
    "name": "Rajesh Kumar",
    "vehicle": "Tata Prima",
    "plate": "MH-41-LX-7672",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "RK",
    "color": "bg-orange-500",
    "phone": "+919395090896",
    "type": "Tata Prima",
    "loc": "Jaipur"
  },
  {
    "id": "f556a891-4847-4dcf-8ed8-9fe9cc47a9a1",
    "name": "Rajesh Kumar",
    "vehicle": "Volvo FM 440",
    "plate": "MH-18-UR-7775",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "RK",
    "color": "bg-orange-500",
    "phone": "+919589767812",
    "type": "Volvo FM 440",
    "loc": "Chennai"
  },
  {
    "id": "d18b8915-fd36-4129-820f-698b00bf2367",
    "name": "Vikram Patel",
    "vehicle": "Ashok Leyland 4825",
    "plate": "MH-18-YJ-5526",
    "rating": 0,
    "trips": 0,
    "status": "On Duty",
    "avatar": "VP",
    "color": "bg-orange-500",
    "phone": "+919385005277",
    "type": "Ashok Leyland 4825",
    "loc": "Bangalore"
  }
]
```
---

### ⚠️ Create Driver
**Endpoint**: `POST /drivers`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### ✅ Get E-Way Bills
**Endpoint**: `GET /eway-bills`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": "EWB-2026-117750",
    "vehicle": "MH-18-UR-7775",
    "from": "Hyderabad",
    "to": "Delhi",
    "dist": "658 km",
    "driver": "Rajesh Kumar",
    "value": "₹7L",
    "valid": "3 Feb, 20:42",
    "validUntil": "2026-02-03T15:12:56.815Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-629327",
    "vehicle": "MH-18-UR-7775",
    "from": "Jaipur",
    "to": "Bangalore",
    "dist": "427 km",
    "driver": "Rajesh Kumar",
    "value": "₹10L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:00.395Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-727828",
    "vehicle": "MH-84-DC-2157",
    "from": "Jaipur",
    "to": "Pune",
    "dist": "500 km",
    "driver": "Anil Gupta",
    "value": "₹12L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:03.109Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-592115",
    "vehicle": "MH-84-DC-2157",
    "from": "Hyderabad",
    "to": "Pune",
    "dist": "778 km",
    "driver": "Anil Gupta",
    "value": "₹6L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:04.853Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-925961",
    "vehicle": "MH-84-DC-2157",
    "from": "Pune",
    "to": "Delhi",
    "dist": "309 km",
    "driver": "Anil Gupta",
    "value": "₹6L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:06.527Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-739088",
    "vehicle": "MH-18-YJ-5526",
    "from": "Mumbai",
    "to": "Delhi",
    "dist": "1132 km",
    "driver": "Vikram Patel",
    "value": "₹15L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:07.927Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-837084",
    "vehicle": "MH-35-IA-2268",
    "from": "Mumbai",
    "to": "Chennai",
    "dist": "548 km",
    "driver": "Ramesh Verma",
    "value": "₹5L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:09.935Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-687524",
    "vehicle": "MH-89-PC-7646",
    "from": "Delhi",
    "to": "Bangalore",
    "dist": "380 km",
    "driver": "Rajesh Kumar",
    "value": "₹13L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:14.851Z",
    "status": "Transferred"
  },
  {
    "id": "EWB-2026-111719",
    "vehicle": "MH-84-DC-2157",
    "from": "Mumbai",
    "to": "Pune",
    "dist": "1024 km",
    "driver": "Anil Gupta",
    "value": "₹14L",
    "valid": "3 Feb, 20:43",
    "validUntil": "2026-02-03T15:13:16.760Z",
    "status": "Transferred"
  }
]
```
---

### ✅ Get E-Way Bills Stats
**Endpoint**: `GET /eway-bills/stats`
**Status**: 200 (Success)
**Response Body**:
```json
{
  "active": 9,
  "expireSoon": 0,
  "expired": 0
}
```
---

### ⚠️ Create E-Way Bill
**Endpoint**: `POST /eway-bills`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### ✅ Package History (Mobile)
**Endpoint**: `GET /packages/history`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": "9d954429-53f3-41a0-8c22-32a5604e6683",
    "trackingNo": "PKG-9d954429",
    "pickup": {
      "location": "Mumbai",
      "lat": 19.076,
      "lng": 72.8777
    },
    "delivery": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:15.186Z",
    "weight": 10
  },
  {
    "id": "810cd21a-24c9-4452-a186-6fae3bd88eaa",
    "trackingNo": "PKG-810cd21a",
    "pickup": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "delivery": {
      "location": "Bangalore",
      "lat": 12.9716,
      "lng": 77.5946
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:12.785Z",
    "weight": 8
  },
  {
    "id": "23b636d0-fb37-41f5-9c36-58da6199f151",
    "trackingNo": "PKG-23b636d0",
    "pickup": {
      "location": "Chennai",
      "lat": 13.0827,
      "lng": 80.2707
    },
    "delivery": {
      "location": "Jaipur",
      "lat": 26.9124,
      "lng": 75.7873
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:11.069Z",
    "weight": 8
  },
  {
    "id": "0699e582-050d-405f-8124-69cb5c4faf38",
    "trackingNo": "PKG-0699e582",
    "pickup": {
      "location": "Mumbai",
      "lat": 19.076,
      "lng": 72.8777
    },
    "delivery": {
      "location": "Chennai",
      "lat": 13.0827,
      "lng": 80.2707
    },
    "driver": "Ramesh Verma",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:08.615Z",
    "weight": 5
  },
  {
    "id": "c300c8b5-e3cf-4b10-b648-667e796e0a54",
    "trackingNo": "PKG-c300c8b5",
    "pickup": {
      "location": "Mumbai",
      "lat": 19.076,
      "lng": 72.8777
    },
    "delivery": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "driver": "Vikram Patel",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:06.855Z",
    "weight": 11
  },
  {
    "id": "6586de98-032b-48e4-ad19-534ab45991e3",
    "trackingNo": "PKG-6586de98",
    "pickup": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "delivery": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:05.679Z",
    "weight": 17
  },
  {
    "id": "6d94823d-4ca6-4702-b001-7f5dd3728bc3",
    "trackingNo": "PKG-6d94823d",
    "pickup": {
      "location": "Hyderabad",
      "lat": 17.385,
      "lng": 78.4867
    },
    "delivery": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:03.484Z",
    "weight": 6
  },
  {
    "id": "8e614147-f2dd-4433-93fe-3c5330a4488d",
    "trackingNo": "PKG-8e614147",
    "pickup": {
      "location": "Jaipur",
      "lat": 26.9124,
      "lng": 75.7873
    },
    "delivery": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:01.736Z",
    "weight": 12
  },
  {
    "id": "0616e60a-0f71-45ad-a0df-b622151a37e2",
    "trackingNo": "PKG-0616e60a",
    "pickup": {
      "location": "Jaipur",
      "lat": 26.9124,
      "lng": 75.7873
    },
    "delivery": {
      "location": "Bangalore",
      "lat": 12.9716,
      "lng": 77.5946
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:12:57.951Z",
    "weight": 18
  },
  {
    "id": "574c705f-9f63-486d-b21b-5cc676032c88",
    "trackingNo": "PKG-574c705f",
    "pickup": {
      "location": "Hyderabad",
      "lat": 17.385,
      "lng": 78.4867
    },
    "delivery": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:12:55.346Z",
    "weight": 9
  }
]
```
---

### ✅ Package History (Web)
**Endpoint**: `GET /packages/history-web`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": "9d954429-53f3-41a0-8c22-32a5604e6683",
    "trackingNo": "PKG-9d954429",
    "pickup": {
      "location": "Mumbai",
      "lat": 19.076,
      "lng": 72.8777
    },
    "delivery": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:15.186Z",
    "weight": 10
  },
  {
    "id": "810cd21a-24c9-4452-a186-6fae3bd88eaa",
    "trackingNo": "PKG-810cd21a",
    "pickup": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "delivery": {
      "location": "Bangalore",
      "lat": 12.9716,
      "lng": 77.5946
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:12.785Z",
    "weight": 8
  },
  {
    "id": "23b636d0-fb37-41f5-9c36-58da6199f151",
    "trackingNo": "PKG-23b636d0",
    "pickup": {
      "location": "Chennai",
      "lat": 13.0827,
      "lng": 80.2707
    },
    "delivery": {
      "location": "Jaipur",
      "lat": 26.9124,
      "lng": 75.7873
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:11.069Z",
    "weight": 8
  },
  {
    "id": "0699e582-050d-405f-8124-69cb5c4faf38",
    "trackingNo": "PKG-0699e582",
    "pickup": {
      "location": "Mumbai",
      "lat": 19.076,
      "lng": 72.8777
    },
    "delivery": {
      "location": "Chennai",
      "lat": 13.0827,
      "lng": 80.2707
    },
    "driver": "Ramesh Verma",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:08.615Z",
    "weight": 5
  },
  {
    "id": "c300c8b5-e3cf-4b10-b648-667e796e0a54",
    "trackingNo": "PKG-c300c8b5",
    "pickup": {
      "location": "Mumbai",
      "lat": 19.076,
      "lng": 72.8777
    },
    "delivery": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "driver": "Vikram Patel",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:06.855Z",
    "weight": 11
  },
  {
    "id": "6586de98-032b-48e4-ad19-534ab45991e3",
    "trackingNo": "PKG-6586de98",
    "pickup": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "delivery": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:05.679Z",
    "weight": 17
  },
  {
    "id": "6d94823d-4ca6-4702-b001-7f5dd3728bc3",
    "trackingNo": "PKG-6d94823d",
    "pickup": {
      "location": "Hyderabad",
      "lat": 17.385,
      "lng": 78.4867
    },
    "delivery": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:03.484Z",
    "weight": 6
  },
  {
    "id": "8e614147-f2dd-4433-93fe-3c5330a4488d",
    "trackingNo": "PKG-8e614147",
    "pickup": {
      "location": "Jaipur",
      "lat": 26.9124,
      "lng": 75.7873
    },
    "delivery": {
      "location": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "driver": "Anil Gupta",
    "status": "COMPLETED",
    "date": "2026-02-01T15:13:01.736Z",
    "weight": 12
  },
  {
    "id": "0616e60a-0f71-45ad-a0df-b622151a37e2",
    "trackingNo": "PKG-0616e60a",
    "pickup": {
      "location": "Jaipur",
      "lat": 26.9124,
      "lng": 75.7873
    },
    "delivery": {
      "location": "Bangalore",
      "lat": 12.9716,
      "lng": 77.5946
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:12:57.951Z",
    "weight": 18
  },
  {
    "id": "574c705f-9f63-486d-b21b-5cc676032c88",
    "trackingNo": "PKG-574c705f",
    "pickup": {
      "location": "Hyderabad",
      "lat": 17.385,
      "lng": 78.4867
    },
    "delivery": {
      "location": "Delhi",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "driver": "Rajesh Kumar",
    "status": "COMPLETED",
    "date": "2026-02-01T15:12:55.346Z",
    "weight": 9
  }
]
```
---

### ⚠️ Create Delivery (Public)
**Endpoint**: `POST /deliveries/create`
**Status**: 500 (Error 500)
**Response**: Error 500
---

### 🔒 Assigned Deliveries
**Endpoint**: `GET /deliveries/assigned`
**Status**: 401 (Protected (Auth Required))
---

### 🔒 Absorption Map Data
**Endpoint**: `GET /absorption/map-data`
**Status**: 401 (Protected (Auth Required))
---

### 🔒 Absorption Active
**Endpoint**: `GET /absorption/active`
**Status**: 401 (Protected (Auth Required))
---

### ✅ Virtual Hubs List
**Endpoint**: `GET /virtual-hubs`
**Status**: 200 (Success)
**Response Body**:
```json
[
  {
    "id": "20f59b8b-8bbd-4c3c-98a5-3d2018a9cf43",
    "name": "Mumbai",
    "address": "mumbai bjai",
    "latitude": 21.8884032851846,
    "longitude": 76.70898444950582,
    "type": "Distribution",
    "radius": 5,
    "createdAt": "2026-02-01T21:32:29.643Z"
  },
  {
    "id": "578cef26-39ab-4f6b-9962-738971eccbb5",
    "name": "buy",
    "address": "mumbai",
    "latitude": 24.55267602042944,
    "longitude": 79.99023467302324,
    "type": "Distribution",
    "radius": 5,
    "createdAt": "2026-02-01T21:18:09.997Z"
  },
  {
    "id": "6213fc92-4b95-4f98-aa28-97144d286607",
    "name": "buy",
    "address": "mumbai",
    "latitude": 24.55267602042944,
    "longitude": 79.99023467302324,
    "type": "Distribution",
    "radius": 5,
    "createdAt": "2026-02-01T21:18:09.266Z"
  },
  {
    "id": "a4630773-f64b-4aae-86c9-530b103d04d9",
    "name": "Jaipur Hub",
    "address": null,
    "latitude": 26.9124,
    "longitude": 75.7873,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:54.749Z"
  },
  {
    "id": "d76c2c4c-18a5-4f66-8f27-610735fdde32",
    "name": "Pune Hub",
    "address": null,
    "latitude": 18.5204,
    "longitude": 73.8567,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:54.502Z"
  },
  {
    "id": "95a16e85-514a-4405-a9ab-4def3a0ba75b",
    "name": "Hyderabad Hub",
    "address": null,
    "latitude": 17.385,
    "longitude": 78.4867,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:54.231Z"
  },
  {
    "id": "151183c3-8cd6-4a23-82d1-0b8e7545762b",
    "name": "Chennai Hub",
    "address": null,
    "latitude": 13.0827,
    "longitude": 80.2707,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:54.062Z"
  },
  {
    "id": "eb60658d-1357-4386-8fff-932cfd31c9b8",
    "name": "Bangalore Hub",
    "address": null,
    "latitude": 12.9716,
    "longitude": 77.5946,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:53.421Z"
  },
  {
    "id": "08d99b48-2027-4604-b3ae-dea2d2c50eaa",
    "name": "Delhi Hub",
    "address": null,
    "latitude": 28.7041,
    "longitude": 77.1025,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:52.935Z"
  },
  {
    "id": "b1ae2424-bce7-49ff-999a-6fa0bfb01387",
    "name": "Mumbai Hub",
    "address": null,
    "latitude": 19.076,
    "longitude": 72.8777,
    "type": "RELAY",
    "radius": 5,
    "createdAt": "2026-02-01T15:12:52.776Z"
  }
]
```
---

