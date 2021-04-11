
export default class Incrementor {
    private _baseTime: number;
    private _timeStamp: number; // time value was last updated, with millisecond precision
    private _value: number;
    private _max: number;
    private _rates: Rate[];
    private _discrete: number;
    private _listeners: Incrementor[];
    private _terms: Term[];

    public constructor(value: number, max?: number, rate?: number | Incrementor, discrete?: number, startTime?: number) {
        this._baseTime = startTime || Date.now().valueOf() / 1000;
        this._timeStamp = this._baseTime;
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

    public GetValue = (atTime?: number) => {
        let oldTimestamp = this._timeStamp;
        let newTimestamp = atTime || Date.now().valueOf() / 1000;

        if (this._discrete > 0) {
            return 0; // TODO: handle discrete increments
        } else {
            // TODO: handle max values
            let terms = this.getSourceTerms(oldTimestamp, newTimestamp);

            let totalNew = terms.map(t => t.Evaluate(newTimestamp - this._baseTime) - t.Evaluate(oldTimestamp - this._baseTime)).reduce((a,b) => a + b);
            this._value += totalNew;
            this._timeStamp = newTimestamp;

            return this._value;
        }
    }

    public SetValue = (newValue: number, atTime?: number) => {
        this._timeStamp = atTime || Date.now().valueOf() / 1000;
        this._value = newValue;

        this.onChange(atTime);
    }

    public SetMax = (newMax: number, atTime?: number) => {
        this._max = newMax;

        this.onChange(atTime);
    }

    public AddRate = (newRate: number | Incrementor, newWeight: number = 1, atTime?: number) => {
        this.onChange(atTime);

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

    public ClearRate(oldRate: number | Incrementor, atTime?: number) {
        let oldIndex = this._rates.findIndex(r => (typeof oldRate === 'number' ? r.Weight : r.Source) === oldRate);
        if (oldIndex >= 0) {
            this.onChange(atTime);

            this._rates[oldIndex].Source?.removeListener(this);
            this._rates.splice(oldIndex, 1);
        }
    }

    public ClearRates(atTime?: number) {
        this.onChange(atTime);

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

    private onChange = (time: number) => {
        this._value = this.GetValue(time);

        this._listeners.forEach((listener) => listener.onChange(time));
    }

    private getSourceTerms = (startTime: number, endTime: number) => {
        let terms = [];
        for (let rate of this._rates) {
            if (rate.Source != null) {
                terms = terms.concat(rate.Source.getTerms(startTime, endTime).map(t => t.Integrate()));

                // old method using diff
                // // add a term to align to current value
                // let currentSourceValue = rate.Source.GetValue(endTime);
                // let sourceTerms = rate.Source.getTerms(startTime, endTime);
                // let projectedSourceValue = sourceTerms.map(t => t.Evaluate(endTime - startTime)).reduce((a, b) => a + b);
                // terms.push(new Term(currentSourceValue - projectedSourceValue, 1))
            } else {
                terms.push(new Term(rate.Weight, 1));
            }
        }

        return terms;
    }

    // TODO: this should only return self-terms for discrete or maxed
    protected getTerms = (startTime: number, endTime: number) => {
        let terms = [];
        for (let rate of this._rates) {
            if (rate.Source != null) {
                terms = terms.concat(rate.Source.getTerms(startTime, endTime).map(t => t.Integrate()));

                // old method using diff
                // // add a term to align to current value
                // let currentSourceValue = rate.Source.GetValue(endTime);
                // let sourceTerms = rate.Source.getTerms(startTime, endTime);
                // let projectedSourceValue = sourceTerms.map(t => t.Evaluate(endTime - startTime)).reduce((a, b) => a + b);
                // terms.push(new Term(currentSourceValue - projectedSourceValue, 1))
            } else {
                terms.push(new Term(rate.Weight, 1));
            }
        }

        return terms;
    }
}

class Rate {
    public Weight: number;
    public Source: Incrementor;
}

export class Term {
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

