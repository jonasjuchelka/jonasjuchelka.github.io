import { ImprintView, imprintMeta } from "@/views/legal";
export const metadata = imprintMeta("de");
export default function Impressum() { return <ImprintView lang="de" />; }
