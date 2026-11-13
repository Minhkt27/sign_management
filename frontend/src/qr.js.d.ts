declare module 'qr.js' {
  export interface QRCodeOptions {
    typeNumber?: number;
    errorCorrectLevel?: number;
  }

  export interface QRCodeInstance {
    modules: boolean[][];
  }

  function qr(data: string, options?: QRCodeOptions): QRCodeInstance;

  namespace qr {
    export const ErrorCorrectLevel: {
      L: number;
      M: number;
      Q: number;
      H: number;
    };
  }

  export default qr;
}
