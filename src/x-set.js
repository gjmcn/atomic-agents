////////////////////////////////////////////////////////////////////////////////
// XSet class.
////////////////////////////////////////////////////////////////////////////////

export class XSet extends Set {
	
  copy() {
    return new XSet(this);
  }

  adds(u) {
    for (let e of u) {
      this.add(e);
    }
    return this;
  }

  deletes(u) {
    for (let e of u) {
      this.delete(e);
    }
    return this;
  }
	
	filter(f, returnArray) {
    let r, methodName;
    if (returnArray) {
      r = [];
      methodName = 'push';
    }
    else {
      r = new XSet();
      methodName = 'add';
    }
    for (let e of this) {
      if (f(e)) {
        r[methodName](e);
      }
    }
    return r;
	}

  find(f) {
		for (let e of this) {
			if (f(e)) {
        return e;
      }
		}
	}

  every(f) {
    for (let e of this) {
      if (!f(e)) {
        return false;
      }
    }
    return true;
  }

  some(f) {
    for (let e of this) {
      if (f(e)) {
        return true;
      }
    }
    return false;
  }

  first() {
    return this.values().next().value;
  }


  // ========== set theory methods ==========
  // adapted from: https://github.com/d3/d3-array
  
  difference(...others) {
    const values = new XSet(this);
    for (const other of others) {
      for (const value of other) {
        values.delete(value);
      }
    }
    return values;
  }

  intersection(...others) {
    const values = new XSet(this);
    others = others.map(other => other instanceof Set ? other : new Set(other));
    out: for (const value of values) {
      for (const other of others) {
        if (!other.has(value)) {
          values.delete(value);
          continue out;
        }
      }
    }
    return values;
  }

  union(...others) {
    const values = new XSet(this);
    for (const other of others) {
      for (const o of other) {
        values.add(o);
      }
    }
    return values;
  }
	
}