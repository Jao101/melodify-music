import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://evsmhffvcdhtgcrthpoh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2c21oZmZ2Y2RodGdjcnRocG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMzQyODcsImV4cCI6MjA2NzYxMDI4N30.3ng2i7UAJ44E6KwbzdLmPw_WvGNq6WQ5lGLJhKeXFSA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSubscriptionFunction() {
  try {
    console.log('Testing subscription function...');
    
    // Try to invoke the function without authentication first to see the error
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { 
        planId: 'premium',
        isYearly: false,
        returnUrl: 'http://localhost:5173',
      }
    });

    if (error) {
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        body: error.body,
        details: error.details
      });
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Caught error:', err);
  }
}

testSubscriptionFunction();
