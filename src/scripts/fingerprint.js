import FingerPrint2 from 'fingerprintjs2';
export function getFingerPrintComponents(){
    return new Promise((resolve, reject) => {
        if (window.requestIdleCallback) {
            requestIdleCallback(function () {
                FingerPrint2.get(function (components) {
                    return resolve(components);
                });
            });
        } else {
            setTimeout(function () {
                FingerPrint2.get(function (components) {
                    return resolve(components);
                });
            }, 500);
        }
    });
}
