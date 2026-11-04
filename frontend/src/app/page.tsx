import { redirect } from "next/navigation";

// Sem login (Desafio 01) ainda, a raiz leva direto à área do prestador.
export default function Home() {
  redirect("/prestador");
}
