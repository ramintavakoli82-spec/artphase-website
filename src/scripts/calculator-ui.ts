import {
  acCurrentFromPower,
  acPowerFromKvaPf,
  acPowerFromKwKva,
  acPowerFromKwPf,
  acPowerFromVoltageCurrent,
  conversionGroups,
  conversionNotes,
  convertUnit,
  motorCurrent,
  powerFactorCorrection,
  solveOhmsLaw,
  transformerCurrent,
  type Phase,
  type PowerFactorType,
} from './calculations';

const fieldLabels: Record<string, string> = {
  power: 'motor power', voltage: 'voltage', powerFactor: 'power factor', efficiency: 'efficiency',
  kva: 'apparent power', kw: 'active power', current: 'current', existingPf: 'existing power factor',
  targetPf: 'target power factor', a: 'first known value', b: 'second known value', value: 'conversion value',
  powerUnit: 'power unit', phase: 'phase', mode: 'calculation mode', powerFactorType: 'power factor type',
};

const numberValue = (form: HTMLFormElement, name: string) => {
  const field = form.elements.namedItem(name) as HTMLInputElement | null;
  const value = field?.valueAsNumber;
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Enter a valid ${fieldLabels[name] ?? name}.`);
  }
  return value;
};

const stringValue = (form: HTMLFormElement, name: string) => {
  const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  if (!field?.value) throw new Error(`Select ${fieldLabels[name] ?? name}.`);
  return field.value;
};

const formatEngineering = (value: number, digits = 6) => {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-CA', { maximumSignificantDigits: digits }).format(value);
};

const formatSignedEngineering = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-CA', { maximumSignificantDigits: 6, signDisplay: 'exceptZero' }).format(value);
};

const showError = (form: HTMLFormElement, message: string) => {
  const error = form.querySelector<HTMLElement>('[data-error]');
  const result = form.querySelector<HTMLElement>('[data-result]');
  if (error) { error.textContent = message; error.hidden = false; }
  if (result) result.hidden = true;
};

const showOutputs = (form: HTMLFormElement, outputs: Record<string, number | string>) => {
  const error = form.querySelector<HTMLElement>('[data-error]');
  const result = form.querySelector<HTMLElement>('[data-result]');
  if (error) { error.textContent = ''; error.hidden = true; }
  Object.entries(outputs).forEach(([key, value]) => {
    const output = form.querySelector<HTMLElement>(`[data-output="${key}"]`);
    if (output) output.textContent = typeof value === 'number' ? formatEngineering(value) : value;
  });
  if (result) result.hidden = false;
};

const handleSubmit = (form: HTMLFormElement, calculate: () => Record<string, number | string>) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try { showOutputs(form, calculate()); }
    catch (error) { showError(form, error instanceof Error ? error.message : 'Unable to calculate a result.'); }
  });
};

document.querySelectorAll<HTMLFormElement>('[data-calculator="motor"]').forEach((form) => {
  const updateVoltageLabel = () => {
    const label = form.querySelector('[data-voltage-label]');
    const phase = (form.elements.namedItem('phase') as HTMLSelectElement).value;
    if (label) label.textContent = phase === 'three' ? 'Line-to-line voltage' : phase === 'single' ? 'Line voltage' : 'Voltage';
  };
  (form.elements.namedItem('phase') as HTMLSelectElement | null)?.addEventListener('change', updateVoltageLabel);
  updateVoltageLabel();
  handleSubmit(form, () => ({ current: motorCurrent({
    power: numberValue(form, 'power'),
    powerUnit: stringValue(form, 'powerUnit') as 'hp' | 'kw',
    voltage: numberValue(form, 'voltage'),
    phase: stringValue(form, 'phase') as Phase,
    powerFactor: numberValue(form, 'powerFactor'),
    efficiencyPercent: numberValue(form, 'efficiency'),
  }) }));
});

document.querySelectorAll<HTMLFormElement>('[data-calculator="transformer"]').forEach((form) => {
  const updateVoltageLabel = () => {
    const label = form.querySelector('[data-voltage-label]');
    const phase = (form.elements.namedItem('phase') as HTMLSelectElement).value;
    if (label) label.textContent = phase === 'three' ? 'Line-to-line voltage' : phase === 'single' ? 'Line voltage' : 'Voltage';
  };
  (form.elements.namedItem('phase') as HTMLSelectElement | null)?.addEventListener('change', updateVoltageLabel);
  updateVoltageLabel();
  handleSubmit(form, () => ({ current: transformerCurrent(
    numberValue(form, 'kva'), numberValue(form, 'voltage'), stringValue(form, 'phase') as Phase,
  ) }));
});

document.querySelectorAll<HTMLFormElement>('[data-calculator="ac-power"]').forEach((form) => {
  const modeSelect = form.elements.namedItem('mode') as HTMLSelectElement;
  const updateMode = () => {
    form.querySelectorAll<HTMLElement>('[data-ac-modes]').forEach((field) => {
      const active = field.dataset.acModes?.split(' ').includes(modeSelect.value) ?? false;
      field.hidden = !active;
      field.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select').forEach((control) => {
        control.disabled = !active;
        control.required = active;
      });
    });
    const result = form.querySelector<HTMLElement>('[data-result]');
    if (result) result.hidden = true;
  };
  modeSelect.addEventListener('change', updateMode);
  updateMode();
  handleSubmit(form, () => {
    const mode = stringValue(form, 'mode');
    const phase = () => stringValue(form, 'phase') as Phase;
    const pf = () => numberValue(form, 'powerFactor');
    const pfType = stringValue(form, 'powerFactorType') as PowerFactorType;
    const result = mode === 'vipf'
      ? acPowerFromVoltageCurrent(numberValue(form, 'voltage'), numberValue(form, 'current'), pf(), phase(), pfType)
      : mode === 'kwpf'
        ? acPowerFromKwPf(numberValue(form, 'kw'), pf(), pfType)
        : mode === 'kwkva'
          ? acPowerFromKwKva(numberValue(form, 'kw'), numberValue(form, 'kva'), pfType)
          : mode === 'kvapf'
            ? acPowerFromKvaPf(numberValue(form, 'kva'), pf(), pfType)
            : acCurrentFromPower(numberValue(form, 'voltage'), numberValue(form, 'kw'), pf(), phase(), pfType);
    const currentRow = form.querySelector<HTMLElement>('[data-current-row]');
    if (currentRow) currentRow.hidden = result.current === undefined;
    return { kw: result.kw, kva: result.kva, kvar: formatSignedEngineering(result.kvar), pf: result.pf, current: result.current ?? '' };
  });
});

document.querySelectorAll<HTMLFormElement>('[data-calculator="power-factor"]').forEach((form) => {
  handleSubmit(form, () => ({ kvar: powerFactorCorrection(
    numberValue(form, 'kw'), numberValue(form, 'existingPf'), numberValue(form, 'targetPf'),
  ) }));
});

document.querySelectorAll<HTMLFormElement>('[data-calculator="ohms"]').forEach((form) => {
  const modeSelect = form.elements.namedItem('mode') as HTMLSelectElement;
  const labels: Record<string, [string, string, string, string]> = {
    vr: ['Voltage', 'V', 'Resistance', 'Ω'], vi: ['Voltage', 'V', 'Current', 'A'], ir: ['Current', 'A', 'Resistance', 'Ω'],
    pv: ['Power', 'W', 'Voltage', 'V'], pi: ['Power', 'W', 'Current', 'A'], pr: ['Power', 'W', 'Resistance', 'Ω'],
  };
  const updateMode = () => {
    const values = labels[modeSelect.value];
    if (!values) return;
    ['aLabel', 'aUnit', 'bLabel', 'bUnit'].forEach((key, index) => {
      const element = form.querySelector<HTMLElement>(`[data-ohms="${key}"]`);
      if (element) element.textContent = values[index];
    });
  };
  modeSelect.addEventListener('change', updateMode);
  updateMode();
  handleSubmit(form, () => solveOhmsLaw(stringValue(form, 'mode'), numberValue(form, 'a'), numberValue(form, 'b')));
});

document.querySelectorAll<HTMLFormElement>('[data-calculator="converter"]').forEach((form) => {
  const group = form.elements.namedItem('group') as HTMLSelectElement;
  const from = form.elements.namedItem('fromUnit') as HTMLSelectElement;
  const to = form.elements.namedItem('toUnit') as HTMLSelectElement;
  const fillUnits = () => {
    const units = conversionGroups[group.value]?.units ?? {};
    const options = Object.entries(units).map(([value, unit]) => ({ value, label: unit.label }));
    [from, to].forEach((select, selectIndex) => {
      select.replaceChildren(...options.map(({ value, label }) => new Option(label, value)));
      select.selectedIndex = Math.min(selectIndex, options.length - 1);
    });
    const engineeringNote = document.querySelector<HTMLElement>('#converter-engineering-note');
    if (engineeringNote) engineeringNote.textContent = conversionNotes[group.value] ?? '';
    updateConversion();
  };
  const updateConversion = () => {
    try {
      const valueField = form.elements.namedItem('value') as HTMLInputElement;
      if (valueField.value === '') {
        const result = form.querySelector<HTMLElement>('[data-result]');
        if (result) result.hidden = true;
        return;
      }
      const converted = convertUnit(valueField.valueAsNumber, group.value, from.value, to.value);
      showOutputs(form, {
        converted,
        equation: `${formatEngineering(valueField.valueAsNumber)} ${from.selectedOptions[0]?.text ?? ''} = ${formatEngineering(converted)} ${to.selectedOptions[0]?.text ?? ''}`,
      });
    } catch (error) { showError(form, error instanceof Error ? error.message : 'Unable to convert this value.'); }
  };
  group.addEventListener('change', fillUnits);
  form.addEventListener('input', updateConversion);
  form.addEventListener('change', updateConversion);
  form.addEventListener('submit', (event) => { event.preventDefault(); updateConversion(); });
  fillUnits();
});
