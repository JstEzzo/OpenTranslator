#!/usr/bin/env python3
"""
Decryptor framework for custom-encrypted Unity AssetBundles.

Many IL2CPP games ship their Addressable bundles encrypted by a custom
ResourceProvider, so the file does NOT begin with the ``UnityFS`` magic and
UnityPy cannot open it. This module recognises such bundles and returns the
decrypted ``UnityFS`` bytes; the sidecar then loads them from a ``BytesIO``.

Design: every scheme is **self-validating** — it only claims a bundle when its
decryption of the first block yields the ``UnityFS`` magic. So detection can't
misfire on a genuine ``UnityFS`` bundle or on the wrong scheme, and a bundle that
already starts with ``UnityFS`` is passed through untouched (no regression for
plain Unity games). Schemes are reversible (``encrypt``) for write-back.

See docs/unity-il2cpp-bundle-crypto.md for the reverse-engineering write-up.
"""
import hashlib
import os
import struct

UNITYFS = b"UnityFS"


def _stem(filename):
    """Path.GetFileNameWithoutExtension(filename)."""
    return os.path.splitext(os.path.basename(filename))[0]


class SeekableAesScheme:
    """The widely-copied "SeekableAesStream" gist used as a whole-file cipher:
    AES-128 used as a CTR keystream, key = PBKDF1-SHA1(password, salt), where
    ``salt = utf8(filenameWithoutExtension)`` (so the key is per-file). Keystream
    block ``b`` (0-based) = AES-ECB(LE64(b+1) ‖ zeros(8)); plain = cipher XOR ks.
    Encryption and decryption are the same XOR operation.

    Passwords are tried from a small list; the gist's stock value is "password"
    (left unchanged by many games). The scheme self-validates on the UnityFS magic.
    """

    name = "seekable-aes"
    # Common/stock passwords. The canonical gist ships "password"; add more here
    # as other games are observed (the magic check makes a wrong guess harmless).
    PASSWORDS = ("password",)

    def __init__(self):
        self._password = None  # bound on first successful detect (per game)

    @staticmethod
    def _derive_key(password, salt, iterations=100):
        # .NET PasswordDeriveBytes (PBKDF1/SHA1): h=SHA1(pw||salt); repeat; key=h[:16]
        h = hashlib.sha1(password.encode("utf-8") + salt).digest()
        for _ in range(iterations - 1):
            h = hashlib.sha1(h).digest()
        return h[:16]

    @staticmethod
    def _keystream(key, nbytes):
        from Crypto.Cipher import AES

        nblocks = (nbytes + 15) // 16
        # Build all CTR nonces in one buffer, AES-ECB them in a single call.
        nonces = bytearray(nblocks * 16)
        for b in range(nblocks):
            struct.pack_into("<q", nonces, b * 16, b + 1)  # rest stays zero
        ks = AES.new(key, AES.MODE_ECB).encrypt(bytes(nonces))
        return ks[:nbytes]

    @classmethod
    def _xor(cls, data, key):
        ks = cls._keystream(key, len(data))
        n = len(data)
        return (int.from_bytes(data, "big") ^ int.from_bytes(ks, "big")).to_bytes(n, "big")

    def detect(self, head, filename):
        """Return True if some password decrypts this bundle's first block to UnityFS."""
        if head[:7] == UNITYFS:
            return False  # already plaintext — never claim it (defense-in-depth)
        salt = _stem(filename).encode("utf-8")
        for pw in self.PASSWORDS:
            key = self._derive_key(pw, salt)
            if self._xor(head[:16], key).startswith(UNITYFS):
                self._password = pw
                return True
        return False

    def decrypt(self, data, filename):
        salt = _stem(filename).encode("utf-8")
        pw = self._password or self.PASSWORDS[0]
        return self._xor(data, self._derive_key(pw, salt))

    # CTR XOR is symmetric — re-encrypt with the same operation.
    encrypt = decrypt


class RepeatingXorScheme:
    """Generic fallback: a repeating-key XOR over the whole file. Recovers the key
    from the known ``UnityFS\\x00`` + 4-byte-format prefix and tries key periods up
    to 64; self-validates on the UnityFS magic after a full decrypt. Catches the
    other common "lightweight obfuscation" family (not this game, but many others)."""

    name = "repeating-xor"
    # 12 reliably-known plaintext header bytes: "UnityFS\0" + format-version int32 BE.
    # The format byte varies (6/7/8); try the common values.
    _KNOWN = [UNITYFS + b"\x00" + bytes([0, 0, 0, v]) for v in (6, 7, 8)]

    def __init__(self):
        self._key = None

    def detect(self, head, filename):
        if head[:7] == UNITYFS:
            return False  # already plaintext — the all-zero "key" would be a no-op anyway
        for known in self._KNOWN:
            n = len(known)
            if len(head) < n:
                continue
            ks = bytes(head[i] ^ known[i] for i in range(n))  # candidate keystream prefix
            for period in range(1, n):
                if all(ks[i] == ks[i % period] for i in range(n)):
                    key = ks[:period]
                    if self._apply(head[:n], key).startswith(UNITYFS):
                        self._key = key
                        return True
        return False

    def _apply(self, data, key):
        klen = len(key)
        return bytes(data[i] ^ key[i % klen] for i in range(len(data)))

    def decrypt(self, data, filename):
        return self._apply(data, self._key)

    encrypt = decrypt


# Order matters: most-specific first. AES is self-validating (magic check), so it
# never claims a plain or XOR bundle.
_SCHEMES = (SeekableAesScheme, RepeatingXorScheme)


class BundleCrypto:
    """Per-extraction decryptor. Caches the scheme that matched the first encrypted
    bundle and reuses it for the rest (one game uses one scheme), but still
    validates each file's magic, so a stray plain bundle is passed through."""

    def __init__(self):
        self._scheme = None  # a bound scheme instance once detected

    @staticmethod
    def is_unityfs(head):
        return head[:7] == UNITYFS

    def decrypt_bytes(self, data, filename):
        """Return (plaintext_unityfs_bytes, scheme_name) or (data, None) if the
        bundle is already UnityFS / no scheme recognises it."""
        if self.is_unityfs(data):
            return data, None
        head = data[:32]
        # Reuse a previously-matched scheme if it still validates this file.
        if self._scheme is not None and self._scheme.detect(head, filename):
            return self._scheme.decrypt(data, filename), self._scheme.name
        for cls in _SCHEMES:
            s = cls()
            if s.detect(head, filename):
                self._scheme = s
                return s.decrypt(data, filename), s.name
        return data, None

    @property
    def scheme_name(self):
        return self._scheme.name if self._scheme else None

    def encrypt_bytes(self, unityfs_data, filename):
        """Re-encrypt UnityFS bytes with the matched scheme (for write-back).
        Raises if no scheme was matched (caller must only call after a decrypt)."""
        if self._scheme is None:
            raise RuntimeError("encrypt_bytes called before any scheme was detected")
        return self._scheme.encrypt(unityfs_data, filename)
