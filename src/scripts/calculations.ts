export type Phase = 'single' | 'three';
export type PowerFactorType = 'lagging' | 'leading';

const SQRT3 = Math.sqrt(3);

export const constants = {
  wattsPerMechanicalHp: 745.699872,
  wattsPerBtuPerHour: 0.2930710702,
  cubicMetresPerHourPerCfm: 1.69901082,
  litresPerSecondPerCfm: 0.47194745,
  cubicMetresPerSecondPerCfm: 0.00047194745,
  pascalsPerPsi: 6894.757293,
  pascalsPerInH2O: 249.08891,
  millimetresPerInch: 25.4,
  metresPerFoot: 0.3048,
  kilogramsPerPound: 0.45359237,
} as const;

const assertPositive = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
};

const assertPowerFactor = (value: number, label = 'Power factor') => {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new Error(`${label} must be greater than 0 and no more than 1.`);
  }
};

export function motorCurrent(input: {
  power: number;
  powerUnit: 'hp' | 'kw';
  voltage: number;
  phase: Phase;
  powerFactor: number;
  efficiencyPercent: number;
}) {
  assertPositive(input.power, 'Motor power');
  assertPositive(input.voltage, 'Voltage');
  assertPowerFactor(input.powerFactor);
  if (!Number.isFinite(input.efficiencyPercent) || input.efficiencyPercent <= 0 || input.efficiencyPercent > 100) {
    throw new Error('Efficiency must be greater than 0% and no more than 100%.');
  }

  const outputWatts = input.powerUnit === 'hp'
    ? input.power * constants.wattsPerMechanicalHp
    : input.power * 1000;
  const phaseFactor = input.phase === 'three' ? SQRT3 : 1;
  return outputWatts / (phaseFactor * input.voltage * input.powerFactor * (input.efficiencyPercent / 100));
}

export function transformerCurrent(kva: number, voltage: number, phase: Phase) {
  assertPositive(kva, 'Transformer rating');
  assertPositive(voltage, 'Voltage');
  return (kva * 1000) / ((phase === 'three' ? SQRT3 : 1) * voltage);
}

export type AcPowerResult = { kw: number; kva: number; kvar: number; pf: number; current?: number };

const reactivePower = (kva: number, kw: number, pfType: PowerFactorType) => {
  const radicand = kva ** 2 - kw ** 2;
  const tolerance = 1e-12 * Math.max(1, kva ** 2, kw ** 2);
  if (radicand < -tolerance) throw new Error('Apparent power cannot be less than real power.');
  const magnitude = Math.sqrt(radicand < 0 ? 0 : radicand);
  return pfType === 'leading' ? -magnitude : magnitude;
};

export function acPowerFromVoltageCurrent(voltage: number, current: number, pf: number, phase: Phase, pfType: PowerFactorType): AcPowerResult {
  assertPositive(voltage, 'Voltage');
  assertPositive(current, 'Current');
  assertPowerFactor(pf);
  const kva = ((phase === 'three' ? SQRT3 : 1) * voltage * current) / 1000;
  const kw = kva * pf;
  return { kw, kva, kvar: reactivePower(kva, kw, pfType), pf, current };
}

export function acPowerFromKwPf(kw: number, pf: number, pfType: PowerFactorType): AcPowerResult {
  assertPositive(kw, 'Active power');
  assertPowerFactor(pf);
  const kva = kw / pf;
  return { kw, kva, kvar: reactivePower(kva, kw, pfType), pf };
}

export function acPowerFromKwKva(kw: number, kva: number, pfType: PowerFactorType): AcPowerResult {
  assertPositive(kw, 'Active power');
  assertPositive(kva, 'Apparent power');
  if (kva < Math.abs(kw)) throw new Error('Apparent power cannot be less than real power.');
  return { kw, kva, kvar: reactivePower(kva, kw, pfType), pf: kw / kva };
}

export function acPowerFromKvaPf(kva: number, pf: number, pfType: PowerFactorType): AcPowerResult {
  assertPositive(kva, 'Apparent power');
  assertPowerFactor(pf);
  const kw = kva * pf;
  return { kw, kva, kvar: reactivePower(kva, kw, pfType), pf };
}

export function acCurrentFromPower(voltage: number, kw: number, pf: number, phase: Phase, pfType: PowerFactorType): AcPowerResult {
  assertPositive(voltage, 'Voltage');
  const result = acPowerFromKwPf(kw, pf, pfType);
  result.current = (result.kva * 1000) / ((phase === 'three' ? SQRT3 : 1) * voltage);
  return result;
}

export function powerFactorCorrection(kw: number, existingPf: number, targetPf: number) {
  assertPositive(kw, 'Real load power');
  assertPowerFactor(existingPf, 'Existing power factor');
  assertPowerFactor(targetPf, 'Target power factor');
  if (targetPf <= existingPf) throw new Error('Target power factor must be greater than the existing power factor.');
  return kw * (Math.tan(Math.acos(existingPf)) - Math.tan(Math.acos(targetPf)));
}

export type OhmsResult = { voltage: number; current: number; resistance: number; power: number };

export function solveOhmsLaw(mode: string, a: number, b: number): OhmsResult {
  const inputLabels: Record<string, [string, string]> = {
    vr: ['Voltage', 'Resistance'], vi: ['Voltage', 'Current'], ir: ['Current', 'Resistance'],
    pv: ['Power', 'Voltage'], pi: ['Power', 'Current'], pr: ['Power', 'Resistance'],
  };
  const labels = inputLabels[mode];
  if (!labels) throw new Error('Select a calculation mode.');
  assertPositive(a, labels[0]);
  assertPositive(b, labels[1]);
  let voltage: number;
  let current: number;
  let resistance: number;
  let power: number;

  switch (mode) {
    case 'vr':
      voltage = a; resistance = b; current = voltage / resistance; power = voltage * current; break;
    case 'vi':
      voltage = a; current = b; resistance = voltage / current; power = voltage * current; break;
    case 'ir':
      current = a; resistance = b; voltage = current * resistance; power = voltage * current; break;
    case 'pv':
      power = a; voltage = b; current = power / voltage; resistance = voltage / current; break;
    case 'pi':
      power = a; current = b; voltage = power / current; resistance = voltage / current; break;
    case 'pr':
      power = a; resistance = b; voltage = Math.sqrt(power * resistance); current = voltage / resistance; break;
    default:
      throw new Error('Select a calculation mode.');
  }
  return { voltage, current, resistance, power };
}

type UnitDefinition = { label: string; toBase: (value: number) => number; fromBase: (value: number) => number };
type ConversionGroup = { label: string; units: Record<string, UnitDefinition> };
const linearUnit = (label: string, basePerUnit: number): UnitDefinition => ({
  label,
  toBase: (value) => value * basePerUnit,
  fromBase: (value) => value / basePerUnit,
});

export const conversionGroups: Record<string, ConversionGroup> = {
  thermal: { label: 'Thermal Power', units: {
    btuh: linearUnit('BTU/hr', constants.wattsPerBtuPerHour),
    w: linearUnit('W', 1), kw: linearUnit('kW', 1000),
  }},
  mechanical: { label: 'Mechanical Power', units: {
    w: linearUnit('W', 1), kw: linearUnit('kW', 1000), hp: linearUnit('mechanical hp', constants.wattsPerMechanicalHp),
  }},
  airflow: { label: 'Airflow', units: {
    cfm: linearUnit('CFM', constants.cubicMetresPerSecondPerCfm),
    m3h: linearUnit('m³/h', 1 / 3600), ls: linearUnit('L/s', 0.001), m3s: linearUnit('m³/s', 1),
  }},
  temperature: { label: 'Temperature', units: {
    c: { label: '°C', toBase: (v) => v, fromBase: (v) => v },
    f: { label: '°F', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
  }},
  pressure: { label: 'Pressure', units: {
    pa: linearUnit('Pa', 1), kpa: linearUnit('kPa', 1000), bar: linearUnit('bar', 100000), psi: linearUnit('psi', constants.pascalsPerPsi),
  }},
  staticPressure: { label: 'Water column / static pressure', units: {
    pa: linearUnit('Pa', 1), inh2o: linearUnit('inH₂O', constants.pascalsPerInH2O),
  }},
  length: { label: 'Length', units: {
    mm: linearUnit('mm', 0.001), cm: linearUnit('cm', 0.01), m: linearUnit('m', 1),
    in: linearUnit('in', constants.millimetresPerInch / 1000), ft: linearUnit('ft', constants.metresPerFoot),
  }},
  mass: { label: 'Mass', units: {
    kg: linearUnit('kg', 1), lb: linearUnit('lb', constants.kilogramsPerPound),
  }},
};

export const conversionNotes: Record<string, string> = {
  thermal: 'BTU/hr is a rate of heat transfer. Convert BTU/hr to W or kW when comparing thermal load with electrical power or enclosure heat-loss data.',
  mechanical: 'Mechanical horsepower is used here: 1 hp = 745.699872 W.',
  airflow: 'CFM and m³/h are volumetric airflow rates. m³/h is cubic metres per hour, not square metres per hour.',
  temperature: 'Temperature conversion includes the required offset; °C and °F are not simple scale-factor conversions.',
  pressure: 'Pressure values are absolute unit conversions only. Gauge versus absolute reference is not changed by this converter.',
  staticPressure: 'inH₂O is commonly used for low-pressure and airflow/static-pressure measurements.',
  length: 'Inch and foot conversions use exact SI definitions: 1 in = 25.4 mm and 1 ft = 0.3048 m.',
  mass: 'Mass conversion uses 1 lb = 0.45359237 kg.',
};

export function convertUnit(value: number, groupKey: string, fromKey: string, toKey: string) {
  if (!Number.isFinite(value)) throw new Error('Enter a valid finite number.');
  const group = conversionGroups[groupKey];
  const from = group?.units[fromKey];
  const to = group?.units[toKey];
  if (!group || !from || !to) throw new Error('Select a valid conversion.');
  const result = to.fromBase(from.toBase(value));
  if (!Number.isFinite(result)) throw new Error('The conversion result is outside the supported range.');
  return result;
}
