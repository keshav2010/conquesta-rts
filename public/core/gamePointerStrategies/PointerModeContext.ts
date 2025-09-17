import { container, injectable } from "tsyringe";
import { IPointerStrategy } from "../pointerStrategy";
import { DefaultPointerModeStrategy } from "./DefaultPointerModeStrategy";

@injectable()
export class PointerModeContext {
    private strategy!: IPointerStrategy;

    setStrategy(strategy: IPointerStrategy) {
        console.log('  Attempting to update strategy to ', strategy.name)
        this.strategy = strategy || container.resolve(DefaultPointerModeStrategy);
    }

    getStrategy(): IPointerStrategy {
        return this.strategy;
    }

    pointerdown(...args: Parameters<IPointerStrategy["pointerdown"]>) {
        this.strategy.pointerdown(...args);
    }
    pointermove(...args: Parameters<IPointerStrategy["pointermove"]>) {
        this.strategy.pointermove(...args);
    }
    pointerup(...args: Parameters<IPointerStrategy["pointerup"]>) {
        this.strategy.pointerup(...args);
    }
    pointerout(...args: Parameters<IPointerStrategy["pointerout"]>) {
        this.strategy.pointerout(...args);
    }
}
