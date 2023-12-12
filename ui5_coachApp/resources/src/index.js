import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

window.startScan = async () => {

    await BarcodeScanner.checkPermission({ force: true });

    BarcodeScanner.hideBackground();

    document.querySelector('html').classList.add('scanner-active');
    document.querySelector('body').classList.remove('sapUiBody');

    const result = await BarcodeScanner.startScan();

    document.querySelector('html').classList.remove('scanner-active');
    document.querySelector('body').classList.add('sapUiBody');

    if (result.hasContent) {
        try {
            const creds = result.content.charCodeAt(0) === 0xFEFF ? JSON.parse(result.content.slice(1)): JSON.parse(result.content) // utf BOM
            if (!creds.name || !creds.authToken) throw new Error()
            return creds
        } catch (e) {
            throw new Error('INVALID_CODE')
        }
    }
};