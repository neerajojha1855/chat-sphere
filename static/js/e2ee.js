const E2EE = (() => {
    const ALGO = "RSA-OAEP";
    const AES_ALGO = "AES-GCM";

    // Helper: ArrayBuffer to Base64
    function bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    // Helper: Base64 to ArrayBuffer
    function base64ToBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async function generateRSAKeys() {
        return await window.crypto.subtle.generateKey(
            {
                name: ALGO,
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async function exportPublicKey(key) {
        const exported = await window.crypto.subtle.exportKey("spki", key);
        return bufferToBase64(exported);
    }

    async function exportPrivateKey(key) {
        const exported = await window.crypto.subtle.exportKey("pkcs8", key);
        return bufferToBase64(exported);
    }

    async function importPublicKey(pemBase64) {
        const binaryDer = base64ToBuffer(pemBase64);
        return await window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            { name: ALGO, hash: "SHA-256" },
            true,
            ["encrypt"]
        );
    }

    async function importPrivateKey(pemBase64) {
        const binaryDer = base64ToBuffer(pemBase64);
        return await window.crypto.subtle.importKey(
            "pkcs8",
            binaryDer,
            { name: ALGO, hash: "SHA-256" },
            true,
            ["decrypt"]
        );
    }

    let localPrivateKey = null;
    let localPublicKey = null;

    async function setupE2EE(userId, csrfToken) {
        const privKeyStr = localStorage.getItem(`e2ee_priv_${userId}`);
        const pubKeyStr = localStorage.getItem(`e2ee_pub_${userId}`);

        if (privKeyStr && pubKeyStr) {
            localPrivateKey = await importPrivateKey(privKeyStr);
            localPublicKey = pubKeyStr;
        } else {
            console.log("Generating new E2EE keys...");
            const keyPair = await generateRSAKeys();
            localPublicKey = await exportPublicKey(keyPair.publicKey);
            const exportedPriv = await exportPrivateKey(keyPair.privateKey);
            
            localStorage.setItem(`e2ee_priv_${userId}`, exportedPriv);
            localStorage.setItem(`e2ee_pub_${userId}`, localPublicKey);
            localPrivateKey = keyPair.privateKey;

            // Send to server
            await fetch('/users/api/public-key/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ public_key: localPublicKey })
            });
        }
        return localPublicKey;
    }

    async function encryptMessage(text, myId, myPubKeyBase64, otherId, otherPubKeyBase64) {
        const enc = new TextEncoder();
        const encodedText = enc.encode(text);

        // Generate AES-GCM key
        const aesKey = await window.crypto.subtle.generateKey(
            { name: AES_ALGO, length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            { name: AES_ALGO, iv: iv },
            aesKey,
            encodedText
        );

        // Export AES key
        const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

        // Encrypt AES key for me
        const myPubKey = await importPublicKey(myPubKeyBase64);
        const encryptedKeyForMe = await window.crypto.subtle.encrypt(
            { name: ALGO },
            myPubKey,
            rawAesKey
        );

        // Encrypt AES key for other
        let encryptedKeyForOther = null;
        if (otherPubKeyBase64 && otherId !== myId) {
            const otherPubKey = await importPublicKey(otherPubKeyBase64);
            encryptedKeyForOther = await window.crypto.subtle.encrypt(
                { name: ALGO },
                otherPubKey,
                rawAesKey
            );
        }

        const keys = {};
        keys[myId] = bufferToBase64(encryptedKeyForMe);
        if (encryptedKeyForOther) {
            keys[otherId] = bufferToBase64(encryptedKeyForOther);
        }

        return JSON.stringify({
            v: 1,
            iv: bufferToBase64(iv),
            ciphertext: bufferToBase64(ciphertextBuffer),
            keys: keys
        });
    }

    async function decryptMessage(jsonStr, myId) {
        try {
            const data = JSON.parse(jsonStr);
            if (data.v !== 1 || !data.keys || !data.ciphertext || !data.iv) {
                return jsonStr; // Probably plaintext fallback
            }

            const myEncryptedKeyBase64 = data.keys[myId];
            if (!myEncryptedKeyBase64) {
                return "[Message cannot be decrypted. Key not found.]";
            }

            const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
                { name: ALGO },
                localPrivateKey,
                base64ToBuffer(myEncryptedKeyBase64)
            );

            const aesKey = await window.crypto.subtle.importKey(
                "raw",
                rawAesKeyBuffer,
                { name: AES_ALGO },
                false,
                ["decrypt"]
            );

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: AES_ALGO, iv: base64ToBuffer(data.iv) },
                aesKey,
                base64ToBuffer(data.ciphertext)
            );

            const dec = new TextDecoder();
            return dec.decode(decryptedBuffer);

        } catch (e) {
            console.error("Decryption error:", e);
            return "[Decryption Error]";
        }
    }

    return {
        setupE2EE,
        encryptMessage,
        decryptMessage,
        getLocalPublicKey: () => localPublicKey
    };
})();
