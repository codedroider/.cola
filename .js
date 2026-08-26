// DONT FORGOT TO "CONST" YOUR PASSWORD ("const password = 'ur_here!';")

async function colaUse(file, password) {
    try {
        const fileBytes = await file.arrayBuffer();

        const base64String = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const rawBase64 = reader.result.split(',')[1];
                resolve(rawBase64);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(new Blob([fileBytes]));
        });

        const encoder = new TextEncoder();
        const dataToEncrypt = encoder.encode(base64String);

        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
        );

        const encryptedBytes = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            dataToEncrypt
        );

        const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedBytes.byteLength);
        resultBuffer.set(salt, 0);
        resultBuffer.set(iv, salt.length);
        resultBuffer.set(new Uint8Array(encryptedBytes), salt.length + iv.length);

        const encryptedBlob = new Blob([resultBuffer], { type: "application/octet-stream" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(encryptedBlob);
        link.download = file.name + ".cola";
        link.click();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function colaUsed(file, password) {
    try {
        const fileBytes = await file.arrayBuffer();
        const fullBuffer = new Uint8Array(fileBytes);

        const salt = fullBuffer.slice(0, 16);
        const iv = fullBuffer.slice(16, 16 + 12);
        const encryptedData = fullBuffer.slice(16 + 12);

        const encoder = new TextEncoder();
        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        const decryptedBytes = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            encryptedData
        );

        const decoder = new TextDecoder();
        const base64String = decoder.decode(decryptedBytes);

        const response = await fetch(`data:application/octet-stream;base64,${base64String}`);
        const originalBlob = await response.blob();

        const originalName = file.name.replace(/\.cola$/, '');

        const link = document.createElement('a');
        link.href = URL.createObjectURL(originalBlob);
        link.download = originalName;
        link.click();
    } catch (error) {
        console.error(error);
        throw error;
    }
}
