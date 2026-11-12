# dsh-plugin-thumbnail-designer — Thumbnail Designer

Disena miniaturas SVG para videos/posts: titulo, subtitulo, badge, gradiente y color de acento, con vista previa y guardado confirmado.

## Herramientas

| Tool | Qué hace |
|---|---|
| `status` | Estado |
| `preview` | Previsualizar miniatura |
| `save` | Guardar miniatura |

## Instalación

Desde **DSH → Settings → Plugins** instala `github:thegabopacheco-sudo/dsh-plugin-thumbnail-designer` y permite el script de instalación.

```
dsh plugin --profile <perfil> add github:thegabopacheco-sudo/dsh-plugin-thumbnail-designer
```

## Seguridad

- Lectura por defecto; escritura solo con `confirm:true` y pedido explícito.
- `DSH_THUMBNAIL_DESIGNER_MODE=read-only` desactiva acciones.
- Listas blancas y auditoría en `<DSH_HOME>\cache\thumbnail-designer\audit.jsonl`.

## Licencia

MIT © thegabopacheco-sudo
