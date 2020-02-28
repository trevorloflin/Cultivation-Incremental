
export default class Incrementor {
    private _timeStamp: number;
    private _base: number;
    private _rates: (number | Incrementor)[];
    private _discrete: boolean;
    private _listeners: Incrementor[];

    public constructor(base: number, rate: number | Incrementor, discrete: boolean) {
        this._timeStamp = new Date().valueOf();
        this._base = base;
        this._rates = [];
        this._discrete = discrete;
        this._listeners = [];

        this._rates.push(rate);
    }

    public GetCurrentValue: () => number = () => {
        
    }

    public SetBase = (newBase: number) => {
        this._timeStamp = new Date().valueOf();

        this._base = newBase;

        this._listeners.forEach((listener) => listener.onChange());
    }

    public AddRate = (newRate: number | Incrementor) => {
        if (typeof newRate === 'object' && newRate.checkDuplicate(this)) {
            throw new Error('Circular reference attempt detected!');
        }

        this._timeStamp = new Date().valueOf();

        this._base = this.GetCurrentValue();

        this._rates.push(newRate);

        if (typeof newRate === 'object') {
            newRate.addListener(this);
        }

        this._listeners.forEach((listener) => listener.onChange());
    }

    public ClearRate(oldRate: number | Incrementor) {
        
    }

    public ClearRates() {

    }

    private checkDuplicate(toCheck: Incrementor) {
        for (let rate of this._rates) {
            if (typeof rate === 'object') {
                if (rate === toCheck || rate.checkDuplicate(toCheck)) {
                    return true;
                }
            }
        }

        return false;
    }

    private addListener = (listener: Incrementor) => {
        this._listeners.push(listener);
    }
    private removeListener = (listener: Incrementor) => {
        let index = this._listeners.indexOf(listener);
        if (index >= 0) {
            this._listeners.splice(index, 1);
        }
    }

    private onChange = () => {

    }
}