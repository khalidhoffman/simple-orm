export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}

export function isSameMeta(metaA: IMeta, meta2: IMeta) {
  return metaA === meta2;
}

export function getInverseFnPropertyName(fn: Function) {
  const fnText = fn.toString();
  const propertyNameRegExp = /\.(.+)$/;
  return propertyNameRegExp.test(fnText) ? fnText.match(propertyNameRegExp)[1] : undefined;
}


export function uuidGen(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
