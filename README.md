
# QR Code Management System - Backend

This backend system provides APIs for user authentication, QR code generation, scanning, and management. It is built using Node.js, Express, and MongoDB, and provides RESTful endpoints that frontend developers can interact with.

## Overview for Frontend Developers

This system allows frontend developers to integrate user registration, login, and QR code operations into their applications. The key features include user authentication, QR code generation for meals (breakfast, lunch, dinner), and management such as blocking/unblocking QR codes, fetching daily meal status, and viewing scan history.

### Key Features

- **User Authentication**: Signup and login functionality with password encryption.
- **QR Code Generation**: QR codes can be generated and stored, with associated meal scan history.
- **QR Code Scanning**: Users can scan QR codes for specific meal times (breakfast, lunch, dinner).
- **QR Code Management**: Block/unblock QR codes, delete QR codes, and view meal scan history.

### API Base URL

Assuming the backend is hosted at `http://localhost:your-port`, you can make requests to the following endpoints.

## API Endpoints

### User Authentication

1. **Signup User**
   - **POST** `/api/v1/signupuser`
   - Registers a new user.
   - Request body:
     ```json
     {
       "email": "user@example.com",
       "password": "password123"
     }
     ```
   - Response:
     ```json
     {
       "message": "User registered successfully"
     }
     ```

2. **Login User**
   - **POST** `/api/v1/loginuser`
   - Logs in an existing user.
   - Request body:
     ```json
     {
       "email": "user@example.com",
       "password": "password123"
     }
     ```
   - Response:
     ```json
     {
       "message": "User logged in successfully"
     }
     ```

### QR Code Management

1. **Generate QR Code**
   - **POST** `/api/v1/generate`
   - Generates a new QR code with sequential numbering.
   - Response:
     ```json
     {
       "message": "QR Code generated successfully",
       "qrCode": {
         "qrNumber": "001",
         "qrCodeData": "data:image/png;base64,...",
         "scanHistory": {
           "breakfast": false,
           "lunch": false,
           "dinner": false
         }
       }
     }
     ```
   - Use the `qrCodeData` in the frontend to display the QR code image using an `<img>` tag.

2. **Scan QR Code**
   - **POST** `/api/v1/scan`
   - Scans a QR code and updates the meal status (breakfast, lunch, dinner).
   - Request body:
     ```json
     {
       "qrNumber": "001"
     }
     ```
   - Response:
     ```json
     {
       "message": "breakfast recorded successfully",
       "qrCode": {
         "qrNumber": "001",
         "scanHistory": {
           "breakfast": true,
           "lunch": false,
           "dinner": false
         }
       }
     }
     ```

3. **Get Scan History**
   - **GET** `/api/v1/history/:qrNumber`
   - Retrieves the scan history for a specific QR code.
   - Response:
     ```json
     {
       "message": "History fetched successfully",
       "history": [
         {
           "qrNumber": "001",
           "date": "2024-10-10",
           "scanHistory": {
             "breakfast": true,
             "lunch": false,
             "dinner": true
           }
         },
         ...
       ]
     }
     ```

4. **Block QR Code**
   - **POST** `/api/v1/block`
   - Blocks a specific QR code.
   - Request body:
     ```json
     {
       "qrNumber": "001"
     }
     ```
   - Response:
     ```json
     {
       "message": "QR Code 001 blocked successfully"
     }
     ```

5. **Unblock QR Code**
   - **POST** `/api/v1/unblock`
   - Unblocks a specific QR code.
   - Request body:
     ```json
     {
       "qrNumber": "001"
     }
     ```
   - Response:
     ```json
     {
       "message": "QR Code 001 unblocked successfully"
     }
     ```

6. **Get Today’s Meal Status**
   - **GET** `/api/v1/meal-status/:qrNumber`
   - Fetches the meal scan status (breakfast, lunch, dinner) for today.
   - Response:
     ```json
     {
       "message": "Meal status for today",
       "mealStatus": {
         "breakfast": true,
         "lunch": false,
         "dinner": false
       }
     }
     ```

7. **Delete QR Code**
   - **DELETE** `/api/v1/delete/:qrNumber`
   - Deletes a specific QR code along with its scan history.
   - Response:
     ```json
     {
       "message": "QR Code 001 and its history deleted successfully"
     }
     ```

## Example Usage in Frontend

### Displaying a Generated QR Code

Once you call the `generateQRCode` API and receive the response, you can display the QR code in an `<img>` tag as shown:

```html
<img src="data:image/png;base64,..." alt="Generated QR Code">
```

The `qrCodeData` field in the API response contains the base64-encoded QR code image.

### Checking Meal Status

You can use the `getTodayMealStatus` API to check which meals a user has scanned today:

```javascript
fetch(`/api/v1/meal-status/001`)
  .then(response => response.json())
  .then(data => {
    if (data.mealStatus.breakfast) {
      console.log('Breakfast has been scanned.');
    }
  });
```

## Error Handling

The backend provides detailed error messages for invalid requests, such as:

- **404 Not Found**: When the requested resource (QR code or user) does not exist.
- **400 Bad Request**: When the request is not within the correct meal times or a QR code is scanned twice for the same meal.
- **500 Internal Server Error**: When an unexpected error occurs on the server.

### Sample Error Response:

```json
{
  "error": "QR Code not found"
}
```

## Frontend-Backend Integration

1. **Axios/FETCH for API Requests**: You can use `fetch` or `axios` to make API calls to the backend.
2. **Handling Image Data**: For displaying the QR code, you will use the base64-encoded image returned from the backend.
3. **State Management**: Consider storing user authentication and QR code data in a state management system like Redux or Context API.
4. **Token Storage (optional)**: If user authentication includes tokens (like JWT), store them securely in the frontend (localStorage or sessionStorage).

## Deployment

- The backend can be deployed on platforms like Heroku or AWS, while the frontend (React, Vue, etc.) can make API calls to the deployed backend.

---

Feel free to adjust the API base URL and customize this guide to match the frontend framework you're using!
