<p align="center">
  <img src="web/src/assets/about/reading-space-logo.svg" width="112" alt="Logotipo de Reading Space">
</p>

<h1 align="center">Reading Space MN</h1>

<p align="center">
  <strong>Mantén las explicaciones, las preguntas, la lectura en voz alta y la investigación dentro de tu flujo de lectura en MarginNote.</strong>
</p>

<p align="center">
  Reading Space MN es un complemento de flujo de lectura para MarginNote 4. Sitúa las herramientas de IA, el navegador integrado, la lectura de audio y la conexión con Obsidian junto a selecciones, extractos y tarjetas del mapa mental.
</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.ru.md">Русский</a> ·
  <strong>Español</strong> ·
  <a href="README.ko.md">한국어</a>
</p>

---

## El siguiente paso, junto al contenido que estás leyendo

Al leer un PDF, una página web o una nota, a menudo necesitas explicar un concepto, hacer una pregunta de seguimiento, escuchar un extracto o comprobar una fuente. Reading Space MN reúne esas acciones en un único flujo y reduce los cambios entre el lector, el navegador, las herramientas de IA y la aplicación de notas.

No sustituye a MarginNote: añade formas concretas de investigar, comprender, escuchar y conservar el material que ya tienes delante.

## Casos de uso

- Explicar, buscar, traducir o ampliar el texto seleccionado.
- Leer en voz alta y comentar extractos o tarjetas, y crear tarjetas relacionadas.
- Investigar y verificar información en el navegador integrado sin salir del flujo de lectura.
- Enviar extractos o tarjetas útiles a un almacén local de Obsidian ReadingSpace.
- Exportar, importar o sincronizar manualmente ajustes seleccionados dentro de límites explícitos.

## Funciones principales

| Función | Qué hace |
| --- | --- |
| **Barra de selección y tarjetas** | Añade lectura, explicación, preguntas a la IA, comentarios y creación de tarjetas hijas o hermanas junto al contenido. |
| **Explicación rápida y búsqueda con IA** | Genera explicaciones breves y ofrece diccionario, traducción y preguntas de seguimiento. |
| **Preguntas y respuestas con IA** | Abre un panel independiente con tu proveedor, modelo, Endpoint y prompts. |
| **Navegador integrado** | Mantiene la investigación web dentro de la lectura y gestiona inicio, marcadores, historial y pestaña actual. |
| **Lectura de audio** | Genera audio mediante un servicio TTS configurado o un puente local de Obsidian y lo envía a un reproductor independiente. |
| **Envío a Obsidian** | Envía el extracto o la tarjeta actual a una carpeta elegida de Obsidian ReadingSpace local. |
| **Ajustes y sincronización manual** | Gestiona apariencia, IA, navegador, audio y exportación, con carga o importación manual de los datos iCloud seleccionados. |

## Flujo habitual

1. Selecciona texto, un extracto o una tarjeta del mapa mental en MarginNote.
2. Elige lectura, explicación, búsqueda, preguntas a la IA o una acción de tarjeta en la barra Reading Space.
3. Revisa el resultado en el panel o reproductor independiente y continúa la conversación si lo necesitas.
4. Envía el material útil a Obsidian local o procesa manualmente los datos seleccionados desde Ajustes.

## Estado actual

La instantánea pública actual corresponde a la versión **0.1.5** y requiere **MarginNote 4.2.3 o posterior**.

> [!IMPORTANT]
> El paquete `.mnaddon` validado de la versión `0.1.5` está disponible en [Reading Space MN v0.1.5 en GitHub Releases](https://github.com/Awaker-OTE/readingspace-mn/releases/tag/v0.1.5). Los archivos compilados desde el código siguen destinados al desarrollo y la verificación local y no sustituyen al paquete validado adjunto a la Release.

Límites importantes:

- Las funciones de IA y TTS requieren tu propio proveedor, Endpoint, API Key u otros datos de conexión. No se incluyen credenciales de terceros.
- La sincronización automática es experimental y está pausada. Guardar ajustes no los sube automáticamente; siguen disponibles la carga y la importación manual de iCloud.
- Las cookies y el estado de inicio de sesión del navegador permanecen en el dispositivo y no se incluyen en la exportación de ajustes ni en iCloud.
- El puente local de Obsidian está pensado principalmente para escritorio y no está disponible en iPad.
- El comportamiento puede variar según la versión de MarginNote, el dispositivo y la red.

## Verificar y compilar desde el código fuente

Para ejecutar el complemento necesitas MarginNote 4.2.3 o posterior. La compilación pública también requiere Node.js 22.12 o posterior, pnpm 10 o posterior y el comando `zip` del sistema.

```bash
git clone https://github.com/Awaker-OTE/readingspace-mn.git
cd readingspace-mn
pnpm install --frozen-lockfile
pnpm verify
pnpm build
```

`pnpm verify` comprueba el límite público, el recibo de la instantánea y los contratos funcionales. `pnpm build` escribe archivos `.mnaddon` con nombre fijo y con marca de tiempo en `artifacts/`, sin instalar el complemento, reiniciar MarginNote, escribir en el Escritorio ni llamar a servicios internos de publicación.

La compilación pública sirve para reproducibilidad y pruebas de regresión; no sustituye a un artefacto formal de publicación ya validado.

## Procedencia verificable del código

Este repositorio es un espejo público gestionado. El código del producto se exporta desde un único commit Git interno completo. `PUBLIC_SOURCE.json` registra el commit, la versión, los archivos gestionados y el SHA-256 de cada archivo.

```bash
pnpm verify:source-snapshot
```

Los archivos de `src/`, `web/` y los scripts de contrato gestionados no se desarrollan de forma independiente en este espejo. El README, la CI, la política de seguridad y la envoltura de compilación sin efectos locales, propios del repositorio público, pueden mantenerse por separado sin cambiar el comportamiento del producto en ejecución.

## Privacidad y límites de datos

- El repositorio no contiene API Key de usuarios, Bridge token, cookies del navegador, historial de chat ni otros datos de usuario.
- El estado de inicio de sesión del navegador es local y se excluye de la exportación de ajustes e iCloud.
- Las categorías sensibles de sincronización deben seleccionarse explícitamente y tratarse de forma manual.
- No publiques secretos, tokens, cookies, documentos privados ni datos reales de usuarios en Issues, registros o capturas.
- Informa de problemas de seguridad según [SECURITY.md](SECURITY.md), sin revelar públicamente detalles ni pruebas sin ocultar.

## Licencia e independencia

El código se hace público únicamente para consulta y auditoría de seguridad; **no es software de código abierto**. Salvo cuando la legislación aplicable o las Condiciones del servicio de GitHub lo permitan expresamente, no se concede permiso para copiar, modificar, distribuir, sublicenciar, vender ni crear obras derivadas. Consulta [LICENSE](LICENSE).

Reading Space MN ha sido diseñado e implementado de forma independiente. No es un producto oficial de MarginNote, OpenAI, ChatGPT, Obsidian ni de otro servicio externo, y no implica respaldo, asociación ni compromiso de compatibilidad. Los nombres y marcas de terceros pertenecen a sus respectivos propietarios.
