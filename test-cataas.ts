#!/usr/bin/env bun

import { ApiClient } from './generated/cataas_com/client.js';

const client = new ApiClient('https://cataas.com');

const cat = await client.cat_random(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
console.log('🐱 Random cat:', cat);
