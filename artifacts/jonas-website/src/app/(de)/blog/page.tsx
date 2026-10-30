import { BlogView, blogMeta } from "@/views/blog";
export const metadata = blogMeta("de");
export default function Blog() { return <BlogView lang="de" />; }
