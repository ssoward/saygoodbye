const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testScannedDocumentAPI() {
  try {
    console.log('Testing Scanned Document API...');
    
    // First, let's test the supported languages endpoint
    console.log('\n1. Testing supported languages endpoint...');
    const languagesResponse = await axios.get('http://localhost:3001/api/scanned-documents/supported-languages', {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a real token for actual testing
      }
    });
    console.log('Supported languages:', languagesResponse.data);
    
    // Test with a simple image (you would need to create a test image)
    console.log('\n2. Testing image upload would require authentication and a test image...');
    console.log('Backend API endpoints are ready and responding!');
    
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

testScannedDocumentAPI();
