import {test} from "node:test";
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {parseTotp,seal,totpNow,unseal} from "../artifacts/private-dashboard/src/server/crypto";

test("TOTP matches the RFC 6238 test vectors (SHA-1, 8 digits)",()=>{
  const uri="otpauth://totp/x?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&digits=8&period=30";
  for(const [t,code] of [[59,"94287082"],[1111111109,"07081804"],[1234567890,"89005924"],[2000000000,"69279037"]] as const)
    assert.equal(totpNow(uri,t*1000).code,code);
});
test("TOTP rejects a 6-digit code, short secrets and non-TOTP URIs",()=>{
  for(const bad of ["123456","ABC","otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP","otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&period=1"]) assert.throws(()=>parseTotp(bad));
  assert.equal(totpNow("JBSWY3DPEHPK3PXP").code.length,6);
});
test("encryption round-trips and is bound to the tool id",()=>{
  process.env.CREDENTIALS_KEY=randomBytes(32).toString("base64");
  const box=seal(JSON.stringify({password:"geheim"}),"tool-a");
  assert.ok(!box.includes("geheim"));
  assert.equal(JSON.parse(unseal(box,"tool-a")).password,"geheim");
  assert.throws(()=>unseal(box,"tool-b"));
  assert.notEqual(seal("x","t"),seal("x","t"),"fresh IV every time");
});
test("encryption fails closed without a valid key",()=>{
  delete process.env.CREDENTIALS_KEY; assert.throws(()=>seal("x","t"));
  process.env.CREDENTIALS_KEY=Buffer.alloc(16).toString("base64"); assert.throws(()=>seal("x","t"));
});
