"""Build the standalone, offline, American English edition."""
from pathlib import Path
base = Path(__file__).resolve().parent.parent
source_dir = base / 'standalone'
source = (source_dir / 'legacy_base.html').read_text(encoding='utf-8')
css = (source_dir / 'offline-enhancement.css').read_text(encoding='utf-8')
js = (source_dir / 'offline-enhancement.js').read_text(encoding='utf-8')
assert source.count('</style>') == 1 and source.count('</script>') == 1
assert '<html lang="pt-BR">' in source
updated = source.replace('<html lang="pt-BR">', '<html lang="en-US">', 1)
# The legacy range-input handler calls n(); use en-US formatting for dynamic values.
old_format = "const n=value=>Math.round(value).toLocaleString('pt-BR');"
assert old_format in updated
updated = updated.replace(old_format, "const n=value=>Math.round(value).toLocaleString('en-US');", 1)
# Replace labels baked into the static spacecraft illustration behind the UI.
for old, new in [
    ('> LUA <span>384.400 km*</span>', '> MOON <span>384,400 km*</span>'),
    ('> TERRA <span>BASE DE RETORNO</span>', '> EARTH <span>RETURN DESTINATION</span>'),
    ('* Distância média Terra–Lua · visualização fora de escala',
     '* Average Earth–Moon distance · illustration not to scale'),
    ('artemis-ii-nicolas-relatorio.json','artemis-ii-nicolas-mission-report.json')
]:
    updated = updated.replace(old, new)

updated = updated.replace('content="Protótipo offline da Parte 1 de Nicolas: ARTEMIS II: Lunar Odyssey — briefing, checklist e relatório final."',
    'content="Nicolas’s Artemis II: Lunar Odyssey educational game: interactive mission briefing, sequential launch diagnostics, narrated countdown, and final debriefing."', 1)
# The legacy direct-launch handler is intentionally disabled; the enhanced flow exclusively
# authorizes launches after a completed scan and a full terminal countdown.
legacy = "else if(action==='launch'){if(!checklist().approved)return;state.flight=startFlight();goto('flight');}"
assert legacy in updated
updated = updated.replace(legacy, "else if(action==='launch'){return;}", 1)
updated = updated.replace('</style>', '\n/* Standalone enhancement: English edition */\n' + css + '\n</style>', 1)
updated = updated.replace('</script>', '\n/* Standalone enhancement: English edition */\n' + js + '\n</script>', 1)
output = base / 'index.html'
output.write_text(updated, encoding='utf-8')
# The output is written directly to the project root.
print(output, len(updated), 'characters')
print('Base images preserved:', updated.count('data:image'))
print('External scripts:', updated.count('src="http'))
