export default class Incrementor {
    constructor(value, max, rate, discrete) {
        this.GetValue = () => {
            let oldTimestamp = this._timeStamp;
            let newTimestamp = new Date().valueOf();
            if (this._discrete > 0) {
                return 0; // TODO: handle discrete increments
            }
            else {
                // TODO: handle max values
                let timeDiff = (newTimestamp - oldTimestamp) / 1000;
                let terms = this.getTerms(timeDiff);
                let totalNew = terms.map(t => t.Evaluate(timeDiff)).reduce((a, b) => a + b);
                this._value += totalNew;
                this._timeStamp = newTimestamp;
                return this._value;
            }
        };
        this.SetValue = (newValue) => {
            this._timeStamp = new Date().valueOf();
            this._value = newValue;
            this.onChange();
        };
        this.SetMax = (newMax) => {
            this._max = newMax;
            this.onChange();
        };
        this.AddRate = (newRate, newWeight = 1) => {
            this.onChange();
            if (typeof newRate === 'object') {
                if (newRate.checkDuplicate(this)) {
                    throw new Error('Circular reference attempt detected!');
                }
                newRate.addListener(this);
                this._rates.push({ Weight: newWeight, Source: newRate });
            }
            else {
                this._rates.push({ Weight: newRate, Source: null });
            }
        };
        this.addListener = (listener) => {
            this._listeners.push(listener);
        };
        this.removeListener = (listener) => {
            let index = this._listeners.indexOf(listener);
            if (index >= 0) {
                this._listeners.splice(index, 1);
            }
        };
        this.onChange = () => {
            this._value = this.GetValue();
            this._listeners.forEach((listener) => listener.onChange());
        };
        //private _terms: Term[];
        this.getTerms = (timeDiff) => {
            let terms = [];
            for (let rate of this._rates) {
                if (rate.Source != null) {
                    terms = terms.concat(rate.Source.getTerms(timeDiff).map(t => t.Integrate()));
                    // add a term to align to current value
                    let currentSourceValue = rate.Source.GetValue();
                    let sourceTerms = rate.Source.getTerms(timeDiff);
                    let projectedSourceValue = sourceTerms.map(t => t.Evaluate(timeDiff)).reduce((a, b) => a + b);
                    terms.push(new Term(currentSourceValue - projectedSourceValue, 1));
                }
                else {
                    terms.push(new Term(rate.Weight, 1));
                }
            }
            return terms;
        };
        this._timeStamp = new Date().valueOf();
        this._value = value;
        this._max = max;
        this._rates = [];
        this._discrete = discrete;
        this._listeners = [];
        if (rate != null) {
            if (typeof rate === 'number') {
                this._rates.push({ Weight: rate, Source: null });
            }
            else {
                this._rates.push({ Weight: 1, Source: rate });
            }
        }
    }
    ClearRate(oldRate) {
        var _a;
        let oldIndex = this._rates.findIndex(r => (typeof oldRate === 'number' ? r.Weight : r.Source) === oldRate);
        if (oldIndex >= 0) {
            this.onChange();
            (_a = this._rates[oldIndex].Source) === null || _a === void 0 ? void 0 : _a.removeListener(this);
            this._rates.splice(oldIndex, 1);
        }
    }
    ClearRates() {
        var _a;
        this.onChange();
        for (let rate of this._rates) {
            (_a = rate.Source) === null || _a === void 0 ? void 0 : _a.removeListener(this);
        }
        this._rates = [];
    }
    checkDuplicate(toCheck) {
        for (let rate of this._rates.map(r => r.Source)) {
            if (typeof rate === 'object') {
                if (rate === toCheck || rate.checkDuplicate(toCheck)) {
                    return true;
                }
            }
        }
        return false;
    }
}
class Rate {
}
export class Term {
    constructor(mantissa, power) {
        this.Integrate = (times = 1) => {
            let newPower = this.Power;
            let newMantissa = this.Mantissa;
            for (; times > 0; times--) {
                newPower += 1;
                newMantissa = newMantissa / newPower;
            }
            return new Term(newMantissa, newPower);
        };
        this.Mantissa = mantissa;
        this.Power = power;
    }
    Evaluate(input) {
        if (input < this.MinInput || input > this.MaxInput) {
            return 0;
        }
        return Math.pow(input, this.Power) * this.Mantissa;
    }
}
//# sourceMappingURL=incremental.js.map