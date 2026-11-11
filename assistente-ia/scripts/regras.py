"""Regras de negócio (regras/regras-negocio.json).

python -m scripts.regras check     # valida o arquivo (o CI roda isto); erro = lista do campo e do motivo
python -m scripts.regras schema    # regera regras/regras-negocio.schema.json depois de mudar app/rules.py
"""

import json
import sys

from pydantic import ValidationError

from app.rules import DEFAULT_PATH, BusinessRules, load_rules

SCHEMA_PATH = DEFAULT_PATH.with_name("regras-negocio.schema.json")


def schema_text() -> str:
    schema = BusinessRules.model_json_schema(by_alias=True)
    schema["title"] = "Regras de negócio do SAFEpass"
    return json.dumps(schema, ensure_ascii=False, indent=2) + "\n"


def check() -> None:
    try:
        rules = load_rules(DEFAULT_PATH)
    except ValidationError as exc:
        print(f"{DEFAULT_PATH.name}: {exc.error_count()} problema(s)")
        for err in exc.errors():
            campo = ".".join(str(p) for p in err["loc"]) or "(arquivo)"
            print(f"  - {campo}: {err['msg']}")
        sys.exit(1)
    except ValueError as exc:
        sys.exit(str(exc))
    print(f"{DEFAULT_PATH.name}: ok. Atendimento humano: {rules.horario_atendimento()}.")


def main(command: str) -> None:
    if command == "check":
        check()
    elif command == "schema":
        SCHEMA_PATH.write_text(schema_text(), encoding="utf-8")
        print(f"schema gravado em {SCHEMA_PATH}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
