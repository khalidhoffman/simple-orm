import * as _ from 'lodash';

export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}

export function isArray(value): boolean {
  return Array.isArray(value);
}

export function isObject<V = object>(value): boolean {
  return _.isObject(value);
}

export function isPrimitive(value): value is string | boolean | number {
  return (typeof value !== 'object' && typeof value !== 'function') || value === null
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

export const map = _.map;
export const reduce = _.reduce;
export const forEach = _.forEach;
export const get = _.get;
export const last = _.last;
export const mapObject = _.reduce;
