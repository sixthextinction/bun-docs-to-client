#!/usr/bin/env bun

import { ApiClient } from './generated/swapi_dev/client.js';

const client = new ApiClient('https://swapi.dev/api');

console.log('🧪 Testing SWAPI client...\n');

// Test 1: Get people
console.log('1. Testing getPeople()...');
try {
  const people = await client.getPeople();
  console.log('✅ People list retrieved');
  console.log('   Count:', people.count || 'N/A');
  console.log('   First person:', people.results?.[0]?.name || 'N/A');
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 2: Get films
console.log('2. Testing getFilms()...');
try {
  const films = await client.getFilms();
  console.log('✅ Films list retrieved');
  console.log('   Count:', films.count || 'N/A');
  console.log('   First film:', films.results?.[0]?.title || 'N/A');
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 3: Get planets
console.log('3. Testing getPlanets()...');
try {
  const planets = await client.getPlanets();
  console.log('✅ Planets list retrieved');
  console.log('   Count:', planets.count || 'N/A');
  console.log('   First planet:', planets.results?.[0]?.name || 'N/A');
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 4: Get starships
console.log('4. Testing getStarships()...');
try {
  const starships = await client.getStarships();
  console.log('✅ Starships list retrieved');
  console.log('   Count:', starships.count || 'N/A');
  console.log('   First starship:', starships.results?.[0]?.name || 'N/A');
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n✅ All tests completed!');
