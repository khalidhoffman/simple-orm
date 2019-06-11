import Store from 'simple-store';

export abstract class AbstractQuery<T = any> {
  store: Store = new Store();

  abstract execute(): Promise<T>
}
