import { redirect } from "next/navigation";
export default function Scenes() {
  redirect("/adventure?places=1");
}
