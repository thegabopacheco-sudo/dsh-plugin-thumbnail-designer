# Cómo funciona dsh-plugin-thumbnail-designer

Disena miniaturas SVG para videos/posts: titulo, subtitulo, badge, gradiente y color de acento, con vista previa y guardado confirmado.

## Arquitectura

```
DSH ──MCP stdio──► server.mjs (bundle single-file)
                    └─ lógica local del plugin
```

## Herramientas reales

- `status`: Estado
- `preview`: Previsualizar miniatura
- `save`: Guardar miniatura

## Seguridad

- Lectura por defecto; acciones con `confirm:true`.
- Modo `read-only` por variable de entorno.
- Listas blancas cuando aplique.
- Auditoría en `<DSH_HOME>\cache\thumbnail-designer\audit.jsonl`.
- Rate limit de acciones.

## Verificación

Tests end-to-end con el cliente MCP oficial (`@modelcontextprotocol/client@2.2.0`)
y artefacto empaquetado (`npm pack` → `postinstall` → servidor desplegado).
