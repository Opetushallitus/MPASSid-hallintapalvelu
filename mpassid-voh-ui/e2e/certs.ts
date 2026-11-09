import "reflect-metadata";
import * as x509 from "@peculiar/x509";
import { webcrypto } from "node:crypto";

// Itse allekirjoitettuja testisertifikaatteja, joiden voimassaolo lasketaan
// ajohetkestä - kiinteä sertifikaatti vanhenisi tai siirtyisi toiseen
// varoitusluokkaan ajan myötä (Validators.tsx validateCertText: ei vielä
// voimassa / vanhentunut / voimassa alle 6 kk). Ei käytetä mihinkään
// tietoturvaan liittyvään.

x509.cryptoProvider.set(webcrypto as unknown as Crypto);

const DAY_MS = 24 * 60 * 60 * 1000;

const algorithm = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
};

/** Base64-runko (ilman PEM-otsakkeita) sertifikaatille, voimassa annetut päivät ajohetkestä. */
export async function testCertificate(validFromDays: number, validToDays: number): Promise<string> {
  const keys = (await webcrypto.subtle.generateKey(algorithm, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const now = Date.now();
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: "01",
    name: "CN=mpassid-e2e-test",
    notBefore: new Date(now + validFromDays * DAY_MS),
    notAfter: new Date(now + validToDays * DAY_MS),
    signingAlgorithm: algorithm,
    keys,
  });
  return cert.toString("base64");
}
