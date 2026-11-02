import {test} from "node:test";
import assert from "node:assert/strict";
import {inviteMail,newToolMail,sendBatch} from "../artifacts/private-dashboard/src/server/mail";

const tool={name:"Cursor",provider:"Anysphere",description:"KI-Code-Editor\nmit Agent",category:"Entwicklung",access_type:"permitted_shared" as const,plan:"Pro",price:"20 $ pro Monat"};

test("new-tool mail greets by first name and signs as Jonas",()=>{
  const m=newToolMail("Vincent",tool,"https://example.test/tools?tool=1");
  assert.match(m.text,/^Hi Vincent,/);
  assert.match(m.text,/Viel Spaß damit!\nDein Jonas$/);
  assert.match(m.html,/Hi Vincent,/);
  assert.match(m.html,/Dein Jonas/);
  assert.match(m.subject,/Cursor/);
  assert.ok(!m.html.includes("Förster"),"no last name");
});
test("new-tool mail never contains login data and escapes HTML",()=>{
  const m=newToolMail("<b>Eve</b>",{...tool,name:"X<script>"},"https://example.test/");
  assert.ok(!m.html.includes("<script>"));
  assert.ok(!m.html.includes("<b>Eve</b>"));
  assert.match(m.html,/nie in einer Mail/);
  assert.match(m.html,/KI-Code-Editor<br>mit Agent/);
});
test("invitation mail uses only the first name",()=>{
  const m=inviteMail("Vincent","https://example.test/invite#token=abc",48);
  assert.match(m.text,/^Hi Vincent,/);
  assert.match(m.html,/Hi Vincent,/);
  assert.match(m.text,/48 Stunden/);
});
test("sending is a no-op without configuration",async()=>{
  delete process.env.RESEND_API_KEY;
  assert.deepEqual(await sendBatch([{to:"a@example.test",mail:inviteMail("A","https://x.test",1)}]),[false]);
});
