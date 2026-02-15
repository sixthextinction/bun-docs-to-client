#!/usr/bin/env bun

import { ApiClient } from '../generated/swapi_dev/client.js';

const client = new ApiClient('https://swapi.dev/api');

console.log('🧪 Testing SWAPI client...\n');

// Test 1: Root resource
console.log('1. Testing getResource()...');
try {
  const resource = await client.getResource();
  console.log('✅ Root resource retrieved');
  console.log(JSON.stringify(resource, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 2: Get people list
console.log('2. Testing getPeople()...');
try {
  const people = await client.getPeople();
  console.log('✅ People list retrieved');
  console.log(JSON.stringify(people, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 3: Get films list
console.log('3. Testing getFilms()...');
try {
  const films = await client.getFilms();
  console.log('✅ Films list retrieved');
  console.log(JSON.stringify(films, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 4: Get planets list
console.log('4. Testing getPlanets()...');
try {
  const planets = await client.getPlanets();
  console.log('✅ Planets list retrieved');
  console.log(JSON.stringify(planets, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 5: Get starships list
console.log('5. Testing getStarships()...');
try {
  const starships = await client.getStarships();
  console.log('✅ Starships list retrieved');
  console.log(JSON.stringify(starships, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 6: Get vehicles list
console.log('6. Testing getVehicles()...');
try {
  const vehicles = await client.getVehicles();
  console.log('✅ Vehicles list retrieved');
  console.log(JSON.stringify(vehicles, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 7: Get species list
console.log('7. Testing getSpecies()...');
try {
  const species = await client.getSpecies();
  console.log('✅ Species list retrieved');
  console.log(JSON.stringify(species, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 8: Get person by ID
console.log('8. Testing getPeopleById(1)...');
try {
  const person = await client.getPeopleById('1');
  console.log('✅ Person by ID retrieved');
  console.log(JSON.stringify(person, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 9: Get film by ID
console.log('9. Testing getFilmsById(1)...');
try {
  const film = await client.getFilmsById('1');
  console.log('✅ Film by ID retrieved');
  console.log(JSON.stringify(film, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 10: Get planet by ID
console.log('10. Testing getPlanetsById(1)...');
try {
  const planet = await client.getPlanetsById('1');
  console.log('✅ Planet by ID retrieved');
  console.log(JSON.stringify(planet, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 11: Get starship by ID
console.log('11. Testing getStarshipsById(9)...');
try {
  const starship = await client.getStarshipsById('9');
  console.log('✅ Starship by ID retrieved');
  console.log(JSON.stringify(starship, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 12: Get vehicle by ID
console.log('12. Testing getVehiclesById(4)...');
try {
  const vehicle = await client.getVehiclesById('4');
  console.log('✅ Vehicle by ID retrieved');
  console.log(JSON.stringify(vehicle, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 13: Get species by ID
console.log('13. Testing getSpeciesById(1)...');
try {
  const species = await client.getSpeciesById('1');
  console.log('✅ Species by ID retrieved');
  console.log(JSON.stringify(species, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 14: Error handling - invalid ID
console.log('14. Testing error handling - getPeopleById(99999)...');
try {
  await client.getPeopleById('99999');
  console.log('⚠️  Unexpected success');
} catch (error) {
  console.log('✅ Error handling works');
  console.log('   Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 15: Get people schema
console.log('15. Testing getPeopleSchema()...');
try {
  const schema = await client.getPeopleSchema();
  console.log('✅ People schema retrieved');
  console.log(JSON.stringify(schema, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 16: Get films schema
console.log('16. Testing getFilmsSchema()...');
try {
  const schema = await client.getFilmsSchema();
  console.log('✅ Films schema retrieved');
  console.log(JSON.stringify(schema, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 17: Get planets schema
console.log('17. Testing getPlanetsSchema()...');
try {
  const schema = await client.getPlanetsSchema();
  console.log('✅ Planets schema retrieved');
  console.log(JSON.stringify(schema, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 18: Query parameters (not supported by generated client)
console.log('18. Testing query parameters (page=2)...');
try {
  const response = await fetch('https://swapi.dev/api/people?page=2');
  const peoplePage2 = await response.json();
  console.log('✅ Paginated people retrieved');
  console.log(JSON.stringify(peoplePage2, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n');

// Test 19: Search parameter (not supported by generated client)
console.log('19. Testing search parameter (search=luke)...');
try {
  const response = await fetch('https://swapi.dev/api/people?search=luke');
  const searchResults = await response.json();
  console.log('✅ Search results retrieved');
  console.log(JSON.stringify(searchResults, null, 2));
} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : String(error));
}

console.log('\n✅ All tests completed!');
