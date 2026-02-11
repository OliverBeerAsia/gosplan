// BuildingPanel is integrated into Toolbar.ts
// This module provides the building info tooltip on hover

import { BuildingRegistry } from '../buildings/BuildingRegistry';

export class BuildingTooltip {
  private el: HTMLDivElement;

  constructor(container: HTMLElement, private registry: BuildingRegistry) {
    this.el = document.createElement('div');
    this.el.className = 'help-text';
    this.el.style.display = 'none';
    container.appendChild(this.el);
  }

  show(buildingId: string): void {
    const def = this.registry.get(buildingId);
    if (!def) return;

    let text = `${def.name} (${def.width}x${def.height}) - ${def.cost.toLocaleString()}\u20BD`;
    if (def.housingCapacity) text += ` | Housing: ${def.housingCapacity}`;
    if (def.powerGeneration) text += ` | Power: +${def.powerGeneration}MW`;
    if (def.powerConsumption) text += ` | Power: -${def.powerConsumption}MW`;
    if (def.industrialOutput) text += ` | Output: ${def.industrialOutput}\u20BD/wk`;

    this.el.textContent = text;
    this.el.style.display = 'block';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
