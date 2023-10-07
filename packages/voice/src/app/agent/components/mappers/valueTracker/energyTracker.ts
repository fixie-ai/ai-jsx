import { IScalarTracker } from "./common";

export class EnergyTracker implements IScalarTracker {
  private readonly _energyInfo: { current: number };

  constructor(energyInfo: { current: number }) {
    this._energyInfo = energyInfo;
  }
  public getNormalizedValue(): number {
    return this._energyInfo.current;
  }
}
