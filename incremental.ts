
export default class Incrementor {
    private _timeStamp: number; // time value was last updated, with millisecond precision
    private _value: number;
    private _max: number;
    private _rates: Rate[];
    private _discrete: number;
    private _listeners: Incrementor[];

    public constructor(value: number, max: number, rate?: number | Incrementor, discrete?: number) {
        this._timeStamp = new Date().valueOf();
        this._value = value;
        this._max = max;
        this._rates = [];
        this._discrete = discrete;
        this._listeners = [];

        if (rate != null) {
            if (typeof rate === 'number') {
                this._rates.push({ Weight: rate, Source: null });
            } else {
                this._rates.push({ Weight: 1, Source: rate });
            }
        }
    }

    public GetValue: () => number = () => {
        let oldTimestamp = this._timeStamp;
        let newTimestamp = new Date().valueOf();

        if (this._discrete > 0) {
            return 0; // TODO: handle discrete increments
        } else {
            // TODO: handle max values

            let terms = this.getTerms(oldTimestamp);

            let total = this._value;
            for (let term of terms) {
                total += term.Evaluate(newTimestamp / 1000) - term.Evaluate(oldTimestamp / 1000);
            }
            this._timeStamp = newTimestamp;
            this._value = total;

            return this._value;
        }
    }


    public SetValue = (newValue: number) => {
        this._timeStamp = new Date().valueOf();
        this._value = newValue;
        this._terms = null;

        this.onChange();
    }

    public SetMax = (newMax: number) => {
        this._max = newMax;

        this.onChange();
    }

    public AddRate = (newRate: number | Incrementor, newWeight: number = 1) => {
        this.onChange();

        if (typeof newRate === 'object') {
            if (newRate.checkDuplicate(this)) {
                throw new Error('Circular reference attempt detected!');
            }
            newRate.addListener(this);

            this._rates.push({ Weight: newWeight, Source: newRate });
        } else {
            this._rates.push({ Weight: newRate, Source: null });
        }
    }

    public ClearRate(oldRate: number | Incrementor) {
        let oldIndex = this._rates.findIndex(r => (typeof oldRate === 'number' ? r.Weight : r.Source) === oldRate);
        if (oldIndex >= 0) {
            this.onChange();

            this._rates[oldIndex].Source?.removeListener(this);
            this._rates.splice(oldIndex, 1);
        }
    }

    public ClearRates() {
        this.onChange();

        for (let rate of this._rates) {
            rate.Source?.removeListener(this);
        }
        this._rates = [];
    }

    private checkDuplicate(toCheck: Incrementor) {
        for (let rate of this._rates.map(r => r.Source)) {
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
        this._value = this.GetValue();

        this._listeners.forEach((listener) => listener.onChange());
    }

    private _terms: Term[];
    protected getTerms = (baseInput: number) => {
        if (this._terms == null) {
            this._terms = [];
            for (let rate of this._rates) {
                if (rate.Source != null) {
                    this._terms = this._terms.concat(rate.Source.getTerms(baseInput).map(t => t.Integrate()));
                } else {
                    this._terms.push(new Term(rate.Weight, 1));
                }
            }

            // add a term to align to current value
            let offset = 0;
            for (let term of this._terms) {
                offset += term.Evaluate((this._timeStamp - baseInput) / 1000);
            }
            this._terms.push(new Term(this._value - offset, 0));
        }

        return this._terms;
    }
}

class Rate {
    public Weight: number;
    public Source: Incrementor;
}

class Term {
    public Mantissa: number;
    public Power: number;
    public MinInput: number;
    public MaxInput: number;

    public constructor(mantissa: number, power: number) {
        this.Mantissa = mantissa;
        this.Power = power;
    }

    public Evaluate(input: number) {
        if (input < this.MinInput || input > this.MaxInput) {
            return 0;
        }

        return Math.pow(input, this.Power) * this.Mantissa;
    }

    public Integrate = (times: number = 1) => {
        let newPower = this.Power;
        let newMantissa = this.Mantissa;

        for (; times > 0; times--) {
            newPower += 1;
            newMantissa = newMantissa / newPower;
        }

        return new Term(newMantissa, newPower);
    }
}

