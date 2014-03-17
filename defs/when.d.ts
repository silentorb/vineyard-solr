
interface Deferred {
  promise: Promise;
  resolve(...args:any[]);
}

interface Promise {
  then(success, error?):Promise;
  map(...args:any[]):Promise;
  done(success, error?);
  otherwise(error);
}

declare module "when" {
  function defer(): Deferred;
  function map(list, action);
  function all(list);
}