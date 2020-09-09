import FingerPrint2 from 'fingerprintjs2';

const printableFingerPrintKeys = [
    "userAgent",
    "webdriver",
    "language",
    "screenResolution",
    "timezoneOffset",
    "timezone",
    "cpuClass",
    "platform",
    "plugins",
    "webglVendorAndRenderer",
    "adBlock",
    "hasLiedLanguages",
    "hasLiedResolution",
    "hasLiedOs",
    "hasLiedBrowser",
    "fonts"
];

const getFingerPrintComponents = () => {
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
};

export const getFilteredFingerPrintComponents = async () => {
    const components = await getFingerPrintComponents();
    const filteredComponents = components.filter(component => {
        return printableFingerPrintKeys.indexOf(component.key) >= 0;
    });
    return filteredComponents;
};

export const getPrintableFingerPrint = async function (ip) {
    const components = await getFilteredFingerPrintComponents();
    components.unshift({
        key: 'ip',
        value: ip
    });
    let printableFingerPrint = "Obviously your visit has been recorded, this is some data which has been stored:";
    components.forEach(component => {
        printableFingerPrint += `\n\r${component.key}: ${component.value}`;
    });
    return printableFingerPrint;
};
