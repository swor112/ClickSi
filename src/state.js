/* Shared app state. Values that several files read and change live on `state`. */
export const state = {
  CFG: null,
  user: null,
  items: [],
  inbox: [],
  draft: null,
  decT: null,
  toastT: undefined,
  adminAuthAt: 0,
  lastDue: null,
  installEvt: null,
};
