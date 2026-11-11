import styles from "./assistant.module.css";

type ClassName = string | false | null | undefined;

/**
 * Classes do CSS Module pelo nome usado no CSS: `cx("icon-btn", "header-btn", open && "is-open")`.
 * Nome inexistente quebra em desenvolvimento, para um erro de digitação não virar estilo sumido.
 */
export function cx(...names: ClassName[]): string {
  return names
    .filter((name): name is string => Boolean(name))
    .map((name) => {
      const local = styles[name];
      if (!local && process.env.NODE_ENV !== "production") {
        throw new Error(`Classe "${name}" não existe em assistant.module.css`);
      }
      return local ?? "";
    })
    .join(" ");
}
