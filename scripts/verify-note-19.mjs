const V = 480;
const S = 2_500_000;
const transformerZ = (V * V / S) * 0.0575;
const transformerR = transformerZ / Math.sqrt(101);
const transformerX = 10 * transformerR;

function availableFaultCurrentKA(lengthMeters) {
  const feederR = (0.09 / 7) * (lengthMeters / 1000);
  const feederX = (0.08 / 7) * (lengthMeters / 1000);
  const equivalentZ = Math.hypot(transformerR + feederR, transformerX + feederX);
  return V / (Math.sqrt(3) * equivalentZ) / 1000;
}

const checkpoints = new Map([
  [0, 52.30], [10, 51.07], [50, 46.50], [100, 41.57], [150, 37.42],
  [183.68, 35.00], [200, 33.92], [250, 30.97], [300, 28.44],
  [350, 26.27], [400, 24.39],
]);

for (const [length, expected] of checkpoints) {
  const actual = availableFaultCurrentKA(length);
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`${length} m: expected ${expected} kA, calculated ${actual.toFixed(4)} kA`);
  }
}

const fullLoadCurrent = S / (Math.sqrt(3) * V);
if (Math.abs(fullLoadCurrent - 3007.03) > 0.02) {
  throw new Error(`Transformer full-load current mismatch: ${fullLoadCurrent}`);
}

console.log(`Verified ${checkpoints.size} AFC checkpoints; I_FL=${fullLoadCurrent.toFixed(2)} A.`);
