import { STEPS } from './config.js';

export function renderStepper(container, currentStep) {
  container.innerHTML = '';
  container.setAttribute('role', 'list');

  STEPS.forEach((step, index) => {
    const item = document.createElement('div');
    item.className = 'stepper__item';
    item.setAttribute('role', 'listitem');

    if (step.id < currentStep) item.classList.add('stepper__item--completed');
    if (step.id === currentStep) item.classList.add('stepper__item--active');

    const node = document.createElement('div');
    node.className = 'stepper__node';

    const num = document.createElement('span');
    num.className = 'stepper__num';
    num.textContent = step.id < currentStep ? '✓' : step.num;

    const label = document.createElement('span');
    label.className = 'stepper__label';
    label.textContent = step.label;

    node.appendChild(num);
    node.appendChild(label);
    item.appendChild(node);

    if (index < STEPS.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'stepper__connector';
      connector.setAttribute('aria-hidden', 'true');
      item.appendChild(connector);
    }

    container.appendChild(item);
  });
}

export function scrollStepperToActive(container) {
  const active = container.querySelector('.stepper__item--active');
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}
