"""
Genera las versiones de OpenCode y Antigravity de todos los agentes.

Fuente (lo único que se edita a mano):
    comun/agents/*.md
    proyectos/<proyecto>/agents/*.md

Salida (generada, no editar):
    <ámbito>/generado/opencode/*.md
    <ámbito>/generado/antigravity/*.md

Uso, desde la raíz de Agentes-Skills-work:
    python herramientas/sync-agents.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMUN = ROOT / "comun"


def scopes():
    yield COMUN
    proyectos = ROOT / "proyectos"
    if proyectos.exists():
        yield from sorted(p for p in proyectos.iterdir() if p.is_dir())


def skills_list(fm):
    """Acepta 'skills: a, b' (en línea) o la forma de lista con guiones."""
    inline = re.search(r"^skills:[ \t]*(\S.*)$", fm, re.M)
    if inline:
        return [x.strip() for x in inline.group(1).strip("[]").split(",") if x.strip()]
    block = re.search(r"^skills:[ \t]*\n((?:[ \t]+-.*\n?)+)", fm, re.M)
    return re.findall(r"-\s*(.+)", block.group(1)) if block else []


def parse(path):
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    if not m:
        raise ValueError(f"{path} no tiene encabezado YAML (--- ... ---)")
    fm, body = m.groups()

    def field(name, default=""):
        f = re.search(rf"^{name}:\s*(.*)$", fm, re.M)
        return f.group(1).strip() if f else default

    return {
        "name": path.stem,
        "description": field("description"),
        "tools": [t.strip() for t in field("tools").split(",") if t.strip()],
        "skills": skills_list(fm),
        "body": body.strip(),
    }


def skill_path(scope, skill):
    """Ruta que el agente debe leer, según dónde vive la skill."""
    if scope != COMUN and (scope / "skills" / skill).exists():
        return f".claude/skills/{skill}/SKILL.md"          # skill del proyecto
    if (COMUN / "skills" / skill).exists():
        return f"~/.claude/skills/{skill}/SKILL.md"        # skill común (global)
    print(f"  [aviso] la skill '{skill}' no existe en {scope.name} ni en comun")
    return f".claude/skills/{skill}/SKILL.md"


def skills_block(scope, a):
    if not a["skills"]:
        return ""
    lines = ["Antes de empezar, lee y sigue estas skills:"]
    lines += [f"- `{skill_path(scope, s)}`" for s in a["skills"]]
    return "\n".join(lines) + "\n"


def to_opencode(scope, a):
    t = a["tools"]
    return "\n".join([
        "---",
        f"description: {a['description']}",
        "mode: subagent",
        "tools:",
        f"  write: {'true' if 'Write' in t else 'false'}",
        f"  edit: {'true' if ('Edit' in t or 'Write' in t) else 'false'}",
        f"  bash: {'true' if 'Bash' in t else 'false'}",
        "---",
        "",
        skills_block(scope, a),
        a["body"],
        "",
    ])


def to_antigravity(scope, a):
    t = a["tools"]
    perms = ("Puedes escribir solo donde estas instrucciones lo indican."
             if ("Write" in t or "Edit" in t)
             else "Modo solo lectura: no crees, edites ni borres archivos.")
    return "\n".join([
        "---",
        f"description: {a['description']}",
        "---",
        "",
        f"# /{a['name']}",
        "",
        perms,
        "",
        skills_block(scope, a),
        a["body"],
        "",
    ])


def main():
    total = 0
    for scope in scopes():
        src = scope / "agents"
        oc = scope / "generado" / "opencode"
        ag = scope / "generado" / "antigravity"
        oc.mkdir(parents=True, exist_ok=True)
        ag.mkdir(parents=True, exist_ok=True)
        # Limpia lo generado antes, para que un agente borrado no quede huérfano.
        for old in list(oc.glob("*.md")) + list(ag.glob("*.md")):
            old.unlink()
        agents = sorted(src.glob("*.md")) if src.exists() else []
        print(f"{scope.relative_to(ROOT)}: {len(agents)} agente(s)")
        for f in agents:
            a = parse(f)
            (oc / f.name).write_text(to_opencode(scope, a), encoding="utf-8")
            (ag / f.name).write_text(to_antigravity(scope, a), encoding="utf-8")
            print(f"  ok  {f.name}")
            total += 1
    print(f"\nListo: {total} agente(s) generados para OpenCode y Antigravity.")


if __name__ == "__main__":
    try:
        main()
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
