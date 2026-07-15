import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfile, assignTier, lookupProfile } from '../../lib/profile/builder';
import { resetLookupRateLimits, lookupRateLimit } from '../../lib/profile/rate-limit';
import { validateRut } from '../../lib/profile/rut';

test('validates RUT DV on client/server shared helper', () => { assert.equal(validateRut('12.345.678-5'), true); assert.equal(validateRut('12.345.678-9'), false); });
test('builds profile aggregates from purchase orders without rows', () => {
  const { profile, oc_count_24m } = buildProfile([{ code:'1', buyer_org_code:'B1', buyer_org_name:'Municipio', buyer_region:'RM', total:1000, created_at_mp:new Date().toISOString(), items:[{onu_code:'432115', onu_category:'Computadores', product_name:'Notebook', total:1000}] }]);
  assert.equal(oc_count_24m, 1); assert.deepEqual(profile.rubros[0].name, 'Computadores'); assert.equal(profile.compradores[0].n_oc, 1); assert.equal(profile.regiones[0].name, 'RM');
});
test('tiers use count even for PN, with persona_natural only below 3', () => { assert.equal(assignTier(10,true),'pleno'); assert.equal(assignTier(4,true),'delgado'); assert.equal(assignTier(0,true),'persona_natural'); });
test('anonymous PN lookup returns only non-sensitive aggregates and does not persist', async () => {
  let persisted = false;
  const out = await lookupProfile({ async findPurchaseOrders(){return [{ code:'1', buyer_org_code:'B1', buyer_org_name:'X', buyer_region:'RM', total:1000, created_at_mp:new Date().toISOString(), items:[{onu_code:'111122', onu_category:'Familia', product_name:'Producto', total:1000}] }];}, async findOpenTenders(){return [{name:'Compra', product:'Producto', count:1}]}, async upsertCompany(){ persisted=true; } }, { rut:'12345678-5', is_natural_person:true, persist:false });
  assert.equal(persisted, false); assert.deepEqual(Object.keys(out).sort(), ['n_matches_hoy','rubros_genericos']);
});
test('lookup rate limit blocks 11th IP hit and 4th session hit', () => { resetLookupRateLimits(); assert.equal([1,2,3].every(()=>lookupRateLimit('1.1.1.1', crypto.randomUUID(), 1)), true); assert.equal(lookupRateLimit('1.1.1.1','s',1), true); assert.equal(lookupRateLimit('1.1.1.2','same',1), true); assert.equal(lookupRateLimit('1.1.1.3','same',1), true); assert.equal(lookupRateLimit('1.1.1.4','same',1), true); assert.equal(lookupRateLimit('1.1.1.5','same',1), false); resetLookupRateLimits(); for(let i=0;i<10;i++) assert.equal(lookupRateLimit('2.2.2.2',`s${i}`,1), true); assert.equal(lookupRateLimit('2.2.2.2','overflow',1), false); });
