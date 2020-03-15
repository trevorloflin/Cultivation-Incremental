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
                let terms = this.getTerms();
                let total = this._value;
                for (let term of terms) {
                    total += term.Evaluate(newTimestamp / 1000) - term.Evaluate(oldTimestamp / 1000);
                }
                this._timeStamp = newTimestamp;
                this._value = total;
                return this._value;
            }
        };
        this.SetValue = (newValue) => {
            this._timeStamp = new Date().valueOf();
            this._value = newValue;
            this._terms = null;
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
        this.getTerms = () => {
            if (this._terms == null) {
                this._terms = [];
                for (let rate of this._rates) {
                    if (rate.Source != null) {
                        this._terms.concat(rate.Source.getTerms().map(t => t.Integrate()));
                    }
                    else {
                        this._terms.push(new Term(rate.Weight, 1));
                    }
                }
                // add a term to align to current value
                let offset = 0;
                for (let term of this._terms) {
                    offset += term.Evaluate(this._timeStamp / 1000);
                }
                this._terms.push(new Term(this._value - offset, 0));
            }
            return this._terms;
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
class Term {
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