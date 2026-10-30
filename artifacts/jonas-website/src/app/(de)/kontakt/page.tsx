import { ContactView, contactMeta } from "@/views/contact";
export const metadata = contactMeta("de");
export default function Kontakt() { return <ContactView lang="de" />; }
