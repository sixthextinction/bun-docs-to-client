#!/usr/bin/env bun

import { ApiClient } from '../generated/api_chucknorris_io/client.js';

const client = new ApiClient('https://api.chucknorris.io');

console.log('🧪 Testing Chuck Norris API client...\n');

// Test 1: Get random joke
console.log('1. Testing getRandom()...');
try {
  const joke = await client.getRandom();
  console.log('✅ Random joke:', joke.value);
  console.log('   ID:', joke.id);
  console.log('   Categories:', joke.categories || []);
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 2: Get categories
console.log('2. Testing getCategories()...');
try {
  const categories = await client.getCategories();
  console.log('✅ Categories:', categories);
  console.log('   Count:', Array.isArray(categories) ? categories.length : 'N/A');
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n✅ All tests completed!');
