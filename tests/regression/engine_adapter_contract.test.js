const assert = require('assert');
const defaultRegistry = require('../../src/core/engineRegistry');
const EngineCapabilityMatrix = require('../../src/core/engineCapabilityMatrix');

console.log('=== TEST SUITE 8: Engine Adapter Contract & Capability Declarations ===');

(() => {
  const adapters = defaultRegistry.getAll();
  assert.strictEqual(adapters.length, 14, 'Must have exactly 14 registered adapters');

  for (const ad of adapters) {
    assert.ok(ad.id, 'Adapter must have id');
    assert.ok(ad.name, 'Adapter must have name');
    assert.strictEqual(typeof ad.detect, 'function', `${ad.id} must implement detect()`);
    assert.strictEqual(typeof ad.inspect, 'function', `${ad.id} must implement inspect()`);
    assert.strictEqual(typeof ad.extract, 'function', `${ad.id} must implement extract()`);
    assert.strictEqual(typeof ad.apply, 'function', `${ad.id} must implement apply()`);
    assert.strictEqual(typeof ad.validate, 'function', `${ad.id} must implement validate()`);
    assert.strictEqual(typeof ad.rollback, 'function', `${ad.id} must implement rollback()`);
    assert.strictEqual(typeof ad.getCapabilities, 'function', `${ad.id} must implement getCapabilities()`);
    assert.strictEqual(typeof ad.getDetailedDeclaration, 'function', `${ad.id} must implement getDetailedDeclaration()`);

    const decl = ad.getDetailedDeclaration();
    assert.strictEqual(decl.engine, ad.id, `Declaration engine id must match ${ad.id}`);
    assert.ok(Array.isArray(decl.versions), 'versions must be an array');
    console.log(`  ✓ Adapter ${ad.id.padEnd(15)} contract and capability declaration verified`);
  }

  const matrix = EngineCapabilityMatrix.getDeclarations();
  assert.strictEqual(matrix.length, 14);
  console.log('  ✓ EngineCapabilityMatrix contains all 14 engine declarations');

  console.log('✓ PASS: Engine Adapter Contract Test Suite Complete.\n');
})();
